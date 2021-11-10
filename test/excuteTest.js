"use strict";

const assert = require("assert");
const Script = require("..");

describe("execute module", () => {
  it("returns module exports in callback", async () => {
    const source = new Script("../resources/lib/module");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    let called;

    await source.execute(context, (module) => {
      assert.ok(typeof module.default === "function");
      assert.ok(typeof module.justReturn === "function");
      called = true;
    });

    assert.ok(called);
  });

  it("executes module function", async () => {
    const source = new Script("../resources/lib/module");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    let called;

    await source.execute(context, (module) => {
      assert.equal(module.justReturn(1), 1);
      called = true;
    });

    assert.ok(called);
  });

  it("executes module with imports", async () => {
    const source = new Script("../resources/lib/importer2.js");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    let called;

    await source.execute(context, (module) => {
      assert.equal(module.default(), 1);
      called = true;
    });

    assert.ok(called);
  });
});
