# agent-qa command reference

Use the project's installed version and package manager. These npm examples use
`--no-install` to avoid downloading another version. Replace `tests/checkout.yaml`
with the selected test; run from the project directory. A global
`--config <path>` goes before the command. Check installed help for suite selection
or mobile overrides; preserve existing configuration.

```sh
npx --no-install agent-qa --version
npx --no-install agent-qa run --help
npx --no-install agent-qa validate tests/checkout.yaml
npx --no-install agent-qa run tests/checkout.yaml --dry-run
```

Validation and selection do not execute the application. If execution is authorized:

```sh
npx --no-install agent-qa run tests/checkout.yaml --junit-output results.xml
```

Capture the command's actual exit status immediately. Report a JUnit path only when
the file exists; a dry run does not prove report generation. Exit `0` includes
native passed and healed verdicts. Exit `1` includes failures, timeouts, and missing
required files; `2` means execution could not proceed; `130` means cancelled.
Inspect diagnostics to separate setup problems from application outcomes.

Replace `RUN_ID` with the relevant recorded run ID:

```sh
npx --no-install agent-qa runs list --limit 10 --json
npx --no-install agent-qa runs overview RUN_ID --json
npx --no-install agent-qa runs knowledge RUN_ID --json
npx --no-install agent-qa knowledge inspect --json
```

`runs list --verdict failed --json` lists only failed runs; an empty result does
not establish a pass. A run without a completed verdict, or a knowledge result
marked `evidence-incomplete`, needs further evidence. Keep the run ID and diagnostic.
Read memory through agent-qa so current status and trust are applied. Memory
inspection is distinct from accepting, rejecting, forgetting, or rolling back records.

If agent-qa is absent, follow the official quickstart with the user's selected
provider. It requires Node.js 24+. `doctor` may contact the configured provider.
Do not silently install or switch providers to satisfy a verification request.

## Sources and scope

- [Quickstart](https://vostride.com/docs/agent-qa/quickstart)
- [CLI reference](https://vostride.com/docs/agent-qa/cli)
- [CI exit codes](https://vostride.com/docs/agent-qa/guides/ci)
- [memidex inspection](https://vostride.com/docs/agent-qa/memory/inspect)
- [agent-qa source](https://github.com/vostride/agent-qa)

Command behavior was checked against agent-qa 0.2.3 using isolated validation,
dry-run, missing-file, and incomplete-evidence fixtures. These checks do not
establish live application execution, provider connectivity, JUnit generation,
or successful completed-run triage. Verify installed help when versions differ.

These original instructions use the registry's MIT license. The separately
installed agent-qa package uses FSL-1.1-ALv2; providers have their own costs and terms.
