"use strict";

const fs = require("fs");
const vm = require("vm");
const {name, version} = require("./package.json");
const {dirname, extname, join, resolve: resolvePath, isAbsolute} = require("path");

const ErrorPrepareStackTrace = Error.prepareStackTrace;

module.exports = function Scripts(sourcePath, options) {
  if (!("SourceTextModule" in vm)) throw new Error("No SourceTextModule in vm, try using node --experimental-vm-modules flag");

  const calledFrom = getCallerFile();
  const fullPath = getFullPath(sourcePath, calledFrom);

  return {
    path: fullPath,
    calledFrom,
    run(sandbox) {
      return runScripts(sandbox, fullPath, options);
    },
    exports(sandbox) {
      return new Promise((resolve, reject) => {
        this.execute(sandbox, resolve).catch(reject);
      });
    },
    execute(sandbox, fn) {
      return runScripts(sandbox, fullPath, {...options, initializeImportMeta}, `
import * as _module from "${fullPath}";
import.meta.export(_module)
      `);

      function initializeImportMeta(meta) {
        meta.export = fn;
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
    let potentialModuleName = parts.shift();

    if (potentialModuleName.indexOf("@") === 0) {
      potentialModuleName += `/${parts.shift()}`;
    }

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

async function runScripts(sandbox, mainPath, options = {}, script) {
  const cache = {};
  const {initializeImportMeta, moduleRoute} = options;

  const vmContext = vm.createContext(sandbox, {
    name: `${name} v${version}`,
    ...options,
  });

  let mainModule;
  if (script) {
    const identifier = `file://${mainPath}`;
    mainModule = new vm.SourceTextModule(script, {
      identifier,
      url: identifier, // pre node v12.12
      context: vmContext,
      initializeImportMeta,
    });

    await mainModule.link(linker);
  } else {
    mainModule = await loadScript(mainPath, vmContext);
  }

  if (mainModule.instantiate) {
    await mainModule.instantiate(); // pre node v12.12
  }

  return mainModule.evaluate().then((result) => {
    return {
      ...result,
      module: mainModule,
      context: vmContext,
    };
  });

  async function loadScript(scriptPath, context) {
    let source = await readScript(scriptPath);
    if (extname(scriptPath) === ".json") {
      source = `export default ${source};`;
    }

    const identifier = `file://${scriptPath}`;
    const module = new vm.SourceTextModule(source, {
      identifier,
      url: identifier, // pre node v12.12
      context,
      initializeImportMeta
    });

    await module.link(linker);

    return module;
  }

  async function linker(specifier, referencingModule) {
    const {url, identifier} = referencingModule;
    const parentFile = (url || identifier).substring(7);

    if (moduleRoute) {
      specifier = specifier.replace(moduleRoute, "");
    }

    const scriptPath = getFullPath(specifier, parentFile);

    if (!cache[scriptPath]) {
      cache[scriptPath] = loadScript(scriptPath, referencingModule.context);
    }

    return await cache[scriptPath];
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
  Error.prepareStackTrace = function prepareStackTrace(_, stack) {
    return stack;
  };
  const stack = new Error().stack;
  Error.prepareStackTrace = ErrorPrepareStackTrace;
  return stack[2] ? stack[2].getFileName() : undefined;
}
