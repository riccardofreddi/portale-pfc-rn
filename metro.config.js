const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro configuration (Expo SDK 52)
 * https://docs.expo.dev/guides/customizing-metro/
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

module.exports = config;
