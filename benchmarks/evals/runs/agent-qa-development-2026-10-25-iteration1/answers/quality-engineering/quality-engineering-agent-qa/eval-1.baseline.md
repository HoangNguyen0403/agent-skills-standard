Assuming the project’s existing `agent-qa` CLI:

```bash
agent-qa validate tests/checkout.yaml
agent-qa select tests/checkout.yaml --dry-run
```

Success would establish that:

- `tests/checkout.yaml` is syntactically valid and conforms to `agent-qa`’s configuration schema.
- The second command resolves and prints the tests selected by that configuration without running the application or executing the tests.
