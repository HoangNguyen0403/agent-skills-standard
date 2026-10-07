# Brief: System-design review outcomes

**Lane:** direction | **SNC:** S=2 N=1 C=2 total=5 tier=high (inferred from workflow, skill, and eval changes; core design-review handoff) | **Model tier:** strong | **Approval:** approved(operator, 2026-10-04) | **Date:** 2026-10-04

## Contract

**Outcome.** A system-design review should leave an owner-usable, evidence-linked improvement plan, not merely a score, diagrams, and a list of findings. For a whole-product design, the reviewed model must cover the actual client, backend, data, and operations boundaries; proposed fixes must remain visibly separate from the current system. The first delivery slice is the review-to-action handoff; design-session coverage and diagram delivery are subsequent bounded slices.

**Objective ID:** BRD-OBJ-001 — make each material review finding independently actionable and verifiable. **Baseline:** The 2026-10-03 case needed a second request to produce an owned action plan. **Success check:** In a replay of that case, a reviewer can trace every material finding to an action, dependency, accountable role, and observable closure evidence without claiming proposed work is complete. This is an acceptance check, not a measured improvement rate across reviews.

**Constraints.** Preserve the existing nine-axis and independent semantic review; prioritize risk and smallest corrective action rather than a target score. Ask for author confirmation of extracted design facts before a verdict. Do not infer a production topology, metrics, or regulatory approval from code, configuration, or a diagram. Keep diagram selection question-driven, not a mandatory count of views. A review may be read-only; if writing an artifact is not authorized, produce a copyable action register in the response and report its persistence as missing. Changes to the registry source must use `.agents/workflows/` and `skills/`, not generated per-agent exports.

**Non-goals.** No changes to the Our Children product, clinical authorization, provider choice, deployment, or compliance policy. No universal template requiring every system to have a mobile client, every module to have a diagram, or every review to open an implementation ticket. No automated claim that a lexical eval proves review quality. No skill/workflow implementation before approval of this brief.

**Approval boundary.** The operator approved this direction brief on 2026-10-04, not a skill change or release. The registry maintainer still assigns an implementation owner and reviews the first slice independently. A human security/privacy owner remains responsible for any product-level clinical or residency decisions.

## Why this change

The 2026-10-03 Our Children review ultimately reported a **33/90 raw design-evidence score, 47/130 weighted, and 11/16 semantic assessment**, while leaving production approval blocked. Those are review-artifact assessments, not measured service-health metrics. The review initially ended at findings and a roadmap. Only after a user correction was an eight-finding/nine-action improvement plan written beside it, linked from the architecture index and handoff. The prior checkout is a separate, uncommitted worktree (`../illegal-badger` relative to the earlier Paseo workspace); it is **case evidence, not a published registry artifact**. Its review, action plan, and correction log live at `docs/architecture/our-children/reviews/review-2026-10-03.md`, `docs/architecture/our-children/reviews/improvement-plan-2026-10-03.md`, and `AGENTS_LEARNING.md` in that checkout. Do not encode links to that ephemeral worktree in exported skills.

| Failure observed in the prior session                                                                                                                                                                                                                                                                                       | Current registry rule / gap                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Consequence                                                                                                                   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| First handoff declared diagrams done with one crowded container view; PNG exports were not inspected.                                                                                                                                                                                                                       | `skills/common/common-architecture-diagramming/SKILL.md` already requires a selected question, strict render, export, and visual inspection (lines 29-47). This was execution noncompliance; the review workflow's output template still promises `.drawio + image` without an unavailable-export state.                                                                                                                                                                                  | A technically valid view can be misleading or unreadable, and the handoff can falsely imply an image exists.                  |
| Subsequent design went deep on backend sequences but missed a real mobile screen-to-state-to-repository-to-local/remote-data journey; the initial HLD omitted a current mobile-to-object-store signed-download edge. The brief then needed another correction to include the public web surface and backend/infra coverage. | `skills/system-design/system-design-methodology/SKILL.md` lines 52-58 route HLD/LLD but do not explicitly require an inventory of _actual entry surfaces and cross-boundary flows_ when claiming whole-product coverage. A view manifest checks declared relationships, not omitted ones (`skills/common/common-architecture-diagramming/references/view-manifest.md`, lines 74-78).                                                                                                      | A polished diagram set can still leave a material current-state boundary out and mistake a proposed proxy for a shipped path. |
| Six diagram sets were placed in one flat folder before an architecture index organized system, infra, module, and feature decisions. The reviewed work lived in a separate worktree, not the active checkout.                                                                                                               | `skills/system-design/system-design-methodology/references/phase-deliverables.md` describes view selection and files but not entry-point ownership or a publication check.                                                                                                                                                                                                                                                                                                                | Readers cannot find the canonical decision, and a good local artifact is not a shared baseline.                               |
| The first scored review listed findings and a short roadmap but no accountable closure path; the user asked again for a reason/change/evidence plan.                                                                                                                                                                        | `.agents/workflows/review-system-design.md` lines 32-35 require a verdict, roadmap, risk register, diagram, and fact sheet; `skills/system-design/system-design-review/SKILL.md` lines 52-59 say findings become a roadmap. Neither requires a persistent finding-to-action register with owner, dependency, acceptance evidence, and status. `skills/system-design/system-design-review/evals/evals.json` case 1 accepts the word “roadmap” or “smallest fix” as a passing smoke signal. | An accurate score cannot be acted on or independently closed; a vocabulary-only eval can miss the failure.                    |

