# Agent Skills Standard — Repository Verification Kit

Source-derived, project-owned operational kit for verifying this repository's *local*
CLI/API consumer surfaces. It binds each journey to the identity of the bytes it
actually consumes, drives real entrypoints in disposable state, and persists raw
evidence before any cleanup.

## Declared boundary (no over-claim)

- **Exercised surfaces**: the repository CLIs `scripts/trace/index.ts` and
  `scripts/outcome/index.ts`, the production library exports `SyncService`,
  `LockfileService`, `WorkflowTransformer`, `ConfigService`, `WorkflowIndex`, and
  the repository CLI `doctor --offline --json`.
- **Not claimed**: native provider/model invocation, model compliance or efficacy,
  registry/network acquisition, remote targets, credentials, release, deployment,
  merge, or human acceptance. Technical proof, acceptance, and release authority
  stay separate; a missing human gate is never a PASS.

## Identity

- **Source revision**: `1c79a7edb22b768ad5362e2e10766df2978e8642`
- **Dirty identity**: `docs/prd/prd-pstack-verification-readiness.md:bd7e4536a3e5409a34a176073229993122ff2d2dd4f156d2455fcf19bf34b425;docs/srs/srs-pstack-verification-readiness.md:887bc7d3244cca1072c2a18382f0c65378cfd5434390bcd17b23b6a4d9caa1fe`
- **Node**: `>= 22.0.0` (native `Promise.withResolvers`). Node 22+ is required; there is
  no fallback shim, so an older runtime is a hard refusal.
- **Build mode**: TypeScript sources executed through the resolved `tsx` loader; this
  repository produces no compiled kit artifacts.

The doctor records the full identity payload: runtime (Node executable/version, loader
path + digest + version), dependency identity (resolved version of every dependency the
journeys load), canonical PRD/SRS digests, every declared consumed product input digest,
recipe digests, harness digests, git HEAD, and the scoped git status of that basis.
A change to the canonical PRD/SRS digests makes the doctor unhealthy: unchanged criteria
are a precondition for any proof.

## Layout

| Path | Role |
| --- | --- |
| `kit.json` | Kit manifest: source revision, canonical inputs, journey→recipe mapping, evidence location |
| `recipes/cli-policy.json` | CLI invocation policy consumed by `JRN-TRACE-01` and `JRN-OUTCOME-01` only |
| `recipes/trace-audit.json` | `JRN-TRACE-01` recipe: entrypoint, consumed inputs, command scenarios, oracles |
| `recipes/outcome-audit.json` | `JRN-OUTCOME-01` recipe (same shape) |
| `recipes/consumer-sync.json` | `JRN-CONSUMER-01` recipe: skill/workflow selection, expected lock and doctor oracles |
| `scripts/doctor.ts` | Read-only readiness oracle; exits 0 healthy / 1 unhealthy |
| `scripts/run-verification.ts` | Single operational runner: gate, journeys, discrepancies, freshness, retention |
| `features/` | Per-journey maps and negative scenarios |

Recipes are *consumed at runtime*: the runner reads the command arguments from the recipe
files, so editing a recipe is a real input change, which is how drift and freshness are
exercised rather than simulated.

## Entrypoints

```bash
# Read-only readiness report (never mutates)
node --import tsx docs/verification/agent-skills-standard/scripts/doctor.ts

# Provenance of the same check against another root (used only for the refusal proof)
node --import tsx docs/verification/agent-skills-standard/scripts/doctor.ts --repo-root <dir>

# Full run — authorized ONLY after the parent releases RUN
node --import tsx docs/verification/agent-skills-standard/scripts/run-verification.ts --run

# Refusal proof: owned recipe declares a missing driver, gate must refuse, recipe restored
node --import tsx docs/verification/agent-skills-standard/scripts/run-verification.ts --refusal-probe
```

`--run` refuses (exit 3) before driving anything when the doctor is unhealthy.

Exit codes: `0` proof complete, `1` a technical check failed, `2` every executed check
passed but scoped items remain unexercised/manual, `3` refused.

## Lifecycle

1. **Discover/reuse** — before authoring anything, search for an equivalent kit; changes
   to this kit must not duplicate another harness.
2. **Doctor** — read-only; checks runtime, build manifests, dependency resolution,
   canonical digests, declared inputs, entrypoints, harness bytes, and scoped git state.
3. **Gate** — `guardDrive(doctor)` is the only drive gate; refusal is the same code path
   used by `--run` and by `--refusal-probe`.
4. **Drive** — real CLI spawns (detached process group, bounded timeout) and real
   production API calls in a uniquely created OS temp consumer.
5. **Capture** — every action records argv, cwd, exit code, raw stdout/stderr, parsed
   JSON, fixture bodies, and digests. Artifacts and receipts are written **before** any
   owned temp state is removed, then re-read and compared byte-for-byte.
6. **Cleanup** — only directories whose basename starts with
   `ags-verification-consumer-` or `ags-verification-scratch-`. No port, no broad
   process kill, no deletion of user resources or prior evidence.

## Evidence

`artifacts/verification/agent-skills-standard/<mode>-<status>-<stamp>.json` holds the run
envelope (`doctor`, `gate`, `state_identity`, `fixtures`, `actions`, `checks`,
`decisions`, `error`). The sibling `.receipt.json` records the pre/post artifact digests,
what cleanup removed, check counts, and failures. The artifact is never rewritten by the
receipt.

## Honest statuses

Check outcomes are `pass | fail | blocked | unexercised | manual_decision`. Only `pass`
and `fail` come from executing a declared action. Specifically:

- a missing explicit reference/driver is a real process error, scoped to an owner; it is
  never a silent fallback;
- a product regression branch with no observed defect stays `UNEXERCISED`, not `pass`;
- freshness dispositions are recorded `pending-manual-owner`; this kit does not accept a
  freshness or acceptance decision on the owner's behalf.
