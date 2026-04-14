const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@ungap/structured-clone': path.resolve(__dirname, 'src/vendor/structuredClone.ts')
};

module.exports = config;
