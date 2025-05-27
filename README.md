# ESLint 9 Upgrade

This PR upgrades ESLint from v8 to v9, which introduces a new flat config system.

## Changes Made

1. Added `@eslint/eslintrc` dependency to provide compatibility with the old config format
2. Created a new `eslint.config.js` file that uses `FlatCompat` to migrate the existing configuration
3. Set `"type": "module"` in package.json to support ESM imports in the config file
4. Moved ignore patterns from `.eslintrc.js` to the `ignores` property in the flat config

## Implementation Details

ESLint 9 no longer supports the `.eslintrc.js` format by default and requires a new flat config system. However, some dependencies like `eslint-config-airbnb` don't yet support the new format.

To solve this, we're using the `@eslint/eslintrc` package's `FlatCompat` utility, which allows us to use the old config format with the new ESLint version. This is a recommended workaround until all dependencies support the flat config system.

## Testing

All linting commands should work as before:

```bash
npm run lint
npm run eslint
```

## References

- [ESLint 9 Migration Guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [ESLint Flat Config Migration Guide](https://eslint.org/docs/latest/use/configure/migration-guide)
- [eslint-config-airbnb issue about flat config support](https://github.com/airbnb/javascript/issues/2804)