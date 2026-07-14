Empty `catch` blocks hide failures. Replace each with one of these intentional behaviors:

```ts
try {
  await operation();
} catch (error) {
  logger.error({ error }, "Operation failed");
  throw error; // propagate when the caller must handle it
}
```

If you can recover:

```ts
try {
  return await loadData();
} catch (error) {
  logger.warn({ error }, "Using fallback data");
  return defaultData;
}
```

If ignoring is genuinely correct, document why and avoid an unused-variable warning:

```ts
try {
  await removeOptionalFile();
} catch {
  // Intentionally ignored: the file may already be absent.
}
```

Do not silently swallow unexpected errors; preserve the original error when rethrowing.
