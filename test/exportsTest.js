"use strict";

const assert = require("assert");
const Script = require("..");
const {join} = require("path");

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

  it("exposes json as default object", async () => {
    const source = Script("../resources/assets/data.json");

    const context = {};

    const module = await source.exports(context);
    assert.ok(typeof module.default === "object");
    assert.deepEqual(module.default, {
      data: {
        list: ["item 1"]
      }
    });
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

  it("throws if trying to get exports of a folder", async () => {
    const source = Script("../resources");

    const context = {
      window: {
        root: true,
      },
    };

    try {
      await source.exports(context);
    } catch (e) {
      var error = e; //eslint-disable-line no-var
    }

    assert.ok(error);
    assert.equal(error.code, "ENOENT");
  });

  it("rejects if trying to get exports of a folder", async () => {
    const source = Script("../resources");

    const context = {
      window: {
        root: true,
      },
    };

    return assert.rejects(() => source.exports(context), {
      code: "ENOENT",
      path: join(__dirname, "../resources.js")
    });
  });
});
