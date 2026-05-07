"use strict";

const vm = require("vm");
const url = require("url");
const Module = require("module");
const {promises: fs, existsSync, readFileSync} = require("fs");

const {name, version} = require("./package.json");
const wichita = `${name} v${version}`;
const {dirname, extname, resolve: resolvePath, isAbsolute, sep, posix} = require("path");

const ErrorPrepareStackTrace = Error.prepareStackTrace;
const RESOLUTION_CONDITIONS = ["node", "import"];

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

  if (!isRelative(sourcePath)) {
    return getModulePath(sourcePath, calledFrom);
  }

  let file = resolvePath(dirname(calledFrom), sourcePath.split("/").join(sep));
  if (!extname(file)) file += extname(calledFrom);
  return file;
}

function isRelative(p) {
  const p0 = p.split("/").shift();
  return p0 === "." || p0 === "..";
}

function getModulePath(sourcePath, calledFrom) {
  const parts = sourcePath.split("/");
  let pkgName = parts.shift();
  if (pkgName.startsWith("@")) {
    pkgName += `/${parts.shift()}`;
  }
  const subpath = parts.length ? `./${parts.join("/")}` : ".";

  const req = Module.createRequire(calledFrom);
  const pkgRoot = findPackageRoot(req, pkgName);
  if (!pkgRoot) {
    throw resolveError(sourcePath, calledFrom, `package "${pkgName}" not found in node_modules`);
  }

  const pkg = JSON.parse(readFileSync(resolvePath(pkgRoot, "package.json"), "utf8"));

  if (pkg.exports !== null && pkg.exports !== undefined) {
    const target = resolveExports(pkg.exports, subpath, RESOLUTION_CONDITIONS);
    if (target === null) {
      throw resolveError(sourcePath, calledFrom, `subpath "${subpath}" of package "${pkgName}" is not exported (matched a null target in the exports field)`);
    }
    if (target === undefined) {
      throw resolveError(sourcePath, calledFrom, `no matching export for "${subpath}" in package "${pkgName}"`);
    }
    return resolvePath(pkgRoot, target);
  }

  // Legacy path: prefer ESM-friendly entry, never fall back to CJS-only "main".
  const main = pkg.module || pkg["jsnext:main"] || "index.js";
  if (subpath === ".") {
    return resolvePath(pkgRoot, main);
  }
  let theRest = parts.join(sep);
  if (theRest && !extname(theRest)) theRest += extname(main);
  return resolvePath(pkgRoot, theRest);
}

function findPackageRoot(req, pkgName) {
  try {
    return dirname(req.resolve(`${pkgName}/package.json`));
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") return undefined;
    if (e.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw e;
  }
  // Package's exports map blocks ./package.json — walk node_modules paths manually.
  const paths = (req.resolve.paths(pkgName) || []);
  for (const p of paths) {
    const candidate = resolvePath(p, ...pkgName.split("/"));
    if (existsSync(resolvePath(candidate, "package.json"))) {
      return candidate;
    }
  }
  return undefined;
}

function resolveExports(exportsField, subpath, conditions) {
  if (typeof exportsField === "string" || Array.isArray(exportsField)) {
    if (subpath !== ".") return undefined;
    return resolveTarget(exportsField, "", conditions);
  }
  if (exportsField === null || typeof exportsField !== "object") return undefined;

  const keys = Object.keys(exportsField);
  const hasSubpath = keys.some((k) => k.startsWith("."));
  const hasCondition = keys.some((k) => !k.startsWith("."));
  if (hasSubpath && hasCondition) {
    throw new Error("Invalid \"exports\" field: keys must not mix subpaths and conditions");
  }

  if (hasSubpath) {
    if (Object.prototype.hasOwnProperty.call(exportsField, subpath)) {
      return resolveTarget(exportsField[subpath], "", conditions);
    }
    let bestKey;
    let bestStar = "";
    let bestPrefixLen = -1;
    for (const k of keys) {
      const star = k.indexOf("*");
      if (star === -1) continue;
      const prefix = k.slice(0, star);
      const suffix = k.slice(star + 1);
      if (subpath.length < prefix.length + suffix.length) continue;
      if (!subpath.startsWith(prefix)) continue;
      if (!subpath.endsWith(suffix)) continue;
      if (prefix.length > bestPrefixLen) {
        bestKey = k;
        bestPrefixLen = prefix.length;
        bestStar = subpath.slice(prefix.length, subpath.length - suffix.length);
      }
    }
    if (bestKey !== undefined) {
      return resolveTarget(exportsField[bestKey], bestStar, conditions);
    }
    return undefined;
  }

  if (subpath !== ".") return undefined;
  return resolveTarget(exportsField, "", conditions);
}

function resolveTarget(target, star, conditions) {
  if (target === null) return null;
  if (typeof target === "string") {
    if (!target.startsWith("./")) return undefined;
    return target.split("*").join(star);
  }
  if (Array.isArray(target)) {
    let nullSeen = false;
    for (const item of target) {
      const r = resolveTarget(item, star, conditions);
      if (r === null) {
        nullSeen = true;
        continue;
      }
      if (r !== undefined) return r;
    }
    return nullSeen ? null : undefined;
  }
  if (typeof target === "object") {
    for (const key of Object.keys(target)) {
      if (key === "default" || conditions.includes(key)) {
        const r = resolveTarget(target[key], star, conditions);
        if (r !== undefined) return r;
      }
    }
    return undefined;
  }
  return undefined;
}

function resolveError(specifier, calledFrom, reason) {
  const err = new Error(`Cannot resolve module "${specifier}" imported from "${calledFrom}": ${reason}`);
  err.code = "ERR_MODULE_NOT_FOUND";
  return err;
}

function getCalledFrom() {
  Error.prepareStackTrace = function prepareStackTrace(_, stack) {
    return stack;
  };
  const stack = new Error().stack;
  Error.prepareStackTrace = ErrorPrepareStackTrace;
  return stack[2]?.getFileName();
}
