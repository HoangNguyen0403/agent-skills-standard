Assuming `agent-qa` is available on `PATH`:

```bash
node --version
agent-qa --version
agent-qa validate tests/checkout.yaml
agent-qa run tests/checkout.yaml --dry-run
```

Success would establish:

- `node --version`: Node.js 24+ is available.
- `agent-qa --version`: the installed agent-qa CLI is discoverable.
- `validate`: `tests/checkout.yaml` is structurally valid.
- `run ... --dry-run`: agent-qa resolves and displays the tests selected by that YAML.

A successful validation or dry run does not execute the application and does not establish that the selected tests pass.
