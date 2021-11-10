"use strict";

const Script = require("../..");
const assert = require("assert");

describe("relative path", () => {
  it("executes scripts from relative path", async () => {
    const source = new Script("../../resources/main");

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
});