**Evidence classification:** source-path and instruction claims above are `confirmed` in this registry. Prior-session outcomes are `confirmed` from the archived conversation and the separate worktree; they are not deployment observations. Whether other teams exhibit the same failure is **unknown**, not asserted.

## Direction and trade-off

**Recommend the smallest change:** strengthen the existing review workflow/skill and its regression cases first, then add source-surface inventory and publication guidance to the design methodology only where the whole-product case warrants it. Do not introduce a new workflow, service, or universal diagram taxonomy.

| Option                                                              | Load-bearing assumption                                                                                         | First failure condition                                                                            | Worst plausible case                                                                 | Cost to abandon                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Keep present rules and rely on reviewer discretion                  | Reviewers consistently turn roadmaps into tracked actions and independently inspect scope.                      | A review stops at its score again.                                                                 | A security or trust-boundary gap is recorded but mistaken for resolved work.         | Low code cost; high recurring manual follow-up. Rejected by the observed correction.                                |
| **Tighten review handoff plus targeted method/evals (recommended)** | A small contract with explicit action/evidence fields changes reviewer behavior without forcing extra diagrams. | The action register becomes boilerplate or is produced without real evidence and owner acceptance. | False completion of a safety gate despite attractive paperwork.                      | Low: revert focused workflow/skill text and evals, retain useful case data.                                         |
| New architecture-review workflow and mandatory diagram suite        | Uniform artifacts are inherently more reliable.                                                                 | Small reviews acquire irrelevant views and stale duplicate registers.                              | Process overhead hides the critical path and creates contradictory sources of truth. | High: migrate consumers, templates, and training. Rejected: current mechanisms already cover scoring and rendering. |

## Delivery slices and acceptance

**Slice 1 — review findings into accountable change (first implementation slice).**
Edit `.agents/workflows/review-system-design.md`,
`skills/system-design/system-design-review/SKILL.md`, the scorecard/reference
only if the output contract needs a worked example, and
`skills/system-design/system-design-review/evals/evals.json`. Require each
material finding to map to a bounded action: reason/evidence, smallest change,
role to assign (not assumed accepter), dependency, observable exit evidence,
status (`open`, `blocked`, `verified` with approver), and release/topology gate
when relevant. If writes are permitted and the review is a documented project
artifact, persist a plan beside the review and link it from the review,
architecture entry, and machine-readable handoff; in chat/read-only mode include
the same register and mark persistence absent. Proposed work is `open` even if
diagrammed.

- **Check 1:** A replay of the prior case yields an action register separating
  clinical-access triage, jurisdiction approval, cross-client cutover, and
  recovery drill; each action can be independently accepted or held.
- **Check 2:** A read-only or unwritable review does not claim a file was saved.
- **Check 3:** A healthy or narrow review does not invent findings or owners;
  explicitly record “no corrective actions” if supported by evidence.
- **Reviewer:** Independent system-design reviewer; security reviewer for a
  trust-boundary recommendation.

