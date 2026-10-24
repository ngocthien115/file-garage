const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");

test("generated Android manifest permits configurable HTTP API servers", () => {
  // Inspect the manifest produced by Expo, including all configured plugins.
  // This checks the native configuration used by EAS without generating android/.
  const output = execFileSync(process.execPath, [
    require.resolve("expo/bin/cli"), "config", "--type", "introspect", "--json",
  ], {
    cwd: path.join(__dirname, ".."),
    encoding: "utf8",
    env: { ...process.env, EXPO_NO_TELEMETRY: "1", EXPO_OFFLINE: "1" },
  });
  const manifest = JSON.parse(output)._internal.modResults.android.manifest.manifest;
  assert.equal(manifest.application[0].$["android:usesCleartextTraffic"], "true");
  assert.ok(manifest["uses-permission"].some((permission) => permission.$["android:name"] === "android.permission.INTERNET"));
});
