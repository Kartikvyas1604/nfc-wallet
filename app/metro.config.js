const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Polyfill Node.js core modules needed by ethers, @solana/web3.js, etc.
config.resolver.extraNodeModules = {
  crypto: require.resolve('react-native-quick-crypto'),
  stream: require.resolve('stream-browserify'),
  buffer: require.resolve('@craftzdog/react-native-buffer'),
  events: require.resolve('events/'),
  process: require.resolve('process/browser'),
  vm: require.resolve('vm-browserify'),
  url: require.resolve('url/'),
  assert: require.resolve('assert/'),
  http: require.resolve('@tradle/react-native-http'),
  https: require.resolve('https-browserify'),
  os: require.resolve('os-browserify/browser'),
  path: require.resolve('path-browserify'),
  zlib: require.resolve('browserify-zlib'),
};

module.exports = config;
