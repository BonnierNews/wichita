"use strict";

const assert = require("assert");
const Script = require("..");

describe("execute module", () => {
  it("returns module exports in callback", async () => {
    const source = Script("../resources/lib/module");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    let called;

    await source.execute(context, (module) => {
      called = true;

      assert.ok(typeof module.default === "function");
      assert.ok(typeof module.justReturn === "function");
    });

    assert.ok(called);
  });

  it("executes module function", async () => {
    const source = Script("../resources/lib/module");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    let called;

    await source.execute(context, (module) => {
      called = true;
      assert.equal(module.justReturn(1), 1);
    });

    assert.ok(called);
  });
});
