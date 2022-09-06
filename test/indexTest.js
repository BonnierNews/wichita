"use strict";

const assert = require("assert");
const Script = require("..");
const vm = require("vm");
const {join} = require("path");

describe("script", () => {
  it("returns api with run function and some props", () => {
    const source = new Script("../resources/main");

    assert.deepEqual(source, {
      path: join(__dirname, "../resources/main.js"),
      sourcePath: "../resources/main",
      calledFrom: __filename,
      options: {},
    });

    assert.ok(typeof source.run === "function", "run function");
    assert.ok(typeof source.execute === "function", "execute function");
    assert.ok(typeof source.exports === "function", "exports function");
  });

  it("returns api if called without new", () => {
    const script = Script("../resources/main");

    assert.deepEqual(script, {
      path: join(__dirname, "../resources/main.js"),
      sourcePath: "../resources/main",
      calledFrom: __filename,
      options: {},
    });

    assert.ok(typeof script.run === "function", "run function");
    assert.ok(typeof script.execute === "function", "execute function");
    assert.ok(typeof script.exports === "function", "exports function");
  });

  it("executes scripts in passed context", async () => {
    const source = new Script("../resources/main");

    const context = {
      window: {
        root: true,
      },
    };

    await source.run(context);

    assert.ok(context.window.broker);
    assert.ok(context.window.broker.getExchange("event"));
    assert.ok(context.window.setByModule);
    assert.equal(context.window.count, 1);
    assert.ok(context.window.setByQueue);
  });

  it("and again", async () => {
    const source = new Script("../resources/main");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    await source.run(context);

    assert.ok(context.window.broker);
    assert.ok(context.window.broker.getExchange("event"));
    assert.ok(context.window.setByModule);
    assert.equal(context.window.count, 42);
    assert.ok(context.window.setByQueue);
  });

  it("executes scripts with same context twice", async () => {
    const source = new Script("../resources/main");

    const context = {
      window: {
        root: true,
      },
    };

    await source.run(context);
    await source.run(context);
  });

  it("executes same scripts with different context", async () => {
    const source = new Script("../resources/main");

    await source.run({
      window: {
        root: true,
      },
    });
    await source.run({
      window: {
        root: true,
      },
    });
  });

  it("options.fileCache caches source file contents", async () => {
    const cache = new Map();
    const source = new Script("../resources/main", {
      name: "Tallahassee",
      origin: "https://www.expressen.se",
      fileCache: cache,
    });

    const context = {
      window: {},
      console,
    };

    await source.run(context);
    const firstSize = cache.size;
    assert.ok(firstSize > 2);

    await source.run(context);
    assert.equal(firstSize, cache.size);
  });

  it("options are passed to vm.createContext", async () => {
    const source = new Script("../resources/main", {
      name: "Tallahassee",
      origin: "https://www.expressen.se",
    });

    const context = {
      window: {},
      console,
    };

    const result = await source.run(context);
    assert.ok(vm.isContext(result.context));
  });

  it("picks up extension from main file when importing linked file", async () => {
    const source = new Script("../resources/assets/main.mjs");

    const context = {
      window: {},
    };

    await source.run(context);

    assert.ok(context.window.gotten);
  });

  it("imported json files are exported as default", async () => {
    const source = new Script("../resources/assets/main.mjs");

    const context = {
      window: {},
    };

    await source.run(context);

    assert.ok(context.window.data);
  });

  it("throws if main file is not found", async () => {
    const source = new Script("../resources/no-main");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; // eslint-disable-line no-var
    }

    assert.ok(error);
    assert.equal(error.code, "ENOENT");
  });

  it("throws if trying to run a folder", async () => {
    const source = new Script("../resources");

    const context = {
      window: {
        root: true,
      },
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; // eslint-disable-line no-var
    }

    assert.ok(error);
    assert.equal(error.code, "ENOENT");
  });

  it("throws if import file is not found", async () => {
    const source = new Script("../resources/broken-import");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; // eslint-disable-line no-var
    }

    assert.ok(error);
    assert.equal(error.code, "ENOENT");

    assert.ok(/no-module\.js$/.test(error.path), error.path);
  });

  it("rejects if main file is not found", () => {
    const source = new Script("../resources/no-main");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    return assert.rejects(() => source.run(context), {
      code: "ENOENT",
      path: join(__dirname, "../resources/no-main.js"),
    });
  });

  it("rejects if import file is not found", () => {
    const source = new Script("../resources/broken-import");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    return assert.rejects(() => source.run(context), {
      code: "ENOENT",
      path: join(__dirname, "../resources/lib/no-module.js"),
    });
  });

  it("throws if script error", async () => {
    const source = new Script("../resources/script-error.js");

    const context = {
      window: {},
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; // eslint-disable-line no-var
    }

    assert.ok(error);
    assert.ok(/myProp/.test(error.message));
  });

  it("moduleRoute option helps to resolve static imports", async () => {
    const source = new Script("../resources/static-import.js", {moduleRoute: "/module/"});

    const context = {
      window: {
        root: true,
      },
    };

    await source.run(context);

    assert.ok(context.window.broker);
  });

  it("should not run imported module scope more than once", async () => {
    const source = new Script("../resources/main");

    const context = {
      window: {
        root: true,
      },
    };

    await source.run(context);
    assert.equal(context.window.timesImported, 1);
  });
});
