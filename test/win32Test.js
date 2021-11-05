"use strict";

const assert = require("assert");
const {isAbsolute, extname, dirname, resolve: resolvePath, sep} = require("path").win32;

describe("win32", () => {
  it("relative file can be resolved", () => {
    assert.equal(
      getFullPath("../resources/lib/module", "D:\\a\\wichita\\wichita\\test\\win32Test.js"),
      "D:\\a\\wichita\\wichita\\resources\\lib\\module.js"
    );
    assert.equal(
      getFullPath("../resources/lib/module.mjs", "D:\\a\\wichita\\wichita\\test\\win32Test.js"),
      "D:\\a\\wichita\\wichita\\resources\\lib\\module.mjs"
    );

    function getFullPath(sourcePath, calledFrom) {
      let file = resolvePath(dirname(calledFrom), sourcePath.split("/").join(sep));
      if (!extname(file)) file += extname(calledFrom);
      return file;
    }
  });

  it("isAbsolute returns true", () => {
    assert.equal(
      isAbsolute("D:\\a\\wichita\\wichita\\resources\\lib\\module.js"),
      true
    );
    assert.equal(isAbsolute("smqp"), false);
    assert.equal(isAbsolute("@bonniernews/md2html"), false);
  });

  it("resolve node module", () => {
    const module = getModulePath("@bonniernews/md2html", "D:\\a\\wichita\\wichita\\test\\win32Test.js");
    assert.equal(
      extname(module),
      ".js"
    );

    function getModulePath(sourcePath) {
      try {
        const parts = sourcePath.split("/");
        let potentialModuleName = parts.shift();

        if (potentialModuleName.indexOf("@") === 0) {
          potentialModuleName += `/${parts.shift()}`;
        }

        const requirePath = require.resolve(`${potentialModuleName}/package.json`);
        const resolvedPackage = require(`${potentialModuleName}/package.json`);
        const externalModule = resolvedPackage && (resolvedPackage.module || resolvedPackage["jsnext:main"]) || "index.js";

        let theRest = parts.join(sep);
        if (theRest && !extname(theRest)) theRest += extname(externalModule);
        return resolvePath(dirname(requirePath), theRest || externalModule);
      } catch (e) {
        // do nothing
      }
    }
  });
});
