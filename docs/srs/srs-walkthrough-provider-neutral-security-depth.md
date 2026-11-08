# Design And Delivery Walkthrough: Provider-Neutral Security Teaching Depth

Date: 2026-11-07
Scope: the sections down to "Unexercised Lanes And Next Gate" are the design-time record and predate implementation; "Delivery Evidence" reports the delivered state and supersedes them where they conflict. No live provider trial, publication or lab activation occurred at any stage.

## Authority And Artifacts

- Operator `Ok` approved the presented PRD and design-only next step. Approval recorded in [PRD](../prd/prd-provider-neutral-security-depth.md); no unseen design approval is inferred.
- Approved PRD SHA-256 observed: `4e2e5cb514b8404be99919a16e2ab5b629fdf0395a7e79fc746d917a21b36362`.
- [SRS](srs-provider-neutral-security-depth.md): proposed policy, exact future module/data/test interfaces, seven technical requirements, flows, failures, local decision record and approval boundaries.
- [Run record](../../artifacts/runs/provider-neutral-security-depth/20261107T063322Z-design-solution.json): design_ready means ready for design review, not implemented/accepted.

## Evidence Observed

Two bounded read-only design checks supplied policy and artifact-layout recommendations. They are advisory input, not independent oracle acceptance. Parent integrated the choices and checked the source distinction at `cli/src/services/SkillDiscoveryService.ts:58-71` versus `scripts/evals/changed-skills.ts:8-40`: CLI changed-only discovery filters SKILL.md; eval changed-package discovery includes resources. This resolves an apparent contradiction without changing approved behavior or tool code.

Policy choices: sixteen base role/tenant/resource/action rows plus four caller-role pressure variants; no cross-tenant exception. A pure function returns caller-visible response separately from internal next-state so a denial cannot leak an object through its response. Actual fixture and test files do not yet exist. Expected vulnerable outputs are distinct from normative permissions; policy review cannot derive its expected values from either function.

The known `tsx`/node_modules absence prevented the earlier official audit from starting. That failed setup was not rerun unchanged. Official outcome/trace/registry validators remain unverified, not PASS. Node-only document checks do not substitute for those validators.

## Design Verification Receipt

Local design consistency check: PASS via `rtk proxy node /tmp/provider-neutral-security-depth-design-check.mjs`. Checked seven unique technical cards, all thirteen source AC references, seven unique verification mappings, sixteen base policy cells (six allow / ten deny), eleven resolving local links, required run fields/identity, pending design approval and exact approved PRD SHA-256. This is document consistency only, not official schema validation, independent oracle acceptance or example behavior proof. Temporary checker removed after execution.

Manual self-review: requirements retain approved scope and IDs; each SRS card has one verification mapping; no alternate finding schema or runtime API; unknown deployed/provider outcomes remain explicit; oracle acceptance and human design/execution/publication gates remain separate.

## Unexercised Lanes And Next Gate

- Example-function behavior: NOT RUN; implementation unstarted.
- Independent oracle/semantic/architecture-security acceptance: pending; scout design advice does not supply approval.
- Official dependency-based validators: unavailable in current worktree as reported above.
- Consumer sync/discovery, provider acceptance, API/lab behavior and host isolation: NOT RUN / outside current contract.
- Merge, publication, release and activation: not authorized.

Next: operator design approval → implementation-readiness → independently accepted artifact oracle and eligible worker assignments → separately selected execution approach before coding. Source baseline and historical CLV authority remain intact. No current docs change grants G3/G4/G5 permission.

## Cost

Called get_session_cost for design-solution. MCP reports partial telemetry; host tokens, pricing and complete multi-actor cost unavailable. No numerical cost/savings claim.

## Delivery Evidence (2026-11-07)

Supersedes the design-time lane statuses above where they conflict. Observed by the orchestrator on this checkout; base `d1957d0a121ba386a704eb12130288e8ab675f3c`, with the feature documents, new package resources and test untracked and `SKILL.md` plus `CHANGELOG.md` modified. Not committed.

