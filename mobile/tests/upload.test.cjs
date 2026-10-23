const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const loadModule = require("./helpers/load.cjs");

const selectedFile = {
  name: "report.pdf",
  uri: "file:///cache/report.pdf",
  mimeType: "application/pdf",
};
const storageUrl = "https://temp.sh/abc/report.pdf";

// Match React Native's Blob constructor limitation instead of Node's Blob support.
class NativeBlob extends Blob {
  constructor(parts = [], options) {
    if (parts.some((part) => part instanceof ArrayBuffer || ArrayBuffer.isView(part))) {
      throw new Error("Creating blobs from 'ArrayBuffer' and 'ArrayBufferView' are not supported");
    }
    super(parts, options);
  }
}

// Exercise Expo's actual multipart implementation so URI-only parts cannot pass.
const { installFormDataPatch } = loadModule(
  require.resolve("expo/src/winter/FormData"), {},
);
const { convertFormDataAsync } = loadModule(
  require.resolve("expo/src/winter/fetch/convertFormData"),
  { "../../utils/blobUtils": { blobToArrayBufferAsync: (blob) => blob.arrayBuffer() } },
);

// Load the API modules with device/network boundaries replaced, without an RN runtime.
function setup({ platform = "android", storageResponse, apiError, readError, expectedUri = selectedFile.uri, fileBytes = new TextEncoder().encode("report content") } = {}) {
  const requests = [];
  class NativeFormData {
    _parts = [];
  }
  const ExpoFormData = installFormDataPatch(NativeFormData);
  class NativeFile {
    constructor(uri) {
      assert.equal(uri, expectedUri);
      assert.notEqual(platform, "web", "Browser files must not use the native filesystem");
    }
    async bytes() {
      if (readError) throw readError;
      return fileBytes;
    }
  }
  const fetch = async (url, options) => {
    const multipart = await convertFormDataAsync(options.body);
    requests.push({ url, ...options, multipart });
    return storageResponse
      ? await storageResponse()
      : new Response(`  ${storageUrl}\n`);
  };
  const client = {
    defaults: { baseURL: "https://file.lamino.top/" },
    async post(url, body) {
      requests.push({ url, body });
      if (apiError) throw apiError;
    },
  };
  function load(name, dependencies) {
    return loadModule(path.join(__dirname, "../src/api", name), dependencies, {
      FormData: platform === "web" ? FormData : ExpoFormData,
      Blob: platform === "web" ? Blob : NativeBlob,
    });
  }
  const storage = load("storageApi.ts", {
    "react-native": { Platform: { OS: platform } },
    "expo-file-system": { File: NativeFile },
    "expo/fetch": { fetch },
  });
  const api = load("fileApi.ts", {
    "./client": { __esModule: true, default: client, clientReady: Promise.resolve() },
    "./storageApi": storage,
  });
  return { uploadFile: api.uploadFile, requests };
}

for (const platform of ["android", "ios", "web"]) {
  test(`${platform}: sends bytes to storage and only name/link to the API`, async () => {
    const { uploadFile, requests } = setup({ platform });
    const file = platform === "web"
      ? { ...selectedFile, file: new File(["report content"], selectedFile.name, { type: selectedFile.mimeType }) }
      : selectedFile;
    await uploadFile(file);

    assert.equal(requests.length, 2);
    assert.equal(requests[0].url, "https://temp.sh/upload");
    assert.equal(requests[0].method, "POST");
    // Let fetch generate the multipart boundary.
    assert.equal(requests[0].headers, undefined);
    if (platform === "web") {
      const uploaded = requests[0].body.get("file");
      assert.equal(uploaded.name, selectedFile.name);
      assert.equal(await uploaded.text(), "report content");
    } else {
      const uploaded = requests[0].body.get("file");
      assert.equal(uploaded.name, selectedFile.name);
      assert.equal(uploaded.type, selectedFile.mimeType);
      assert.equal(new TextDecoder().decode(await uploaded.bytes()), "report content");
    }
    const encoded = new TextDecoder().decode(requests[0].multipart.body);
    assert.ok(encoded.includes('name="file"; filename="report.pdf"'));
    assert.ok(encoded.includes("content-type: application/pdf\r\n\r\nreport content\r\n"));
    assert.equal(requests[1].url, "/api/upload");
    assert.deepEqual(JSON.parse(JSON.stringify(requests[1].body)), {
      fileName: selectedFile.name, url: storageUrl,
    });
  });
}

