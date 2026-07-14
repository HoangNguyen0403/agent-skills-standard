The original `execSync` call is vulnerable because an environment value is interpolated into a shell command. Treat the value as untrusted, validate it against the refs permitted by CI, and use `execFileSync` with an argument array and no shell:

```ts
import { execFileSync } from "node:child_process";

const baseRef = process.env.GITHUB_BASE_REF;
if (!baseRef || !/^[A-Za-z0-9._/-]+$/.test(baseRef) || baseRef.includes("..")) {
  throw new Error("Invalid GITHUB_BASE_REF");
}

const output = execFileSync(
  "git",
  ["diff", "--name-only", "--", `origin/${baseRef}...HEAD`],
  { encoding: "utf8", shell: false },
);
```

An allow-list matching the CI provider's branch/ref format is preferable to a broad character class. Keep the working directory explicit if needed, reject an absent value, and never switch to `shell: true` or string interpolation in `execSync`/`spawnSync`.
