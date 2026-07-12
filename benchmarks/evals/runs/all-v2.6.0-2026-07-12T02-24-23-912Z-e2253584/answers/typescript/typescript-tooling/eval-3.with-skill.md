Do not use `@ts-ignore`: it hides an error unconditionally and does not fail when the underlying error disappears. First inspect the diagnostic and fix the type, narrowing, generic constraint, or API declaration causing it. For example:

```ts
function formatId(value: string | undefined): string {
  if (value === undefined) {
    throw new Error("id is required");
  }
  return value;
}
```

If a genuine, unavoidable third-party typing defect remains, use `@ts-expect-error` on the smallest line with a comment explaining the known issue; it becomes an error when no diagnostic is produced. Run the language diagnostics fallback plus `tsc --noEmit`, and do not disable strict checking or use `any` to mask the problem.