| Lane | Result | Evidence |
| --- | --- | --- |
| Locked dependencies | PASS | `rtk pnpm install --frozen-lockfile --ignore-scripts`; lifecycle scripts intentionally disabled |
| Oracle independence (AC-005) | Agent acceptance recorded | Reviewer `c6ba7154` read all 20 literal cases against expectations held before inspection; accepted matrix SHA-256 `ce9a50f534f6783e9a2d209cb7d55a67ff8171113f0d277c93e1586c5e28b5da`; any byte change invalidates it. Not human sign-off |
| Behavioral RED | `expected_red` | `rtk node --test scripts/skill-tests/provider-neutral-security-depth/access-control.test.mjs` on the first test (`154729b9…`) and the RED-checkpoint module (`39fcabe4…`): 48 tests, 37 pass, 11 fail; 10 fixed-policy cases (cross-tenant read/update and four claimed-role variants) failed on behavior, not import or setup; all 20 vulnerable cases and 6 corpus checks passed |
| First GREEN | PASS (superseded) | Same first test (`154729b9…`) with the fixed module (`58249b0d…`): 48 tests, 48 pass, 0 fail, 0 skipped |
| Final GREEN on delivered bytes (AC-006/007/008/012) | PASS | Same command: 55 tests, 55 pass, 0 fail, 0 skipped. Bytes: matrix `ce9a50f5…`, module `1a0a0531…`, test `6dffdad7…`, recipe `1892eb98…`, `SKILL.md` `24f1b3c7…`. The 7 added tests are guard tests (case-ID/input consistency, update/read value rules, inherited-key references, oracle digest pin) written alongside their guards, so they have no behavioral RED |
| Real-module consumer smoke | PASS | Direct import of the fixed export (module `1a0a0531…`) with synthetic data: same-tenant read allowed, cross-tenant read denied, viewer with `claimedRole=editor` denied, editor update allowed, inputs unchanged |
| Registry validation (AC-013) | PASS | `rtk pnpm --filter ./cli validate:all`: 351 passed, 0 failed; the skill's only warning is the existing non-standard script extension notice shared by other `.mjs` skills |
| Audits | PASS | `rtk pnpm audit:skills`, `rtk pnpm audit:injection` |
| Governed trace | PASS (links only) | `rtk pnpm audit:trace --slug provider-neutral-security-depth --required`: 1 objective, 4 requirements, 13 acceptance criteria, 7 technical requirements, no issues. An earlier run failed on two document-format defects, fixed before this result |
| Outcome record audit | PASS (schema/scope only) | `rtk pnpm audit:outcome --records --required` for the implementation-readiness record |

Defects found and corrected during delivery: the author's first recipe cited an unverified upstream commit, labeled this repository Apache-2.0 (its `LICENSE` is MIT) and named an unrelated CVE; each was checked against the pinned upstream API, `LICENSE` and the vendor advisory and corrected. Independent review then drove three further rounds (see below) that changed the module (own-property lookup, field projection), the test (case-ID/input consistency, value rules, digest pin, CRLF-safe hashing) and the recipe. The RED and first-GREEN rows above describe the earlier module and test bytes, not the delivered ones.

### Limits and unexercised lanes

- All behavioral evidence is for synthetic in-memory functions. It is not deployed authorization, authentication, concurrency or database-policy proof.
- Semantic review of the recipe (AC-001, AC-002, AC-003, AC-004, AC-009, AC-010, AC-011) and the final architecture/security review are covered only by the independent review recorded below; the passing checks above do not establish them.
- Consumer sync and discovery of the new resources, live provider acceptance, reduced-refusal or task-success claims, and host isolation: NOT RUN and outside the approved scope.
- Human acceptance, merge, publication and activation: not granted.
- Routing: the Personal review profile returned `usage_limit_reached`; the operator then explicitly selected the VMO analysis profile for the final review, overriding its Personal-project exclusion. See `.agent/sdd/provider-neutral-security-depth/review-route-decision.json`.

### Independent final review

Reviewer: VMO · Analysis & Review (`anthropic/claude-opus-5-5`), read-only, selected by the operator after the Personal review profile returned `usage_limit_reached`. Full findings and dispositions for round 1: `.agent/sdd/provider-neutral-security-depth/review-round-1.json`; routing record: `.agent/sdd/provider-neutral-security-depth/review-route-decision.json`.

| Round | Verdict | Outcome |
| --- | --- | --- |
| 1 | CHANGES REQUESTED | 7 major, 2 minor. Code security and architecture lenses passed; recipe provenance, disposition table, task envelope, retest continuation, incomplete-evidence packets and AC semantics, and test-corpus binding were found deficient. All nine were valid |
| 2 | CHANGES REQUESTED | All nine round-1 findings resolved. Four minor items: wrong upstream copyright holder, `evidence_refs` citing the oracle, Packet A gap, fragile digest pin. The reviewer also corrected its own round-1 claim: the upstream commit date was real |
| 3 | APPROVE | N1-N4 resolved for the nine-file package. Architecture, security, test-quality and recipe-semantics lenses all PASS. The two walkthrough defects it raised (W1, W2) are corrected here |

Edits made by the orchestrator, not a worker: recipe Packet B/C status mapping after round 1, then recipe lines for N1-N3 and the test's pin hashing and comment for N4. The reviewer examined each. The reviewer did not execute project code; the test runs, validators and audits above were observed by the orchestrator.

Open items, none claimed as done: the reviewer's agent-level approval is not human acceptance; merge, publication and activation are not granted; the test is outside the root test globs and runs only through its explicit command; this walkthrough and the other feature documents were reviewed as authored but the walkthrough itself was not in the reviewed package.
