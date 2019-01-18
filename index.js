"use strict";

const fs = require("fs");
const vm = require("vm");
const {name, version} = require("./package.json");
const {dirname, extname, join, resolve: resolvePath, isAbsolute} = require("path");

module.exports = function Scripts(sourcePath, options) {
  if (!("SourceTextModule" in vm)) throw new Error("No SourceTextModule in vm, try using node --experimental-vm-modules flag");

  const calledFrom = getCallerFile();
  const fullPath = getFullPath(sourcePath, calledFrom);

  return {
    path: fullPath,
    calledFrom,
    run(globalContext) {
      return runScripts(globalContext, fullPath, options);
    },
    execute(globalContext, testFn) {
      return runScripts(globalContext, fullPath, {...options, initializeImportMeta}, `
import * as Module from "${fullPath}";
import.meta.export(Module)
      `);

      function initializeImportMeta(meta) {
        meta.export = testFn;
      }
    },
  };
};

function getFullPath(sourcePath, calledFrom) {
  if (isAbsolute(sourcePath)) return sourcePath;
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

async function runScripts(globalContext, mainPath, options = {}, testScript) {
  const cache = {};
  const {initializeImportMeta} = options;

  const vmContext = vm.createContext(globalContext, {
    name: `${name} v${version}`,
    ...options,
  });

  let mainModule;
  if (testScript) {
    mainModule = new vm.SourceTextModule(testScript, {
      url: `file://${mainPath}`,
      context: vmContext,
      initializeImportMeta,
    });

    await mainModule.link(linker);

  } else {
    mainModule = await loadScript(mainPath, vmContext);
  }

  await mainModule.instantiate();

  return mainModule.evaluate().then((result) => {
    return {
      ...result,
      module: mainModule,
      context: vmContext,
    };
  });

  async function loadScript(scriptPath, context) {
    const scriptSource = await readScript(scriptPath);

    const module = new vm.SourceTextModule(scriptSource, {
      url: `file://${scriptPath}`,
      context,
      initializeImportMeta
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
