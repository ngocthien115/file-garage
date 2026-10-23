const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const loadModule = require("./helpers/load.cjs");

const src = (name) => path.join(__dirname, "../src/api", name);
const flush = () => new Promise((resolve) => setImmediate(resolve));
const asDefault = (value) => ({ __esModule: true, default: value });

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function setup(storage = { getItem: async () => null, setItem: async () => {} }) {
  const settings = loadModule(src("serverSettings.ts"), {
    "@react-native-async-storage/async-storage": asDefault(storage),
  });
  const requests = [];
  const client = loadModule(src("client.ts"), {
    "./serverSettings": settings,
    axios: asDefault({
      create(options) {
        return {
          defaults: { ...options },
          async get(url, config) { requests.push({ method: "GET", url, ...config }); return { data: [] }; },
          async post(url, body, config) { requests.push({ method: "POST", url, body, ...config }); },
        };
      },
    }),
  });
  const storageUpload = deferred();
  const api = loadModule(src("fileApi.ts"), {
    "./client": client,
    "./storageApi": { uploadToStorage: () => storageUpload.promise },
  });
  return { settings, client, api, requests, storageUpload };
}

test("first API request waits for the persisted server URL", async () => {
  const stored = deferred();
  let reads = 0;
  const app = setup({ getItem() { reads++; return stored.promise; }, setItem: async () => {} });
  const list = app.api.getListFiles();
  assert.equal(app.requests.length, 0);
  stored.resolve(JSON.stringify({ baseURL: "http://192.168.1.20:8080" }));
  await list;
  assert.equal(reads, 1);
  assert.equal(app.requests[0].baseURL, "http://192.168.1.20:8080/");
  assert.equal(app.settings.getServerSettings().ready, true);
});

test("saving updates future requests, history, and the next app session", async () => {
  let stored = null;
  const storage = { getItem: async () => stored, setItem: async (_, value) => { stored = value; } };
  const app = setup(storage);
  await app.client.clientReady;
  await app.settings.saveServerBaseURL("  http://100.100.100.100:9090///  ");
  await app.api.getListFiles();
  assert.equal(app.requests[0].baseURL, "http://100.100.100.100:9090/");
  assert.equal(app.client.default.defaults.baseURL, "http://100.100.100.100:9090/");
  assert.equal(app.settings.getServerSettings().recentURLs[0], "http://100.100.100.100:9090/");
  const reopened = setup(storage);
  await reopened.client.clientReady;
  assert.equal(reopened.settings.getServerSettings().baseURL, "http://100.100.100.100:9090/");
});

test("saving during initialization cannot be overwritten by restored settings", async () => {
  const stored = deferred();
  const app = setup({ getItem: () => stored.promise, setItem: async () => {} });
  const save = app.settings.saveServerBaseURL("https://new.example.com/");
  stored.resolve(JSON.stringify({ baseURL: "https://previous.example.com/" }));
  await save;
  assert.equal(app.settings.getServerSettings().baseURL, "https://new.example.com/");
});

test("an upload retains its original server while storage is uploading", async () => {
  const app = setup();
  await app.client.clientReady;
  const original = app.client.default.defaults.baseURL;
  const pending = app.api.uploadFile({ name: "report.pdf", uri: "content://documents/42" });
  await flush();
  await app.settings.saveServerBaseURL("https://another.example.com/");
  app.storageUpload.resolve("https://temp.sh/report.pdf");
  await pending;
  assert.equal(app.requests[0].baseURL, original);
  await app.api.getListFiles();
  assert.equal(app.requests[1].baseURL, "https://another.example.com/");
});

test("explicit list and metadata retry URLs retain the selected server", async () => {
  const app = setup();
  await app.client.clientReady;
  await app.api.getListFiles("https://selected.example.com/");
  await app.api.uploadFile({ name: "report.pdf" }, {
    storedUrl: "https://temp.sh/report.pdf", baseURL: "https://selected.example.com/",
  });
  assert.ok(app.requests.every((request) => request.baseURL === "https://selected.example.com/"));
});

test("failed persistence leaves the active server unchanged and reports an error", async () => {
  const app = setup({ getItem: async () => null, setItem: async () => { throw new Error("Disk full"); } });
  await app.client.clientReady;
  const previous = app.settings.getServerSettings();
  await assert.rejects(app.settings.saveServerBaseURL("https://new.example.com"), /Could not save/);
  assert.equal(app.settings.getServerSettings(), previous);
  assert.equal(app.client.default.defaults.baseURL, previous.baseURL);
});

for (const stored of ["not json", JSON.stringify({ baseURL: "file:///cache" })]) {
  test(`invalid persisted settings fall back to the default: ${stored}`, async () => {
    const app = setup({ getItem: async () => stored, setItem: async () => {} });
    await app.client.clientReady;
    assert.equal(app.settings.getServerSettings().baseURL, app.settings.DEFAULT_BASE_URL);
    assert.equal(app.settings.getServerSettings().ready, true);
  });
}

test("history is normalized, deduplicated, and bounded", async () => {
  const app = setup();
  await app.client.clientReady;
  for (let i = 0; i < 8; i++) await app.settings.saveServerBaseURL(`https://server${i}.example.com`);
  await app.settings.saveServerBaseURL("https://server7.example.com///");
  const history = app.settings.getServerSettings().recentURLs;
  assert.equal(history.length, 6);
  assert.equal(new Set(history).size, 6);
  assert.equal(history[0], "https://server7.example.com/");
});

test("settings subscribers receive changes and can unsubscribe", async () => {
  const app = setup();
  await app.client.clientReady;
  let changes = 0;
  const unsubscribe = app.settings.subscribeServerSettings(() => { changes++; });
  await app.settings.saveServerBaseURL("https://one.example.com");
  unsubscribe();
  await app.settings.saveServerBaseURL("https://two.example.com");
  assert.equal(changes, 1);
});

test("HTTP, HTTPS, IPv6 and reverse-proxy base paths are supported", () => {
  const { normalizeBaseURL } = setup().settings;
  assert.equal(normalizeBaseURL("http://localhost:8080"), "http://localhost:8080/");
  assert.equal(normalizeBaseURL("https://example.com/garage///"), "https://example.com/garage/");
  assert.equal(normalizeBaseURL("http://[::1]:8080"), "http://[::1]:8080/");
});

test("malformed URLs cannot update the active server", async () => {
  const app = setup();
  await app.client.clientReady;
  const previous = app.settings.getServerSettings();
  for (const value of ["", "192.168.1.19:8080", "ftp://example.com", "https://a b.com", "https://user:secret@example.com", "https://example.com?a=1", "https://example.com/#fragment"]) {
    await assert.rejects(app.settings.saveServerBaseURL(value), /valid http/);
    assert.equal(app.settings.getServerSettings(), previous);
  }
});
