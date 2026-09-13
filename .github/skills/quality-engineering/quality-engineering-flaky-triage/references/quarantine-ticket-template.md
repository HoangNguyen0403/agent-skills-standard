# Quarantine Ticket Template

One ticket per quarantined test. The ticket key goes into `flake_quarantine[]` and into the test's quarantine annotation or registry entry (`quarantine.json`, tag, or the framework's equivalent), never into a `test.skip`.

```md
# Quarantine: [test id or title]

- Suite / file: [path]
- First seen: [date, CI run link]
- Owner: [person]
- Expiry: [date, at most 14 days from opening]
- Bucket: ORDER_DEPENDENCE | SHARED_STATE | TIMING | ENVIRONMENT | DATA | PRODUCT_NONDETERMINISM | UNKNOWN

## Evidence
- Isolated reruns: [passes]/10 sequential foreground runs
- Failing artifact: [trace / screenshot / log link]
- Reproduces on fresh environment: yes | no
- Last code change touching this test or its subject: [commit]

## Root cause
[one paragraph, or "not yet known: tried ..."]

## Exit plan
- Fix: [what changes]
- Un-quarantine criterion: 10 consecutive isolated green runs after the fix
- If not fixed by expiry: extend once with reason | delete and record coverage gap in the coverage report
```

Framework annotations that keep the test running while not gating merge:

| Tool | Annotation |
| --- | --- |
| Playwright | `test.fixme` is forbidden; use a project tag `@quarantine` and a CI job that runs tagged tests without failing the pipeline |
| Jest / Vitest | a `quarantine.json` list read by a custom reporter that reports but does not fail |
| XCUITest / Espresso | a separate test plan / Gradle task for quarantined classes |
| Maestro / Detox | a `quarantine` flow folder run in a non-blocking job |