test("android: uploads a granted content URI and preserves the picker filename", async () => {
  const uri = "content://com.android.providers.downloads.documents/document/msf%3A42";
  const { uploadFile, requests } = setup({ expectedUri: uri });
  await uploadFile({ ...selectedFile, uri });

  const uploaded = requests[0].body.get("file");
  assert.equal(uploaded.name, "report.pdf");
  assert.equal(new TextDecoder().decode(await uploaded.bytes()), "report content");
  assert.equal(requests[1].body.fileName, "report.pdf");
});

test("native multipart preserves binary bytes without constructing a Blob from them", async () => {
  const fileBytes = new Uint8Array([0, 255, 128, 13, 10, 65]);
  const { uploadFile, requests } = setup({ fileBytes });
  await uploadFile(selectedFile);

  const { body, boundary } = requests[0].multipart;
  const parsed = await new Response(body, {
    headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
  }).formData();
  const uploaded = parsed.get("file");
  assert.equal(uploaded.name, selectedFile.name);
  assert.equal(uploaded.type, selectedFile.mimeType);
  assert.deepEqual(new Uint8Array(await uploaded.arrayBuffer()), fileBytes);
});

test("waits for storage's response body before registering the link", async () => {
  let returnLink;
  let markStarted;
  const link = new Promise((resolve) => { returnLink = resolve; });
  const started = new Promise((resolve) => { markStarted = resolve; });
  const { uploadFile, requests } = setup({
    storageResponse: () => {
      markStarted();
      return { ok: true, text: () => link };
    },
  });
  const pending = uploadFile(selectedFile);
  await started;
  assert.equal(requests.length, 1);
  returnLink(storageUrl);
  await pending;
  assert.equal(requests.length, 2);
});

test("falls back to a binary MIME type when the picker has none", async () => {
  const { uploadFile, requests } = setup();
  await uploadFile({ ...selectedFile, mimeType: undefined });
  assert.equal(requests[0].body.get("file").type, "application/octet-stream");
});

test("unreadable native files do not call storage or the metadata API", async () => {
  const readError = new Error("File cannot be read");
  const { uploadFile, requests } = setup({ readError });
  await assert.rejects(uploadFile(selectedFile), (error) => error === readError);
  assert.equal(requests.length, 0);
});

test("Expo's encoder rejects the old URI descriptor", async () => {
  class NativeFormData { _parts = []; }
  const ExpoFormData = installFormDataPatch(NativeFormData);
  const formData = new ExpoFormData();
  formData.append("file", {
    uri: selectedFile.uri, name: selectedFile.name, type: selectedFile.mimeType,
  });
  await assert.rejects(convertFormDataAsync(formData), /Unsupported FormDataPart implementation/);
});

for (const [label, storageResponse, message] of [
  ["HTTP error", () => new Response("Unavailable", { status: 503 }), /HTTP 503/],
  ["network error", () => { throw new Error("Network request failed"); }, /Network request failed/],
  ...["", "not a URL", "<html>Error</html>", "file:///cache/report.pdf", "data:text/plain,file"].map(
    (body) => [`invalid link ${JSON.stringify(body)}`, () => new Response(body), /valid file link/],
  ),
]) {
  test(`${label}: does not call the metadata API`, async () => {
    const { uploadFile, requests } = setup({ storageResponse });
    await assert.rejects(uploadFile(selectedFile), message);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].url, "https://temp.sh/upload");
  });
}

test("web: refuses a missing browser File before making requests", async () => {
  const { uploadFile, requests } = setup({ platform: "web" });
  await assert.rejects(uploadFile(selectedFile), /select it again/);
  assert.equal(requests.length, 0);
});

test("metadata API failures are propagated to the caller", async () => {
  const apiError = new Error("API unavailable");
  const { uploadFile, requests } = setup({ apiError });
  await assert.rejects(uploadFile(selectedFile), (error) => error === apiError);
  assert.equal(requests.length, 2);
});
