const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const loadModule = require("./helpers/load.cjs");

const src = (name) => path.join(__dirname, "../src", name);
const theme = {
  ...loadModule(src("theme/colors.ts")),
  ...loadModule(src("theme/spacing.ts")),
};

function setup() {
  let opens = 0, retries = 0, haptics = 0;
  const animations = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    useCallback: (callback) => callback,
    useRef: (value) => ({ current: value }),
    useEffect(effect) { effect(); },
  };
  const native = {
    ActivityIndicator: "Spinner", Pressable: "Pressable", View: "View", Text: "Text",
    StyleSheet: { create: (styles) => styles },
  };
  const { default: FileListItem } = loadModule(src("components/FileListItem.tsx"), {
    react: { __esModule: true, ...react, default: react },
    "react-native": native,
    "@expo/vector-icons": { Ionicons: "Icon" },
    "expo-haptics": { ImpactFeedbackStyle: { Light: "light" }, impactAsync() { haptics++; } },
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "AnimatedView", createAnimatedComponent: (component) => component },
      useSharedValue: (value) => ({ value }),
      useAnimatedStyle: (callback) => callback(),
      withSpring: (value) => value,
      withTiming(value, options) { animations.push(options); return value; },
    },
    "../theme": theme,
  });
  return {
    render(status, local = true) {
      return FileListItem({
        file: { id: "upload:1", fileName: "report.pdf", url: "https://temp.sh/report.pdf", status, local },
        onPress() { opens++; },
        onRetry() { retries++; },
      });
    },
    get opens() { return opens; },
    get retries() { return retries; },
    get haptics() { return haptics; },
    animations,
  };
}

function nodes(tree, type) {
  if (Array.isArray(tree)) return tree.flatMap((child) => nodes(child, type));
  if (!tree || typeof tree !== "object") return [];
  return [...(tree.type === type ? [tree] : []), ...nodes(tree.children, type)];
}

for (const status of ["uploading", "saving"]) {
  test(`${status}: spinner replaces the arrow and the row cannot open or vibrate`, () => {
    const app = setup();
    const tree = app.render(status);
    const row = nodes(tree, "Pressable")[0];
    assert.equal(row.props.disabled, true);
    assert.equal(row.props.accessibilityState.busy, true);
    assert.equal(row.props.onPressIn, undefined);
    assert.equal(row.props.onPressOut, undefined);
    row.props.onPress();
    assert.equal(app.opens, 0);
    assert.equal(app.haptics, 0);
    assert.equal(nodes(tree, "Spinner").length, 1);
    assert.ok(nodes(tree, "Icon").every((icon) => icon.props.name !== "chevron-forward"));
  });
}

test("ready: arrow returns and pressing opens the file", () => {
  const app = setup();
  const tree = app.render("ready");
  const row = nodes(tree, "Pressable")[0];
  assert.equal(row.props.disabled, false);
  assert.equal(nodes(tree, "Spinner").length, 0);
  assert.ok(nodes(tree, "Icon").some((icon) => icon.props.name === "chevron-forward"));
  row.props.onPress();
  assert.equal(app.opens, 1);
  assert.equal(app.haptics, 1);
});

test("error: opening remains blocked and Retry is a separate active button", () => {
  const app = setup();
  const tree = app.render("error");
  const [row, retry] = nodes(tree, "Pressable");
  assert.equal(row.props.disabled, true);
  assert.equal(row.props.accessibilityState.busy, false);
  assert.equal(nodes(tree, "Spinner").length, 0);
  row.props.onPress();
  retry.props.onPress();
  assert.equal(app.opens, 0);
  assert.equal(app.retries, 1);
});

test("fetched rows appear without an entrance animation", () => {
  const app = setup();
  app.render("ready", false);
  assert.equal(app.animations.length, 0);
});

test("new uploads retain their entrance animation", () => {
  const app = setup();
  app.render("uploading");
  assert.equal(app.animations.length, 1);
  assert.equal(app.animations[0].duration, 280);
});
