Changelog
=========

# Unreleased

- Resolve bare specifiers through `package.json` `exports` maps, including nested condition objects (`import`/`default`/`node`), arrays, and `null` "not exported" targets. Existing packages that only have `main`/`module`/`jsnext:main` keep resolving via the legacy path.
- Stop swallowing bare-specifier resolution errors. Unresolvable specifiers now throw `ERR_MODULE_NOT_FOUND` naming the specifier and the importing file, instead of silently falling through to a relative-path lookup that ENOENTs at read time.
- lint some
- upgrade dev dependencies

# 1.1.0

- Add optional fileCache option to cache source module content between runs

# 1.0.0

## Breaking
- Drop support for node below 14

## Fixes
- Support Windows
