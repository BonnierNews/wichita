Wichita - Tallahassee sidekick
==============================

[![Run tests](https://github.com/BonnierNews/wichita/actions/workflows/run-tests.yml/badge.svg?branch=master)](https://github.com/BonnierNews/wichita/actions/workflows/run-tests.yml)

Run your es6 modules in a sandbox with the experimental `vm.SourceTextModule`.

The following node options are required to run this module
> --experimental-vm-modules --no-warnings

If running tests with mocha you have a couple of alternatives:

```js
// .mocharc.js
module.exports = {
  "node-options": ["experimental-vm-modules", "no-warnings"],
}
```

```bash
NODE_OPTIONS="--experimental-vm-modules --no-warnings" mocha -R dot
```

# Api

Wichita takes one required argument:
- `sourcePath`: required script path, relative from calling file
- `options`: optional vm context options, passed to `vm.createContext`
  - `moduleRoute`: route that will be used when importing modules (optional)
  - `fileCache`: optional Map, file content cache

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
const source = new Script("./resources/main");
await source.run({
  setTimeout() {},
  console,
  window: {},
})
```

Exports:
```js
const source = new Script("./resources/lib/module");
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
const source = new Script("./resources/lib/module");
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
    const source = new Script("./resources/main");

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
    const source = new Script("./resources/main");

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
    const source = new Script("./resources/lib/module");

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
    const source = new Script("./resources/lib/module");

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

# Imports

JSON file import are imported as default:
```js
import data from  "./resources/assets/data.json";
````

is exported as:
```js
export default { content_of_data_json: true };
````

# Tip for Tallahaassee users

To ensure that that console logs from clientside scripts are visibile when running a test with Tallaahaassee+Witchita you should add `browser.window.console = console;` to your `runScript` function

For example:
```
function runScript(name, browser) {
  const file = glob
    .sync("./public/scripts/*")
    .find((f) => !f.includes(".map") && f.includes(name));

  const __dirname = path.resolve();
  const fileResolved = path.resolve(__dirname, file);
  const script = new Script(fileResolved);
  browser.window.console = console; // This is key!
  return script.run(browser.window);
}
```
