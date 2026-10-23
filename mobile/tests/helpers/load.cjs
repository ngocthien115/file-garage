const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const ts = require("typescript");

module.exports = function loadModule(filename, dependencies = {}, globals = {}) {
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React,
    },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    require: (id) => {
      assert.ok(Object.hasOwn(dependencies, id), `Unexpected import: ${id}`);
      return dependencies[id];
    },
    Blob, URL, Error, ArrayBuffer, TextEncoder, Uint8Array, ...globals,
  });
  return exports;
};
