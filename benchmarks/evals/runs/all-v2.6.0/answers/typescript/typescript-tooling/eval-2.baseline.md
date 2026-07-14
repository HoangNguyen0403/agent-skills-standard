Use the TypeScript-aware ESLint flat config and keep type-aware rules limited to files where the project can provide a parser project:

```ts
// eslint.config.mjs
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error"
    }
  },
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"]
  }
);
```

Install `eslint`, `@eslint/js`, `typescript`, and `typescript-eslint`, then add a lint script such as `eslint .`. Choose rules that reflect the codebase and fix or explicitly review warnings; do not disable type-aware rules globally just to make CI pass. If using a formatter, run it separately or use a compatible ESLint integration without making formatting the only quality check.
