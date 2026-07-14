A strict baseline `tsconfig.json` for a modern Node project could be:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "useUnknownInCatchVariables": true,
    "noPropertyAccessFromIndexSignature": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "forceConsistentCasingInFileNames": true,
    "noEmitOnError": true,
    "esModuleInterop": true,
    "skipLibCheck": false
  },
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "node_modules"]
}
```

Adjust `module` and `moduleResolution` to the runtime and package configuration; the important part is that they agree. `strict` enables the main family of strict checks, while the additional flags close common unsoundness gaps. Keep separate configs when tests or build tooling need different settings, and run `tsc --noEmit` in CI so type errors cannot be hidden by a transpile-only tool.
