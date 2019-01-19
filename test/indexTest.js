"use strict";

const assert = require("assert");
const Script = require("..");
const {join} = require("path");

describe("script", () => {
  it("returns api with run function and some props", async () => {
    const source = Script("../resources/main");

    assert.deepStrictEqual(source, {
      path: join(__dirname, "../resources/main.js"),
      calledFrom: __filename,
      run: source.run,
      execute: source.execute,
      exports: source.exports,
    });

    assert.ok(typeof source.run === "function", "run function");
    assert.ok(typeof source.execute === "function", "execute function");
    assert.ok(typeof source.exports === "function", "exports function");
  });

  it("executes scripts in passed context", async () => {
    const source = Script("../resources/main");

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
    const source = Script("../resources/main");

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

  it("picks up extension from main file when importing linked file", async () => {
    const source = Script("../resources/assets/main.mjs");

    const context = {
      window: {},
    };

    await source.run(context);

    assert.ok(context.window.gotten);
  });

  it("throws if main file is not found", async () => {
    const source = Script("../resources/no-main");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; //eslint-disable-line no-var
    }

    assert.ok(error);
    assert.equal(error.code, "ENOENT");
  });

  it("throws if trying to run a folder", async () => {
    const source = Script("../resources");

    const context = {
      window: {
        root: true,
      },
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; //eslint-disable-line no-var
    }

    assert.ok(error);
    assert.equal(error.code, "ENOENT");
  });

  it("throws if import file is not found", async () => {
    const source = Script("../resources/broken-import");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; //eslint-disable-line no-var
    }

    assert.ok(error);
    assert.equal(error.code, "ENOENT");

    assert.ok(/no-module\.js$/.test(error.path), error.path);
  });

  it("rejects if main file is not found", () => {
    const source = Script("../resources/no-main");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    return assert.rejects(() => source.run(context), {
      code: "ENOENT",
      path: join(__dirname, "../resources/no-main.js")
    });
  });

  it("rejects if import file is not found", () => {
    const source = Script("../resources/broken-import");

    const context = {
      window: {
        count: 41,
        root: true,
      },
    };

    return assert.rejects(() => source.run(context), {
      code: "ENOENT",
      path: join(__dirname, "../resources/lib/no-module.js")
    });
  });

  it("throws if script error", async () => {
    const source = Script("../resources/script-error.js");

    const context = {
      window: {}
    };

    try {
      await source.run(context);
    } catch (e) {
      var error = e; //eslint-disable-line no-var
    }

    assert.ok(error);
    assert.ok(/myProp/.test(error.message));
  });
});
