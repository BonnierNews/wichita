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

### Api

Wichita takes one required argument:
- `sourcePath`: relative path from calling file

and returns an api:

- `path`: absolute path to file
- `caller`: absolute path to calling file
- `run(globalContext)`: run function
  - `globalContext`: required object that will be converted into a sandbox
- `execute(globalContext, callback)`: execute module function
  - `globalContext`: required object that will be converted into a sandbox
  - `callback`: function that returns module as argument, `callback(es6module)`

Run script:
```js
const source = Script("./resources/main");
source.run({
  setTimeout() {},
  console,
  window: {},
})
```

Execute module:
```js
const source = Script("./resources/lib/module");
source.execute({
  setTimeout() {},
  console,
  window: {},
}, (module) => {
  module.default(1);
  module.justReturn(2);
})
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

  it("executes module function", async () => {
    const source = Script("./resources/lib/module");

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
```
