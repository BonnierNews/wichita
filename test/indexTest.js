"use strict";

const Script = require("..");
const assert = require("assert");

describe("script", () => {
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
});
