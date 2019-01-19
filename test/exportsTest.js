"use strict";

const assert = require("assert");
const Script = require("..");

describe("exports", () => {
  it("exposes module functions", async () => {
    const source = Script("../resources/lib/module");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    const module = await source.exports(context);
    assert.ok(typeof module.default === "function");
    assert.ok(typeof module.justReturn === "function");
  });

  it("that are executable", async () => {
    const source = Script("../resources/lib/module");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    const {justReturn} = await source.exports(context);

    assert.equal(justReturn(1), 1);
  });
});
