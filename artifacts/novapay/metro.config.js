const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver = {
  ...config.resolver,
  blockList: [/node_modules\/.*bcrypt_tmp_.*/, /\.pnpm\/bcrypt.*\/bcrypt_tmp_.*/],
};

module.exports = config;
