const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const loadModule = require("./helpers/load.cjs");

const saved = { id: "server:1", fileName: "report.pdf", url: "https://temp.sh/report.pdf", status: "ready", local: false };
const asDefault = (value) => ({ __esModule: true, default: value });

function deferred() {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  return { promise, resolve };
}

function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== "object") return [];
  const matches = tree.type === type || (typeof tree.type === "function" && tree.type.name === type);
  return [...(matches ? [tree] : []), ...nodes(tree.children, type)];
}

function setup(initial = { files: [], loading: true }) {
  const state = { ...initial };
  const values = [];
  let cursor = 0;
  const loads = [];
  const upload = deferred();
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useCallback: (callback) => callback,
    useEffect() {},
    useRef(value) {
      const index = cursor++;
      values[index] ??= { current: value };
      return values[index];
    },
    useState(initialValue) {
      const index = cursor++;
      if (!(index in values)) values[index] = initialValue;
      return [values[index], (value) => { values[index] = value; }];
    },
  };
  const hook = {
    state,
    loadFiles() {
      state.loading = true;
      const request = deferred();
      loads.push(request);
      return request.promise.then((files) => { state.files = files; state.loading = false; });
    },
    startUpload(file) {
      state.files = [{ id: "upload:1", fileName: file.name, status: "uploading", local: true }, ...state.files];
      return upload.promise;
    },
    retryUpload() {},
  };
  const { default: Screen } = loadModule(path.join(__dirname, "../src/screens/FileListScreen.tsx"), {
    react: { ...asDefault(react), ...react },
    "react-native": {
      View: "View", Text: "Text", FlatList: "FlatList", Pressable: "Pressable",
      RefreshControl: "RefreshControl", ScrollView: "ScrollView", SafeAreaView: "SafeAreaView", StatusBar: "StatusBar",
      Platform: { OS: "android" },
      StyleSheet: { create: (styles) => styles },
      Alert: { alert() {} }, Linking: { openURL() {} },
    },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "expo-document-picker": {
      getDocumentAsync: async () => ({ canceled: false, assets: [{ name: "new.pdf", uri: "content://documents/42" }] }),
    },
    "expo-haptics": { notificationAsync() {}, NotificationFeedbackType: { Success: "success", Error: "error" } },
    "react-native-reanimated": { ...asDefault({ createAnimatedComponent: (component) => component }) },
    "../hooks/useFiles": { useFiles: () => hook },
    "../hooks/useServerSettings": { useServerSettings: () => ({ baseURL: "https://file.lamino.top/", recentURLs: [], ready: true }) },
    "../components/ApiSettingsModal": asDefault("ApiSettingsModal"),
    "../components/FileListItem": asDefault("FileListItem"),
    "../components/LoadingScreen": asDefault("LoadingScreen"),
    "../components/EmptyState": asDefault("EmptyState"),
    "../components/ErrorState": asDefault("ErrorState"),
    "../theme": { colors: {}, spacing: {}, radii: {}, shadows: {} },
  });
  return {
    state, loads, upload,
    render() { cursor = 0; return Screen(); },
  };
}

test("slow initial list uses one loading screen, then displays the list", () => {
  const app = setup();
  let tree = app.render();
  assert.equal(nodes(tree, "LoadingScreen").length, 1);
  assert.equal(nodes(tree, "EmptyState").length, 0);
  app.state.loading = false;
  app.state.files = [saved];
  tree = app.render();
  assert.equal(nodes(tree, "LoadingScreen").length, 0);
  assert.equal(nodes(tree, "FlatList").length, 1);
});

test("retrying a failed refresh preserves the list and its row keys under loading", async () => {
  const app = setup({ files: [saved], loading: false, error: "Offline" });
  const before = app.render();
  const request = nodes(before, "FlatList")[0].props.ListHeaderComponent.props.onPress();
  const during = app.render();
  assert.equal(nodes(during, "LoadingScreen").length, 1);
  assert.equal(nodes(during, "FlatList").length, 1);
  const beforeKey = nodes(before, "FlatList")[0].props.keyExtractor(saved);
  const duringKey = nodes(during, "FlatList")[0].props.keyExtractor(saved);
  assert.equal(beforeKey, duringKey);
  assert.ok(nodes(during, "View").some((view) => view.props.pointerEvents === "none"));
  app.loads[0].resolve([saved]);
  await request;
  assert.equal(nodes(app.render(), "LoadingScreen").length, 0);
});

test("pull-to-refresh uses only its own spinner", async () => {
  const app = setup({ files: [saved], loading: false });
  const request = nodes(app.render(), "FlatList")[0].props.refreshControl.props.onRefresh();
  const tree = app.render();
  assert.equal(nodes(tree, "LoadingScreen").length, 0);
  assert.equal(nodes(tree, "FlatList")[0].props.refreshControl.props.refreshing, true);
  app.loads[0].resolve([saved]);
  await request;
});

for (const refreshing of [false, true]) {
  test(`selecting a file during ${refreshing ? "pull-to-refresh" : "initial loading"} shows the upload immediately`, async () => {
    const app = setup({ files: refreshing ? [saved] : [], loading: !refreshing });
    const tree = app.render();
    const header = nodes(tree, "Header")[0];
    const refresh = refreshing ? nodes(tree, "FlatList")[0].props.refreshControl.props.onRefresh() : undefined;
    const pending = header.props.onPickFile();
    await new Promise((resolve) => setImmediate(resolve));
    const uploading = app.render();
    assert.equal(nodes(uploading, "LoadingScreen").length, 0);
    assert.equal(nodes(uploading, "FlatList")[0].props.data[0].status, "uploading");
    app.upload.resolve(true);
    await pending;
    if (refresh) {
      app.loads[0].resolve(app.state.files);
      await refresh;
    }
  });
}

for (const error of [undefined, "Offline"]) {
  test(`pull-to-refresh also works with ${error ? "an error" : "an empty list"}`, async () => {
    const app = setup({ files: [], loading: false, error });
    const scroll = nodes(app.render(), "ScrollView")[0];
    const request = scroll.props.refreshControl.props.onRefresh();
    assert.equal(nodes(app.render(), "LoadingScreen").length, 0);
    assert.equal(nodes(app.render(), "ScrollView")[0].props.refreshControl.props.refreshing, true);
    app.loads[0].resolve([saved]);
    await request;
    assert.equal(nodes(app.render(), "FlatList")[0].props.data[0].id, saved.id);
  });
}

test("the visible server bar opens Settings without a successful list request", () => {
  const app = setup();
  const bar = nodes(app.render(), "Pressable").find((node) => node.props.accessibilityLabel?.startsWith("API server settings"));
  assert.ok(bar);
  bar.props.onPress();
  const modal = nodes(app.render(), "ApiSettingsModal")[0];
  assert.equal(modal.props.baseURL, "https://file.lamino.top/");
  modal.props.onClose();
  assert.equal(nodes(app.render(), "ApiSettingsModal").length, 0);
});

test("server settings know when uploads are running", () => {
  const app = setup({ files: [{ ...saved, local: true, status: "uploading" }], loading: false });
  const bar = nodes(app.render(), "Pressable").find((node) => node.props.accessibilityLabel?.startsWith("API server settings"));
  bar.props.onPress();
  assert.equal(nodes(app.render(), "ApiSettingsModal")[0].props.uploading, true);
});
