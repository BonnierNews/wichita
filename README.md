Wichita - Tallahassee sidekick
==============================

[![Build Status](https://travis-ci.org/BonnierNews/wichita.svg?branch=master)](https://travis-ci.org/BonnierNews/wichita)

Run your es6 modules in a sandbox with the experimental `vm.SourceTextModule`.

The following node options are required to run this module
> --experimental-vm-modules --no-warnings

If running tests with mocha you can preceed the mocha call with `NODE_OPTIONS`, e.g.:
```bash
NODE_OPTIONS="--experimental-vm-modules --no-warnings" mocha -R dot
```

### Example

```js
"use strict";

const Script = require("@bonniernews/wichita");
const assert = require("assert");

describe("script", () => {
  it("executes scripts in passed context", async () => {
    const source = Script("./resources/main");

    const context = {
      window: {
        root: true,
      },
    };
    await source.run(context);

    assert.ok(context.window.broker);
    assert.ok(context.window.setByModule);
    assert.equal(context.window.count, 2);
    assert.ok(context.window.setByQueue);
  });

  it("and again", async () => {
    const source = Script("./resources/main");

    const context = {
      window: {
        root: true,
      },
    };
    await source.run(context);

    assert.ok(context.window.broker);
    assert.ok(context.window.setByModule);
    assert.equal(context.window.count, 2);
    assert.ok(context.window.setByQueue);
  });
});
```
