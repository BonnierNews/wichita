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
- `sourcePath`: required script path, relative from calling file
- `options`: optional vm context options, passed to `vm.createContext`
  - `moduleRoute`: route that will be used when importing modules (optional)

and returns an api:

- `path`: absolute path to file
- `caller`: absolute path to calling file
- `run(sandbox)`: run es6 module
  - `sandbox`: required object that will be contextified and used as global context
- `exports(sandbox)`: expose module export functions
  - `sandbox`: required object
- `execute(sandbox, fn)`: execute function
  - `sandbox`: required object
  - `fn`: function that returns module as argument, `fn(es6module)`

Run script:
```js
const source = Script("./resources/main");
await source.run({
  setTimeout() {},
  console,
  window: {},
})
```

Exports:
```js
const source = Script("./resources/lib/module");
const {default: defaultExport, justReturn} = await source.exports({
  setTimeout() {},
  console,
  window: {},
}

defaultExport(1);
justReturn(2);
```

Execute:
```js
const source = Script("./resources/lib/module");
await source.execute({
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
    assert.equal(context.window.count, 1);
    assert.ok(context.window.setByQueue);
  });

  it("and again", async () => {
    const source = Script("./resources/main");

    const context = {
      window: {
        root: true,
        count: 2,
      },
    };
    await source.run(context);

    assert.ok(context.window.broker);
    assert.ok(context.window.setByModule);
    assert.equal(context.window.count, 3);
    assert.ok(context.window.setByQueue);
  });

  it("get module exports", async () => {
    const source = Script("./resources/lib/module");

    const context = {
      window: {
        root: true,
      },
      console,
    };

    const {justReturn} = await source.exports(context);

    assert.equal(justReturn(1), 1);
  });

  it("execute module function", async () => {
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
