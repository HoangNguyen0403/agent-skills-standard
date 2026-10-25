Assuming the installed CLI is `agent-qa`:

```sh
node --version
agent-qa --version
agent-qa validate tests/checkout.yaml
agent-qa run tests/checkout.yaml --dry-run
```

If the binary is only available through the project package manager, prefix the last two commands with `npx` or `npm exec --`.

A successful validation (`exit 0`) establishes that `tests/checkout.yaml` is syntactically and structurally valid for agent-qa.

A successful dry run (`exit 0`) establishes which tests the file selects and that agent-qa can resolve that selection. It does not start the application, execute tests, validate application behavior, or produce regression evidence.
