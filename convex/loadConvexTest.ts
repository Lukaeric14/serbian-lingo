// Loads convex-test bypassing Jest's Babel transform entirely — shared by every
// convex/*.test.ts file, since they all hit the identical SDK 54 incompatibility.
//
// Under the SDK 54 toolchain, babel-preset-expo ships a new import-meta-transform-plugin
// that hard-throws on any `import.meta` for non-web callers unless
// `unstable_transformImportMeta` is set — and convex-test/dist/index.js's fallback default
// (`specifiedModules ?? import.meta.glob(...)`) trips it at *parse* time, before the `??`
// even matters at runtime. This isn't a convex-test bug or specific to any one test file:
// plain Node (and SDK 57's babel-preset-expo, which has no such plugin) load the same file
// fine. Every convex/*.test.ts here always supplies `modules` by hand (never relying on
// convex-test's import.meta.glob default), so the branch that trips the plugin is never
// actually reached at runtime — only Babel's static parse cares.
//
// package.json's transformIgnorePatterns intentionally whitelists "convex-test" for
// transform (it needs ESM->CJS conversion in the general case), so this can't be fixed via
// jest config alone — loading the real, unmodified dist/index.js through Node's own CJS
// module system (instead of Jest's module registry) is what keeps Babel from ever seeing it.
export function loadConvexTest(): typeof import("convex-test") {
  const fs = require("fs");
  const path = require("path");
  const Module = require("module");

  const fullPath = require.resolve("convex-test");
  const source = fs.readFileSync(fullPath, "utf8");
  const mod = new Module(fullPath, module);
  mod.filename = fullPath;
  mod.paths = Module._nodeModulePaths(path.dirname(fullPath));
  mod._compile(source, fullPath);
  return mod.exports;
}
