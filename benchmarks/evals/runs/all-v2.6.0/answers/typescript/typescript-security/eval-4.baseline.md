Do not interpolate an untrusted environment variable into a shell command. Validate the value as a Git ref and use an argument-based API that does not invoke a shell:

```ts
import { execFileSync } from "node:child_process";

const baseRef = process.env.GITHUB_BASE_REF;
if (!baseRef || !/^[A-Za-z0-9._/-]+$/.test(baseRef) || baseRef.includes("..")) {
  throw new Error("Invalid GITHUB_BASE_REF");
}

const diffRange = `origin/${baseRef}...HEAD`;
const output = execFileSync(
  "git",
  ["diff", "--name-only", "--", diffRange],
  { encoding: "utf8", shell: false },
);
```

The allow-list should match the refs CI actually permits; rejecting empty values and unexpected metacharacters is defense in depth. Pin the working directory if necessary, avoid `shell: true`, and treat the environment as untrusted even when it is normally populated by the CI provider.
