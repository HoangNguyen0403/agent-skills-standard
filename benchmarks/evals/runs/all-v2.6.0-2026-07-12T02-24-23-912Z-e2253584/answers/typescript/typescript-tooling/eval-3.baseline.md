Do not use `@ts-ignore` as a general fix. It suppresses the diagnostic and can silently hide a real defect, including new diagnostics introduced when the code changes.

First inspect the error and fix the type or control-flow issue. Common fixes include narrowing with a type guard, handling `undefined`, correcting a generic constraint, or updating an inaccurate declaration. If the line is intentionally invalid for a test or a known incompatibility, prefer `@ts-expect-error` with a reason:

```ts
// @ts-expect-error: this test verifies rejection of an invalid role.
assignRole(user, "not-a-role");
```

`@ts-expect-error` fails when the expected error disappears, so it does not become stale silently. Keep suppressions as narrow as possible, require a lint rule or review policy for them, and consider a local declaration fix or a typed adapter when the problem is in a third-party package.
