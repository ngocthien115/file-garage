const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const loadModule = require("./helpers/load.cjs");

const src = (name) => path.join(__dirname, "../src", name);
const stateModule = loadModule(src("hooks/fileListState.ts"));
const selected = { name: "report.pdf", uri: "content://documents/document/msf%3A42" };
const saved = { fileName: selected.name, url: "https://temp.sh/abc/report.pdf" };
const flush = () => new Promise((resolve) => setImmediate(resolve));

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

// Run the real hook, reducer and upload API with controllable network boundaries.
// State setters run the reducer synchronously, as React queues the same actions.
async function setup() {
  let state;
  const refs = [];
  let cursor = 0;
  const loads = [], uploads = [], posts = [], effects = [];
  const react = {
    useReducer(reducer, initial) {
      state ??= initial;
      return [state, (action) => { state = reducer(state, action); }];
    },
    useRef(value) {
      const index = cursor++;
      refs[index] ??= { current: value };
      return refs[index];
    },
    useCallback: (callback) => callback,
    useEffect: (effect) => effects.push(effect),
  };
  const client = {
    defaults: { baseURL: "https://file.lamino.top/" },
    get(url, options) {
      const request = { ...deferred(), baseURL: options.baseURL };
      loads.push(request);
      return request.promise.then((data) => ({ data }));
    },
    post(url, body, options) {
      const request = { ...deferred(), url, body, baseURL: options.baseURL };
      posts.push(request);
      return request.promise;
    },
  };
  const api = loadModule(src("api/fileApi.ts"), {
    "./client": { __esModule: true, default: client, clientReady: Promise.resolve() },
    "./storageApi": {
      uploadToStorage(file) {
        const request = { ...deferred(), file };
        uploads.push(request);
        return request.promise;
      },
    },
  });
  const { useFiles } = loadModule(src("hooks/useFiles.ts"), {
    react,
    "../api/fileApi": api,
    "./fileListState": stateModule,
  });
  let hook = useFiles(client.defaults.baseURL);
  let cleanup = effects[0]();
  await flush();
  return {
    startUpload: (...args) => hook.startUpload(...args),
    retryUpload: (...args) => hook.retryUpload(...args),
    loadFiles: () => hook.loadFiles(),
    get state() { return state; }, loads, uploads, posts,
    cleanup: () => cleanup(),
    async switchServer(baseURL) {
      cleanup();
      effects.length = 0;
      cursor = 0;
      hook = useFiles(baseURL);
      cleanup = effects[0]();
      await flush();
    },
  };
}

test("new row appears immediately and stays locked through both requests", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  const id = app.state.files[0].id;
  assert.equal(app.state.files[0].status, "uploading");
  assert.equal(app.state.files[0].url, undefined);
  assert.equal(app.posts.length, 0);

  // The initial list request must not hide the optimistic row.
  app.loads[0].resolve([]);
  await flush();
  assert.equal(app.state.files[0].id, id);

  app.uploads[0].resolve(saved.url);
  await flush();
  assert.equal(app.state.files[0].status, "saving");
  assert.equal(app.state.files[0].id, id);
  assert.equal(app.posts[0].body.url, saved.url);

  app.posts[0].resolve();
  assert.equal(await pending, true);
  assert.equal(app.state.files[0].status, "ready");
  assert.equal(app.state.files[0].url, saved.url);
  assert.equal(app.state.files[0].id, id);
  // Opening is possible without issuing another GET.
  assert.equal(app.loads.length, 1);
});

test("metadata retry reuses the URL and guards repeated retry taps", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  app.uploads[0].resolve(saved.url);
  await flush();
  app.posts[0].reject(new Error("Server unavailable"));
  assert.equal(await pending, false);
  const row = app.state.files[0];
  assert.equal(row.status, "error");
  assert.equal(row.error, "Server unavailable");

  const retry = app.retryUpload(row.id);
  assert.equal(app.state.files[0].status, "saving");
  assert.equal(app.state.files[0].error, undefined);
  assert.equal(await app.retryUpload(row.id), undefined);
  await flush();
  assert.equal(app.uploads.length, 1);
  assert.equal(app.posts.length, 2);
  app.posts[1].resolve();
  assert.equal(await retry, true);
  assert.equal(app.state.files[0].status, "ready");
});

test("storage failure retries storage on the same row", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  app.uploads[0].reject(new Error("Offline"));
  assert.equal(await pending, false);
  assert.equal(app.posts.length, 0);
  const id = app.state.files[0].id;
  const retry = app.retryUpload(id);
  assert.equal(app.state.files.length, 1);
  assert.equal(app.state.files[0].status, "uploading");
  await flush();
  app.uploads[1].resolve(saved.url);
  await flush();
  app.posts[0].resolve();
  assert.equal(await retry, true);
  assert.equal(app.state.files[0].id, id);
});

