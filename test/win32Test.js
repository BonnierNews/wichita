"use strict";

const assert = require("assert");
const {isAbsolute, extname, dirname, join, resolve: resolvePath, sep} = require("path").win32;

describe("win32", () => {
  it("relative file returns full path with extension from caller", () => {

    assert.equal(
      getFullPath("../resources/lib/module", "D:\\a\\wichita\\wichita\\test\\win32Test.js"),
      "D:\\a\\wichita\\wichita\\resources\\lib\\module.js"
    );

    function getFullPath(sourcePath, calledFrom) {
      if (isAbsolute(sourcePath)) return sourcePath;
      let file = join(dirname(calledFrom), sourcePath);
      if (!extname(file)) file += extname(calledFrom);
      return file;
    }
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
