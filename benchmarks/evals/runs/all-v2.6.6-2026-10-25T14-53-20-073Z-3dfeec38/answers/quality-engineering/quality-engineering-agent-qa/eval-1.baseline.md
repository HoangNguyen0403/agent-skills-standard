Assuming the project’s `agent-qa` CLI provides these subcommands:

```bash
agent-qa validate tests/checkout.yaml
agent-qa select tests/checkout.yaml
```

The first command should succeed without launching the application, establishing that `tests/checkout.yaml` is syntactically valid and conforms to the expected test schema.

The second should print the tests selected by that configuration. Its success establishes the resolved test set, filters, and selection logic—without executing those tests or the application.
