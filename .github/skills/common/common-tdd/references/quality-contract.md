# Quality Contract

## Test Intent Record

Record one record before each behavior/risk group. Serialized representations in evidence bundles and documentation describe the same record:

| Field | Required evidence |
| --- | --- |
| `id` | Unique stable intent identifier |
| `requirements` | Nonempty array of traceable requirement IDs |
| `owner` | Accountable human maintainer or agent identity |
| `contract` | Observable result or side effect owned by the application |
| `fault` | Plausible regression this test catches; risk-sensitive, not blanket quota |
| `layer` | Smallest honest layer (`unit`, `integration`, `contract`, `e2e`); preserve justified cross-layer tests |
| `cases` | Minimal distinct equivalence classes; merge equivalent inputs |
| `command` | Exact focused, single-run command |
| `oracle` | Object `{ ref: { path, sha256 }, basis, owner, rationale }` where basis is `approved_requirement`, `external_specification`, or `independently_reviewed_example`. Implementation-copied expected output is unacceptable |
| `boundaries` | Object `{ real: string[], mocked: string[], justification: string }` documenting boundary realism |

The record is an agent handoff and evidence artifact, not a comment requirement inside test code.

### Serialized Contract (JSON)

Illustrative shape only matching SRS §4.1 `Intent` schema. The `sha256` digest below is illustrative placeholder documentation, not actual oracle evidence, and must be replaced with the exact raw-byte SHA-256 digest of the actual approved artifact before validation:
```json
{
  "id": "INTENT-CLI-FLAG-01",
  "requirements": ["REQ-03", "AC-08"],
  "owner": "maintainer-core",
  "contract": "Unrecognized CLI flag returns exit 2 with invalid_usage diagnostic",
  "fault": "Flag parser silently ignores unknown flags and proceeds with defaults",
  "layer": "unit",
  "cases": ["unknown flag --unknown", "unknown short flag -z"],
  "command": "rtk proxy go test -run TestFlags ./pkg/engine",
  "oracle": {
    "ref": { "path": "docs/specs/cli.md", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" },
    "basis": "external_specification",
    "owner": "spec-maintainer",
    "rationale": "SRS §3.2 table specifies invalid_usage diagnostic and exit 2"
  },
  "boundaries": {
    "real": ["pkg/engine/flags.go"],
    "mocked": [],
    "justification": "Pure in-process flag parsing requires no mocked dependencies"
  }
}
```

## Evidence Consistency & Trust Limits

- **Local-untrusted evidence:** Evidence receipts and SHA-256 digests bind supplied byte content against referenced artifacts. They verify local structural consistency, not execution authenticity or agent trustworthiness.
- **Human review obligation:** Hashes cannot prove semantic independence of an oracle or validity of boundary justifications. A human reviewer remains necessary to confirm that the oracle is not copied from implementation output.
- **No fabricated oracles:** `oracle.ref` must point to an existing requirement, specification, or independently reviewed example artifact. Expected output copied solely from implementation output is unacceptable.

## Risk-Sensitive Fault Evidence

- **Plausible faults over blanket metrics:** Focus tests on distinct, plausible failure modes (boundary transitions, domain constraints, error paths). Do not use blanket mutation score quotas (e.g. arbitrary 80% thresholds) or test count targets as quality proxies; they incentivize brittle tests asserting incidental internal details.
- **Preserve justified cross-layer tests:** When integration, contract, or E2E layers catch failure modes that unit tests cannot observe (such as real serialization, protocol negotiation, race conditions, or environment boundaries), retain them. Do not force artificial layer collapse or mock away the very boundary being tested.

## Admission checks

