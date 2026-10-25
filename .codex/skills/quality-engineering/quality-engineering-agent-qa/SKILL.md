---
name: quality-engineering-agent-qa
guardrail: true
description: 'Standardizes agent-qa test selection, YAML validation, dry runs, regression execution, verdict triage, and memidex evidence inspection. Use when the project uses agent-qa or the user selects it, including incomplete runs and self-healing review. Keep ordinary Playwright/Appium driving, unit tests, and generic YAML editing in their existing skills. (triggers: agent-qa, agent-qa.config.yaml, memidex, agent-qa run evidence)'
metadata:
  triggers:
    files:
      - '**/agent-qa.config.yaml'
    keywords:
      - agent-qa
      - memidex
      - agent-qa run evidence
---

# agent-qa regression evidence

## **Priority: P1 (HIGH)**

## Goal

Validate and execute selected agent-qa regressions, then report outcomes from recorded evidence, using its advanced memidex memory and self-improvement capabilities.

## Steps

1. **Scope**: Locate the existing configuration, selected test or suite, target, and installed version. Require Node.js 24+. Record the version separately, never as a subcommand. Keep provider, account, and machine details in host-local records. Read [commands](references/commands.md) before execution.
2. **Select**: Validate the selected YAML, then use `run <selected-path> --dry-run`. Confirm the selection; an omitted path runs all tests. Validation and dry runs establish structure and selection, never application success. Honor dry-run-only requests.
3. **Execute**: Run only the selected flow against the authorized target and data. Preserve the command, exit status, run ID, and actual report paths. Model usage may incur costs and application actions may change data.
4. **Classify**: Exit `0` means passed or healed; `1` also covers missing required files, besides failed or timed-out tests; `2` means agent-qa could not run; `130` means cancelled. Inspect the diagnostic and verdict before assigning an application failure. Missing files or provider/device failures leave execution unresolved.
5. **Inspect**: Read `runs overview <runId> --json` and `runs knowledge <runId> --json`. An empty failed-run list is not a passing verdict. Missing completed verdicts or `evidence-incomplete` leave the outcome unresolved. Use `knowledge inspect --json` for current memory records; never infer current trust from raw files.
6. **Separate healing contracts**: Report agent-qa's native `healed` verdict as such. Registry `HEALED` additionally requires three consecutive green reruns and `ASSERTION_DELTA: none` under [test-healing](../quality-engineering-test-healing/SKILL.md). Preserve assertions; do not equate native healing with registry signoff.
7. **Correct and report**: Distinguish application, expectation, and environment failures using the failed step and evidence. Rerun the selected flow after a justified correction; stop repeating unchanged failures. Record what remains unverified and redact secrets or sensitive application data.

## Red flags

- **"Dry run passed, ship it"**: Report selection validation only; application behavior remains unverified.
- **"No failures listed means success"**: Inspect the relevant run's completed verdict before reporting an outcome.
- **"Exit zero means registry HEALED"**: Check native verdict, three green reruns, and unchanged assertions separately.

## Anti-patterns

- **No memory deletion to obtain green CI**: Preserve memidex evidence; inspect the cause of incomplete or failing runs.
- **No weakened assertions for registry healing**: A changed assertion fails `ASSERTION_DELTA: none`; route the expectation change for review instead of granting `HEALED`.

## Output

### Scope and version

### Commands and exit status

### Run ID and native verdict

### Evidence and report paths

### Registry healing evidence

### Unresolved checks and next action
