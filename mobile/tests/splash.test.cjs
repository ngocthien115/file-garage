const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const loadModule = require("./helpers/load.cjs");

function setup() {
  let now = 0, nextId = 0, finishes = 0, hides = 0;
  const timers = new Map();
  const effects = [];
  const animations = [];
  const react = {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useEffect: (effect) => effects.push(effect),
  };
  const { default: Splash } = loadModule(path.join(__dirname, "../src/screens/SplashScreen.tsx"), {
    react: { __esModule: true, ...react, default: react },
    "react-native": { StyleSheet: { create: (styles) => styles } },
    "@expo/vector-icons": { Ionicons: "Icon" },
    "expo-splash-screen": {
      preventAutoHideAsync: async () => true,
      hideAsync: async () => { hides++; },
    },
    "react-native-reanimated": {
      __esModule: true,
      default: { View: "AnimatedView", Text: "AnimatedText" },
      useSharedValue: (value) => ({ value }),
      useAnimatedStyle: (callback) => callback(),
      withSpring: (value) => value,
      withTiming(value, options) { animations.push({ value, ...options }); return value; },
      withDelay: (_, value) => value,
      cancelAnimation() {},
      Easing: { inOut: (value) => value, ease: "ease" },
    },
    "../theme": { colors: {}, spacing: {} },
    // No API module is supplied: the splash must never fetch the file list.
  }, {
    setTimeout(callback, delay) {
      const id = ++nextId;
      timers.set(id, { at: now + delay, callback });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  });
  const tree = Splash({ onFinish: () => { finishes++; } });
  const cleanup = effects[0]();
  return {
    tree, cleanup, animations,
    get finishes() { return finishes; },
    get hides() { return hides; },
    advance(ms) {
      const target = now + ms;
      while (true) {
        const due = [...timers.entries()].filter(([, timer]) => timer.at <= target)
          .sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].callback();
      }
      now = target;
    },
  };
}

test("native splash hides when the animated splash has laid out", async () => {
  const splash = setup();
  assert.equal(splash.hides, 0);
  splash.tree.props.onLayout();
  assert.equal(splash.hides, 1);
  assert.equal(splash.finishes, 0);
});

test("animated splash fades within one second without waiting for an API", () => {
  const splash = setup();
  splash.advance(750);
  assert.ok(splash.animations.some((animation) => animation.value === 0 && animation.duration === 250));
  splash.advance(249);
  assert.equal(splash.finishes, 0);
  splash.advance(1);
  assert.equal(splash.finishes, 1);
  splash.advance(5000);
  assert.equal(splash.finishes, 1);
});

test("unmounting splash cancels its timers", () => {
  const splash = setup();
  splash.advance(500);
  splash.cleanup();
  splash.advance(1500);
  assert.equal(splash.finishes, 0);
});
