Assuming the installed CLI is available as `agent-qa`:

```bash
node --version
agent-qa --version
agent-qa validate tests/checkout.yaml
agent-qa run tests/checkout.yaml --dry-run
```

Success establishes:

- `node --version`: Node.js meets the required version (24+).
- `validate`: `tests/checkout.yaml` is structurally valid.
- `run ... --dry-run`: shows exactly which tests/suites the YAML selects and confirms the selection can be resolved.

Because this is a dry run, it does not execute the application and does not establish application behavior or test-pass status.
