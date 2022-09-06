"use strict";

const vm = require("vm");
const url = require("url");
const {promises: fs} = require("fs");

const {name, version} = require("./package.json");
const wichita = `${name} v${version}`;
const {dirname, extname, resolve: resolvePath, isAbsolute, sep, posix} = require("path");

const ErrorPrepareStackTrace = Error.prepareStackTrace;

module.exports = Script;

function Script(sourcePath, options = {}, calledFrom) {
  if (!("SourceTextModule" in vm)) throw new Error("No SourceTextModule in vm, try using node --experimental-vm-modules flag");
  if (!(this instanceof Script)) return new Script(sourcePath, options, getCalledFrom());
  this.sourcePath = sourcePath;
  this.calledFrom = calledFrom || getCalledFrom();
  this.path = getFullPath(sourcePath, this.calledFrom);
  this.options = options;
}

Script.prototype.run = async function run(sandbox) {
  const {moduleRoute, fileCache, ...contextOptions} = this.options;
  const vmContext = vm.createContext(sandbox, {
    name: wichita,
    ...contextOptions,
  });

  const loader = new Loader(moduleRoute, fileCache);
  const module = await loader.loadScript(this.path, vmContext);
  const result = await module.evaluate();
  return {
    ...result,
    module,
    context: vmContext,
  };
};

Script.prototype.execute = async function execute(sandbox, fn) {
  const sourceName = posix.basename(this.sourcePath, posix.extname(this.sourcePath));
  const source = `import * as _module from "./${sourceName}";
  import.meta.export(_module)`;

  const {moduleRoute, fileCache, ...contextOptions} = this.options;
  const vmContext = vm.createContext(sandbox, {
    name: wichita,
    ...contextOptions,
  });

  const loader = new Loader(moduleRoute, fileCache);
  const module = await loader.loadModule(this.path, source, vmContext, initializeImportMeta);
  const result = module.evaluate();
  return {
    ...result,
    module,
    context: vmContext,
  };

  function initializeImportMeta(meta) {
    meta.export = fn;
  }
};

Script.prototype.exports = function exports(sandbox) {
  return new Promise((resolve, reject) => {
    this.execute(sandbox, resolve).catch(reject);
  });
};

function Loader(moduleRoute, fileCache) {
  this.moduleRoute = moduleRoute;
  this.fileCache = fileCache;
  this.cache = new Map();
  this.link = this.link.bind(this);
}

Loader.prototype.link = function link(specifier, reference) {
  if (this.moduleRoute) {
    specifier = specifier.replace(this.moduleRoute, "");
  }

  const modulePath = getFullPath(specifier, url.fileURLToPath(reference.identifier));

  let pending = this.cache.get(modulePath);
  if (pending) return pending;

  pending = this.loadScript(modulePath, reference.context);

  this.cache.set(modulePath, pending);

  return pending;
};

Loader.prototype.loadScript = async function loadScript(scriptPath, context) {
  const source = await this.getScriptSource(scriptPath);
  return this.loadModule(scriptPath, source, context);
};

Loader.prototype.loadModule = async function loadModule(scriptPath, source, context, initializeImportMeta) {
  const module = new vm.SourceTextModule(source, {
    identifier: url.pathToFileURL(scriptPath).toString(),
    context,
    initializeImportMeta,
  });
  await module.link(this.link);
  return module;
};

Loader.prototype.getScriptSource = async function getScriptSource(scriptPath) {
  const fileCache = this.fileCache;
  let content = fileCache?.get(scriptPath);
  if (content) return content;

  content = (await fs.readFile(scriptPath)).toString();
  if (extname(scriptPath) === ".json") {
    content = `export default ${content};`;
  }

  fileCache?.set(scriptPath, content);
  return content;
};

function getFullPath(sourcePath, calledFrom) {
  if (isAbsolute(sourcePath)) return sourcePath;

  const isRelativePath = isRelative(sourcePath);
  const resolvedPath = !isRelativePath && getModulePath(sourcePath);
  if (resolvedPath) {
    return resolvedPath;
  }

  let file = resolvePath(dirname(calledFrom), sourcePath.split("/").join(sep));
  if (!extname(file)) file += extname(calledFrom);
  return file;
}

function isRelative(p) {
  const p0 = p.split("/").shift();
  return p0 === "." || p0 === "..";
}

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

function getCalledFrom() {
  Error.prepareStackTrace = function prepareStackTrace(_, stack) {
    return stack;
  };
  const stack = new Error().stack;
  Error.prepareStackTrace = ErrorPrepareStackTrace;
  return stack[2]?.getFileName();
}