**Slice 2 — whole-product scope and honest view delivery.**
Edit `skills/system-design/system-design-methodology/SKILL.md`, its
`references/phase-deliverables.md`, `.agents/workflows/system-design-session.md`,
and, only if the renderer-owned view contract itself needs it,
`skills/common/common-architecture-diagramming/SKILL.md`. For a product-wide
claim, inventory actual client entry surfaces (including public web/mobile if
present), backend modules, owned stores, third parties and direct
client-to-provider flows before selecting risk-based HLD/LLD views. Tie view
levels to questions and keep current/proposed/deployment evidence separate.
Organize a multi-view deliverable with one navigable entry and explicit
system/infra/module/feature ownership rather than mandating directory names
for every project. Distinguish validated spec, rendered draw.io, inspected
export, and unavailable image; never report an export that failed. Check
published/shared revision when the ask is a shared baseline.

- **Check 4:** In a seeded mobile + public-web + API + object-store case, the HLD
  includes the actual direct download edge and a representative mobile journey
  reaches the client data/repository layer and API; no invented authenticated
  web journey.
- **Check 5:** An export timeout records `.drawio` as editable, image as
  unavailable, and any fallback as fallback; no PNG claim.
- **Check 6:** A local untracked worktree is not called a published source;
  handoff identifies the canonical repository/revision or leaves publication
  pending. No minimum diagram count.

**Slice 3 — evaluation and release gate for each changed slice.**
Extend the relevant skill evals
(`skills/system-design/system-design-review/evals/evals.json`,
`skills/system-design/system-design-methodology/evals/evals.json`, and diagramming
evals only if that skill changes). Add paired scenarios: score-only review vs
owner/evidence plan; no-finding review; whole-product case with direct
client-to-store edge vs proposed proxy; read-only review; export failure. Use
lexical assertions only as smoke checks and independently grade action
traceability, provenance, boundary completeness, and adverse outcomes with
`skills/system-design/system-design-review/references/semantic-evaluation.md`.

- **Check 7:** A response that merely says “roadmap”, lists owners without
  proof, claims a missing PNG, or omits the direct edge fails semantic review
  even if lexical assertions pass.
- **Check 8:** A concise, evidence-backed review with no corrective actions
  and no unnecessary diagrams passes.

Freeze changed skill/eval scope before a fresh live comparison; report its
actual run ID and measured results or `not run`, never inferred uplift. Check
generated workflow exports via the existing sync/release process; do not edit
copies by hand.

**Verification at implementation time (not claimed here):** `pnpm validate:all`, `pnpm audit:sdlc`, `pnpm check-alignment`, and `pnpm evals:preflight -- --skills-file <changed-skill-list>` per `docs/EVALS.md`; then run focused behavioral replay and independent semantic grading before any release claim. Paid eval execution needs a reviewed fresh manifest; a static validation pass cannot demonstrate that the user-visible review outcome improved.

## Stakeholders, dependencies, and risks

| Role                                               | Decision / responsibility                                                                                                   |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Registry maintainer / workflow owner               | Approve this brief, assign slice owner, review skill-trigger and handoff compatibility, publish a reviewed source revision. |
| System-design reviewer                             | Confirm the fact sheet with an author, inspect HLD/LLD coverage, own the finding-to-action mapping.                         |
| Product/security/privacy owners (project-specific) | Accept or block clinical, residency, and release decisions; workflow text cannot grant their approval.                      |
| Independent eval reviewer                          | Grade semantic replays without accepting vocabulary hits as proof.                                                          |

**Dependencies:** Slice 1 can ship independently; Slice 2 must reuse Slice 1's current/proposed and handoff vocabulary; Slice 3 tests each slice before that slice is promoted. Any multi-view diagram contract change must be coordinated with the renderer-owned schema; the current view manifest already supports identity and relationship checks, so do not duplicate it.

**Risks:** More mandatory fields may create boilerplate—gate on real evidence and permit no-action conclusions. A whole-product scope rule may force irrelevant diagrams—require inventory and decision-linked selected views, not a fixed suite. Worktree evidence can go stale—pin source revision and inspect shared-branch presence. A green lexical score may mask an unsafe claim—grade replay semantics and report the limits.

## Approval and next workflow

**You said:** Inspect this session for a problem in the agent-skills-standard design-review behavior and create a plan to improve that repository; then replied “ok” to this brief. **I assumed:** The intended scope is workflow/skill behavior and its evals, not immediate product remediation or a blanket redesign of all architecture skills. **Approval:** approved(operator, 2026-10-04) for this direction brief only. The first slice routes to `plan-feature` / `design-solution` for a bounded implementation contract; no skill source has been changed by this approval.
