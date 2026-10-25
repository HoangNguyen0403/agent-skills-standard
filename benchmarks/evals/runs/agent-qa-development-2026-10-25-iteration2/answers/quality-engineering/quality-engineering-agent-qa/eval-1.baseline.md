Assuming the project’s `agent-qa` CLI exposes standard validation and dry-run selection commands:

```bash
agent-qa validate tests/checkout.yaml
agent-qa run tests/checkout.yaml --dry-run
```

Success would establish that:

- `validate` confirms the YAML is syntactically valid and conforms to the expected `agent-qa` schema.
- `run --dry-run` resolves selectors and prints the tests that would run without starting the application or executing test actions.

If the project uses an npm-local CLI, use `npx agent-qa` in place of `agent-qa`.