test("same-name concurrent uploads complete independently", async () => {
  const app = await setup();
  const first = app.startUpload(selected);
  const second = app.startUpload({ ...selected, uri: "content://documents/another" });
  const [secondId, firstId] = app.state.files.map((row) => row.id);
  assert.notEqual(firstId, secondId);
  await flush();
  app.uploads[1].resolve("https://temp.sh/second/report.pdf");
  await flush();
  app.posts[0].resolve();
  await second;
  assert.equal(app.state.files[0].status, "ready");
  assert.equal(app.state.files[1].status, "uploading");
  app.uploads[0].reject(new Error("Offline"));
  await first;
  assert.equal(app.state.files[0].status, "ready");
  assert.equal(app.state.files[1].status, "error");
});

test("refresh deduplicates rows without unlocking an unfinished POST", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  app.uploads[0].resolve(saved.url);
  await flush();
  const id = app.state.files[0].id;
  app.loads[0].resolve([saved]);
  await flush();
  assert.equal(app.state.files.length, 1);
  assert.equal(app.state.files[0].status, "saving");
  app.posts[0].resolve();
  await pending;

  const refresh = app.loadFiles();
  await flush();
  app.loads[1].resolve([saved]);
  await refresh;
  assert.equal(app.state.files.length, 1);
  assert.equal(app.state.files[0].id, id);
  assert.equal(app.state.files[0].local, false);

  // Confirmed records can subsequently expire on the server.
  const afterExpiry = app.loadFiles();
  await flush();
  app.loads[2].resolve([]);
  await afterExpiry;
  assert.equal(app.state.files.length, 0);
});

test("stale or failed refreshes cannot remove local rows or overwrite a newer list", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  app.uploads[0].resolve(saved.url);
  await flush();
  app.posts[0].resolve();
  await pending;

  const refresh = app.loadFiles();
  await flush();
  app.loads[1].resolve([saved, { fileName: "other.txt", url: "https://temp.sh/other" }]);
  await refresh;
  app.loads[0].resolve([]);
  await flush();
  assert.equal(app.state.files.length, 2);

  const failed = app.loadFiles();
  await flush();
  app.loads[2].reject(new Error("Offline"));
  await failed;
  assert.equal(app.state.files.length, 2);
  assert.equal(app.state.error, "Offline");
});

test("upload errors remain visible when the initial list request fails", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  app.loads[0].reject(new Error("List unavailable"));
  app.uploads[0].reject(new Error("Storage unavailable"));
  await pending;
  await flush();
  assert.equal(app.state.files.length, 1);
  assert.equal(app.state.files[0].status, "error");
  assert.equal(app.state.error, "List unavailable");
});

test("an older list snapshot cannot remove a just-completed upload", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  app.uploads[0].resolve(saved.url);
  await flush();
  app.posts[0].resolve();
  await pending;
  app.loads[0].resolve([]);
  await flush();
  assert.equal(app.state.files.length, 1);
  assert.equal(app.state.files[0].status, "ready");
});

test("late responses after unmount do not update the list", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  app.cleanup();
  const before = app.state;
  app.loads[0].resolve([saved]);
  app.uploads[0].resolve(saved.url);
  await flush();
  app.posts[0].resolve();
  await pending;
  assert.equal(app.state, before);
});

test("duplicate server records retain unique stable row keys", () => {
  const { fileListReducer: reduce, initialFileListState: initial } = stateModule;
  let state = reduce(initial, { type: "load-success", files: [saved, saved] });
  const ids = state.files.map((row) => row.id);
  state = reduce(state, { type: "add", file: { ...saved, id: "upload:1", status: "ready", local: true } });
  state = reduce(state, { type: "load-success", files: [saved, saved, saved, saved] });
  assert.equal(state.files.length, 4);
  assert.equal(new Set(state.files.map((row) => row.id)).size, 4);
  assert.ok(ids.every((id) => state.files.some((row) => row.id === id)));
});

test("switching servers clears the previous list and ignores its delayed response", async () => {
  const app = await setup();
  const newURL = "https://another.example.com/";
  await app.switchServer(newURL);
  assert.equal(app.state.files.length, 0);
  assert.equal(app.state.loading, true);
  assert.equal(app.loads[1].baseURL, newURL);
  app.loads[1].resolve([{ fileName: "new.txt", url: "https://temp.sh/new.txt" }]);
  await flush();
  app.loads[0].resolve([saved]);
  await flush();
  assert.equal(app.state.files.length, 1);
  assert.equal(app.state.files[0].fileName, "new.txt");
});

test("uploads started before a server change cannot add rows to the new server", async () => {
  const app = await setup();
  const pending = app.startUpload(selected);
  await flush();
  await app.switchServer("https://another.example.com/");
  app.uploads[0].resolve(saved.url);
  await flush();
  assert.equal(app.posts[0].baseURL, "https://file.lamino.top/");
  app.posts[0].resolve();
  await pending;
  assert.equal(app.state.files.length, 0);
});
