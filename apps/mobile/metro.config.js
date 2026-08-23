const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the monorepo so `@umbil/shared` resolves during development.
config.watchFolders = [...(config.watchFolders ?? []), monorepoRoot];

module.exports = config;
