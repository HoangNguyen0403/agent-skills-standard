Use ESLint with the TypeScript parser and recommended type-aware rules, and keep compiler checking as a separate CI step. With flat config:

```js
// eslint.config.mjs
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
);
```

Add Prettier and run it through `lint-staged`, use Vitest or Jest for tests, and define CI scripts such as `tsc --noEmit`, `eslint .`, and the test command. Fix violations rather than adding a global `eslint-disable`; use a documented per-line `@ts-expect-error` only for a verified edge case.
