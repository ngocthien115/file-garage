const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const loadModule = require("./helpers/load.cjs");

const flush = () => new Promise((resolve) => setImmediate(resolve));
const asDefault = (value) => ({ __esModule: true, default: value });
const initialURL = "https://file.lamino.top/";

function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== "object") return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.children, type)];
}

function setup({ uploading = false, setItem = async () => {} } = {}) {
  const values = [], writes = [];
  let cursor = 0, closes = 0;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
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
  const settings = loadModule(path.join(__dirname, "../src/api/serverSettings.ts"), {
    "@react-native-async-storage/async-storage": asDefault({
      getItem: async () => null,
      async setItem(key, value) { writes.push({ key, value }); await setItem(key, value); },
    }),
  });
  const { default: Settings } = loadModule(path.join(__dirname, "../src/components/ApiSettingsModal.tsx"), {
    react: { ...asDefault(react), ...react },
    "react-native": {
      ActivityIndicator: "Spinner", KeyboardAvoidingView: "KeyboardAvoidingView", Modal: "Modal",
      Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", TextInput: "Input", View: "View",
      Platform: { OS: "android" }, StyleSheet: { create: (styles) => styles },
    },
    "../api/serverSettings": settings,
    "../theme": { colors: {}, radii: {}, shadows: {}, spacing: {} },
  });
  return {
    settings, writes,
    get closes() { return closes; },
    render() {
      cursor = 0;
      return Settings({ baseURL: initialURL, recentURLs: [initialURL, "http://192.168.1.19:8080/"], uploading, onClose() { closes++; } });
    },
  };
}

const saveButton = (tree) => nodes(tree, "Pressable").find((node) => node.props.accessibilityLabel === "Save server URL");

test("editing and saving persists the URL and closes Settings", async () => {
  const app = setup();
  nodes(app.render(), "Input")[0].props.onChangeText(" http://192.168.1.99:8080 ");
  saveButton(app.render()).props.onPress();
  await flush();
  assert.equal(app.settings.getServerSettings().baseURL, "http://192.168.1.99:8080/");
  assert.equal(app.closes, 1);
});

test("quick switch selects a URL but applies it only when Save is pressed", async () => {
  const app = setup();
  nodes(app.render(), "Pressable").find((node) => node.props.accessibilityLabel === "Use http://192.168.1.19:8080/").props.onPress();
  assert.equal(nodes(app.render(), "Input")[0].props.value, "http://192.168.1.19:8080/");
  assert.equal(app.settings.getServerSettings().baseURL, initialURL);
  saveButton(app.render()).props.onPress();
  await flush();
  assert.equal(app.settings.getServerSettings().baseURL, "http://192.168.1.19:8080/");
});

test("invalid input remains editable and displays an error without closing", async () => {
  const app = setup();
  nodes(app.render(), "Input")[0].props.onChangeText("not a URL");
  saveButton(app.render()).props.onPress();
  await flush();
  assert.equal(app.closes, 0);
  assert.equal(app.writes.length, 0);
  assert.ok(nodes(app.render(), "Text").some((node) => node.props.accessibilityRole === "alert"));
  assert.equal(nodes(app.render(), "Input")[0].props.editable, true);
});

test("saving blocks duplicate submits and dismissal until persistence finishes", async () => {
  let finish;
  const pending = new Promise((resolve) => { finish = resolve; });
  const app = setup({ setItem: () => pending });
  const button = saveButton(app.render());
  button.props.onPress();
  button.props.onPress();
  await flush();
  const tree = app.render();
  assert.equal(saveButton(tree).props.disabled, true);
  assert.equal(nodes(tree, "Spinner").length, 1);
  nodes(tree, "Modal")[0].props.onRequestClose();
  assert.equal(app.closes, 0);
  assert.equal(app.writes.length, 1);
  finish();
  await flush();
  assert.equal(app.closes, 1);
});

test("server changes are blocked during an upload, including keyboard submission", async () => {
  const app = setup({ uploading: true });
  const tree = app.render();
  assert.equal(saveButton(tree).props.disabled, true);
  saveButton(tree).props.onPress();
  nodes(tree, "Input")[0].props.onSubmitEditing();
  await flush();
  assert.equal(app.writes.length, 0);
  assert.equal(app.closes, 0);
});

test("a failed save preserves the active server and keeps Settings open", async () => {
  const app = setup({ setItem: async () => { throw new Error("Disk full"); } });
  nodes(app.render(), "Input")[0].props.onChangeText("https://another.example.com");
  saveButton(app.render()).props.onPress();
  await flush();
  assert.equal(app.closes, 0);
  assert.equal(app.settings.getServerSettings().baseURL, initialURL);
  assert.ok(nodes(app.render(), "Text").some((node) => node.props.accessibilityRole === "alert"));
});

test("Cancel leaves the active server unchanged", () => {
  const app = setup();
  nodes(app.render(), "Input")[0].props.onChangeText("https://unsaved.example.com");
  nodes(app.render(), "Modal")[0].props.onRequestClose();
  assert.equal(app.closes, 1);
  assert.equal(app.settings.getServerSettings().baseURL, initialURL);
  assert.equal(app.writes.length, 0);
});
