# T1 independent technical review — final

## Verdict

**Spec compliance: PASS. Design quality: approved for design-contract freeze (`design_ready`). No unresolved material findings remain in the reviewed scope.** Both original findings are closed by the corrected immutable snapshot. This is proposed-design approval only, not implementation acceptance, trusted execution, pilot authorization, rollout approval or release approval.

- Final target: `.agent/sdd/ai-test-assurance/T1-corrected-review.md`.
- Recorded SRS SHA-256: `670ac1418a6ac3b0b50d6a05cf1dbd72c8d5e54091574df30b0e29199a5c29d5` (snapshot lines 11–12; supplied identity, not independently recomputed).
- Original target: `T1-design-review.md`, recorded SRS SHA-256 `4997929e634dceed9266b911a637dd24cab0d03d8174fc0e6aacaa78b77a1014`.
- Requirements: `T1-brief.md`, `docs/prd/prd-ai-test-assurance.md`. Final rereview limited to R1/R2, per orchestrator; unchanged initial-review conclusions carried forward.
- Profile: technical; lifecycle: proposed; evidence_kind: document; evidence_confidence: documented. Maintainer-supplied local structured text, not active content. Fact sheet confirmed by orchestrator; no further extraction gate pending.

## Findings and closure

### R1 — [MAJOR, CLOSED] Variant-manifest wire format was incomplete

Original evidence: original snapshot lines 174–180, 187, 209, 245. T5 consumes the manifest; T7-E produces it.

**Why:** Previously an array consumer and an object producer could both satisfy prose while choosing incompatible wire shapes, contrary to the shared-format freeze boundary.

**Correction verified:** corrected snapshot lines 187–196 now define exactly:

```ts
type VariantManifest = {
  schema_version: 1;
  changes: { path: string; before_sha256: string | null; after_sha256: string | null }[];
};
```

Unknown keys at both levels and unknown versions are rejected. Changes are nonempty, sorted and unique; paths remain within unchanged approved source roots and obey §6. Digests are strict lowercase SHA-256 or null; both-null and equal sides are prohibited. Before/after values must exactly match baseline/challenge inventories, including null for absence. The list equals the complete source inventory difference, without omissions or extras. Tests/config/dependencies, source roots, repository ID and baseline commit cannot change; all other source files match. The manifest is data, never an executable patch.

**Result:** one explicit strict producer/consumer interface; no remaining R1 design blocker. Actual validator implementation remains a later acceptance gate.

### R2 — [MAJOR, CLOSED] Historical drift versus evidence invalidity was ambiguous

Original evidence: original snapshot lines 187–191, 205, 215, 236, 244–246, 294–295.

**Why:** Generic missing-file invalidity could incorrectly override historical deletion staleness or cause faulty-source inventories to be checked against correct-tree bytes.

**Correction verified:** corrected snapshot lines 200, 245, 255 and 303–304 explicitly distinguish:

| Condition | Specified outcome |
| --- | --- |
| Historical source/test/dependency/config modification, addition or deletion | stale; satisfied=false; exit 1 |
| Previously selected historical input/root disappears | stale; exit 1, not a captured-output I/O error |
| Structurally valid caller current inventory differs from actual readable tree, including a missing inventoried input/root | stale; exit 1, including declared-only requests |
| Missing caller current.json or repository root | invalid; exit 2 |
| Malformed schema, unsafe paths, unreadable inputs, missing/tampered captured evidence | invalid; exit 2 |
| Invalidity and staleness together | invalid takes precedence; exit 2 |
| Faulty-source challenge | consistency against baseline plus variant map, not equality to correct-worktree source bytes |

The current-inventory-mismatch classification above is the orchestrator-confirmed intended policy and supersedes the original review's narrower suggested invalidity treatment for that case. No Git command, trust upgrade, hash-only evidence refresh or receipt-command execution is introduced.

**Result:** deterministic freshness/invalidity precedence; no remaining R2 design blocker.

## T1 acceptance and confirmed flow

