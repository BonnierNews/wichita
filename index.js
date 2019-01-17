"use strict";

const fs = require("fs");
const vm = require("vm");
const {name, version} = require("./package.json");
const {dirname, extname, join, resolve: resolvePath} = require("path");

module.exports = function Scripts(sourcePath) {
  if (!("SourceTextModule" in vm)) throw new Error("No SourceTextModule in vm, try using node --experimental-vm-modules flag");

  const calledFrom = getCallerFile();
  const fullPath = getFullPath(sourcePath, calledFrom);

  return {
    path: fullPath,
    calledFrom,
    run(browser) {
      return runScripts(browser, fullPath);
    },
  };
};

function getFullPath(sourcePath, calledFrom) {
  const isRelativePath = /^\.{1,2}[/\\]?/.test(sourcePath);
  const resolvedPath = !isRelativePath && getModulePath(sourcePath);
  if (resolvedPath) {
    return resolvedPath;
  }

  if (!extname(sourcePath)) sourcePath += extname(calledFrom);
  return join(dirname(calledFrom), sourcePath);
}

function getModulePath(sourcePath) {
  try {
    const parts = sourcePath.split("/");
    const potentialModuleName = parts.shift();
    let theRest = parts.join("/");

    const requirePath = require.resolve(`${potentialModuleName}/package.json`);
    const resolvedPackage = require(`${potentialModuleName}/package.json`);
    const externalModule = resolvedPackage && (resolvedPackage.module || resolvedPackage["jsnext:main"]) || "index.js";

    if (theRest && !extname(theRest)) theRest += extname(externalModule);

    return resolvePath(dirname(requirePath), theRest || externalModule);
  } catch (e) {
    // do nothing
  }
}

async function runScripts(globalContext, mainPath, options = {}) {
  const cache = {};

  const vmContext = vm.createContext(globalContext, {
    name: `${name} v${version}`,
    ...options
  });

  const main = await loadScript(mainPath, vmContext);

  await main.instantiate();

  return main.evaluate();

  async function loadScript(scriptPath, context) {
    const scriptSource = await readScript(scriptPath);

    const module = new vm.SourceTextModule(scriptSource, {
      url: `file://${scriptPath}`,
      context,
    });

    await module.link(linker);

    return module;
  }

  async function linker(specifier, referencingModule) {
    const parentFile = referencingModule.url.substring(7);
    const scriptPath = getFullPath(specifier, parentFile);

    if (cache[scriptPath]) {
      return cache[scriptPath];
    }

    const module = await loadScript(scriptPath, referencingModule.context);
    cache[scriptPath] = module;
    return module;
  }

  function readScript(scriptPath) {
    return new Promise((resolve, reject) => {
      fs.readFile(scriptPath, (err, buf) => {
        if (err) return reject(err);
        resolve(buf.toString());
      });
    });
  }
}

function getCallerFile() {
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = function prepareStackTrace(_, stack) {
    return stack;
  };
  const stack = new Error().stack;
  Error.prepareStackTrace = oldPrepareStackTrace;
  return stack[2] ? stack[2].getFileName() : undefined;
}