- Before proposing a new test, compare against the existing suite; discard if the behavior and fault are already covered by nearby or upstream tests.
- For existing tests: never auto-delete on apparent static duplication alone. Recommending deletion requires proof of no unique behavioral contribution plus measured full-suite dynamic coverage/mutation impact; otherwise suggest review or refactoring.
- Keep a case only when it detects a distinct fault, boundary, or contract rule.
- Preserve justified cross-layer coverage: if a unit test tests logic and an integration test tests wire protocol with real serialization, both are justified because they guard against different plausible faults.
- Prefer public behavior and state transitions over private methods, call counts, or mock existence.
- Verify one logical contract per test; multiple assertions are allowed when verifying related aspects or outward side effects of that single contract.
- Distinguish outward side effects from internal mock choreography: verify what the system produces or changes externally, not how collaborators are invoked internally.
- Coverage percentages and mutation quotas are diagnostic rather than admission gates; never write padding tests to hit an arbitrary target.
- The Four Pillars (Protection against Regressions, Resistance to Refactoring, Fast Feedback, Maintainability) provide a qualitative reasoning framework, not a static numeric score (avoid inventing formulas like $P \times R \times F \times M$ per test without rigorous empirical measurement across all four dimensions).
- Route cross-component behavior to integration/contract tests. Do not label a mock-heavy orchestration test as a unit test.
- Use deterministic fixtures, explicit cleanup, and stable clocks/data. A test that passes only in one order is not evidence.

## RED taxonomy

| Status | Meaning | Next action |
| --- | --- | --- |
| `expected_red` | Owned behavioral assertion executed and failed before implementation | Implement the smallest fix |
| `frozen_snapshot_red` | Regression verified against frozen pre-repair source snapshot; not original pre-implementation RED | Implement or integrate fix |
| `not_run` | Tests written after implementation; original RED was not observed | Report honestly as NOT RUN; do not manufacture fake RED |
| `invalid_red` | Import, syntax, fixture, mock, or environment defect (setup failure is not behavioral RED) | Repair test setup; do not change production |
| `unexpected_green` | Behavior already exists or test is redundant | Inspect existing coverage and revise/remove case |
| `verification_infra_failed` | Runner missing, timeout, or orphaned process | Stop, clean owned processes, report exact command/error |
## Escalation ladder

1. Lint/type preflight when configured.
2. One focused test target, foreground and sequential.
3. Related unit file/package after the slice is green.
4. Integration/contract target only when the changed boundary requires it.
5. Full suite only for an explicit repository or release gate.
Use the repository timeout when present; otherwise use 120 seconds for a focused command. Never retry without a changed hypothesis. Never use a broad `pkill`; terminate only the process group created for the command and verify it is gone.

## Layered Acceptance Protocol

Acceptance separates five independently tracked delivery layers whose applicability is governed by the approved task/release scope:
1. **Source-Ready:** Complete owned source delivered at a known source/build identity (`git rev-parse HEAD` + dirty identity). Build, lint, and typecheck check statuses are explicitly and independently recorded (`PASS`, `FAIL`, `NOT RUN`, or `NOT APPLICABLE` with scope reasons). Source-ready means source handoff is complete; it does NOT imply unexecuted checks have passed.
2. **Focused Checks:** Unit, component, or contract test targets covering the owned slice. Test count and membership derived directly from raw runner output. Reject early zero-exit completions and no-listener runs. Unit test iterations satisfy focused checks; they do not require universal human sign-off per test.
3. **Consumer-Smoke:** Actual producer-to-consumer integration verifying outward side effects through real entry points (not mock echoes or synthetic renderer stubs). Required where task scope touches service boundaries, consumer contracts, or cross-component flows.
4. **Independent Review:** Independent task review checking specification compliance, code quality, boundaries, and security. Required per task or slice gate in structured plans.
5. **Human Acceptance:** Explicit sign-off by human partner or authorized business operator. Required for product milestones, external releases, or gated deployments. Where required, remains pending until an authorized human acts; agents cannot provide it.

Each applicable layer requires: source/build identity, actual entrypoint/assertion, and result artifact. Inapplicable layers are recorded as `NOT APPLICABLE` with scope reasons, never marked `PASS` or silently dropped.
## Runner Output Parsing & Rejection Rules

- **Derive Count and Membership from Output:** Test suite membership and test count must be derived directly from raw runner output. Never accept summary exit status or generic success banners alone.
- **Reject Early Zero-Exit Completions:** If a command exits with code 0 before assertions execute (e.g. background process terminates immediately, or test runner exits before running tests), reject as incomplete verification.
- **Reject No-Listener Runs:** If a test runner or probe executes 0 tests or listeners fail to bind, reject completion.
- **Actual Producer→Consumer Proof:** Verification must exercise the actual producer-to-consumer path and verify outward side effects, not mock choreography.
- **Invalidation on Later Edits:** If source files are modified after focused checks or consumer smoke, only affected gates are invalidated and must be rerun on the final source revision; unrelated previous gates remain valid.