| Criterion | Result / documentary basis |
| --- | --- |
| T1-1: scan contract | PASS. §3 specifies envelope/version, count populations, complete/incomplete/empty/unsupported states, reporter-independent exits and findings retention. Partial plus blockers exits 2; unsupported remains 2 with allow-empty; genuinely allowed empty exits 3; complete blockers 1; complete no blockers 0. JSON stdout, stderr/write failures and breaking 0.2 consumer migration are explicit. |
| T1-2: bounded local evidence | PASS. §4–6 define intent/oracle/identity/output bindings, strict paths/limits, local-untrusted semantics, freshness and named-fault classification. R1/R2 corrections close the material interface ambiguities. |
| T1-3: ownership/verification | PASS. §7 lists canonical/generated ownership and executable downstream verification. T2→T3 engine handoff is serialized; T4/T5/T6 have disjoint ownership; T8 owns package/docs/generated export migration after settlement. External consumers remain unknown, not claimed migrated. |
| T1-4: generator/evaluator separation | PASS. §8 specifies isolated arm inputs/filesystems, held-out exclusions, frozen suites, separate strata/denominators and independent pilot authority without actual held-out fault contents. |

Confirmed documentary flow: caller → TestGuard report/exit; caller-selected bundle/current/repository roots → AGS validator → separate assurance dimensions; correct baseline + frozen suite + source-only challenge + oracle/adjudication → local named-fault claim. Trace remains document-only, never execution assurance. Build/setup/timeout/unrelated assertion is not a behavioral kill. No attestation claim is made.

Security: proposed mechanisms prohibit unsafe embedded paths/symlinks, command execution and network reads; bound inputs/artifacts and reject unknown schemas/keys. No demonstrated injection, secret disclosure or authorization bypass found in this design. Implementation must enforce the stated mechanisms; documentation is not proof of host isolation or execution.

Normalized diagram: absent/not required; prose and tables are sufficient. Unknown/not asserted: actual corpus, measured runtime/precision, trusted runner, enforced generator isolation or production effectiveness. No runtime evidence is demanded at this design gate.

## Design scorecard

Local synchronous developer tooling; equal weighting of applicable axes. Documentary design assessment, not operational readiness.

| Axis | Score | Basis |
| --- | --- | --- |
| Requirements | 9/10 | Owned requirement trace and now explicit shared-wire/freshness rules. |
| Capacity evidence | 8/10 | Explicit v1 local limits; no measured latency claim. |
| Redundancy | N/A | No durable service or availability objective. |
| Data scaling | 8/10 | Bounded inventories with explicit current/stale/invalid behavior; no database scaling scope. |
| Caching | N/A | No proven hot-path cache need. |
| Async offload | N/A | Local synchronous consistency validator, not execution service. |
| Observability | 9/10 | Separate dimensions, issues and exits. |
| Rollout | 8/10 | Minor-version cutover, known-consumer migration, observation-only adoption. |
| Cost proportionality | 9/10 | Builtins/existing dependencies; no signing/execution platform; pilot separately authorized. |

**51/60 applicable points; semantic outcome: sound for proposed-design scope.** Correctness and shared-migration gates raised in this review are resolved. No aggregate score substitutes for later implementation verification.

## Handoff and execution record

Orchestrator may freeze the corrected SRS identity above and proceed through authorized bounded implementation dispatch. T7 corpus/oracle/profile/budget and release/blocking activation remain separately gated. No runtime acceptance, deployment or paid-provider execution is authorized by this review.

Only this requested report was written. No source edits, builds, lint, tests, formatters, delegation or premium calls. Verification consisted of reading the immutable contracts and walking their branches; no executable behavior is claimed.

Standards read directly: review-system-design, system-design-artifact-intake, system-design-review and semantic-evaluation, common-architecture-diagramming, common-decision-discipline, requirements-modeling, trust-review-policy. MCP routed common-code-review, common-best-practices, common-subagent-driven-development, golang-architecture, python-architecture, system-design-principles and product-requirements; Python has no implementation surface here. Compliance audit reported no routed coverage gaps. Session-cost tool called; host token/pricing data unavailable, so no cost or savings estimate.
