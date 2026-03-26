// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

/** @type {import('expo/metro-config').MetroConfig} */
// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

// Exclude native-only modules from web bundle
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const nativeOnlyModules = ['react-native-mmkv', 'react-native-health', 'expo-sensors'];
    if (nativeOnlyModules.includes(moduleName)) {
      return { type: 'empty' };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
