"use strict";

const assert = require("assert");
const Script = require("..");

describe("package.json exports field", () => {
  it("resolves a bare specifier through the exports map (subpath)", async () => {
    const source = new Script("../resources/exports-only-import.js");

    const context = { window: {} };

    await source.run(context);

    assert.equal(context.window.fixtureValue, "ok");
  });

  it("resolves nested conditions, picking 'import' over 'default'", async () => {
    const source = new Script("../resources/conditions-import.js");

    const context = { window: {} };

    await source.run(context);

    assert.equal(context.window.conditionsValue, "node-import");
  });

  it("rejects subpaths whose exports target is null", async () => {
    const source = new Script("../resources/blocked-import.js");

    await assert.rejects(() => source.run({ window: {} }), (err) => {
      assert.equal(err.code, "ERR_MODULE_NOT_FOUND");
      assert.ok(/blocked/.test(err.message), `expected message to mention specifier, got: ${err.message}`);
      assert.ok(/@fixture\/conditions/.test(err.message), `expected message to mention package, got: ${err.message}`);
      return true;
    });
  });

  it("throws a clear error for an unresolvable bare specifier, naming specifier and importer", async () => {
    const source = new Script("../resources/missing-bare-import.js");

    await assert.rejects(() => source.run({ window: {} }), (err) => {
      assert.equal(err.code, "ERR_MODULE_NOT_FOUND");
      assert.ok(/@fixture\/does-not-exist/.test(err.message), `expected message to mention specifier, got: ${err.message}`);
      assert.ok(/missing-bare-import\.js/.test(err.message), `expected message to mention importer, got: ${err.message}`);
      return true;
    });
  });

  it("still resolves packages that only have main/module/jsnext:main (no exports)", async () => {
    // smqp is one such package — uses module + jsnext:main, no exports field.
    const source = new Script("../resources/static-import.js", { moduleRoute: "/module/" });

    const context = { window: {} };

    await source.run(context);

    assert.ok(context.window.broker, "expected smqp Broker to load via legacy fields");
  });
});
