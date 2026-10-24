const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

module.exports = function withApiNetwork(config) {
  return withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    // API servers are user-configurable, including LAN and Tailscale HTTP URLs.
    application.$["android:usesCleartextTraffic"] = "true";
    return config;
  });
};
