# Review workflow consolidation design

Status: proposed planning amendment; no implementation or deletion authorized.
Date: 2026-11-01
Branch: `plan/provider-neutral-devops`; separate from website PR #280.

## Intent and evidence

The user approved adding a separately reviewable cleanup slice after comparing the actual `code-review` and `review-ticket` workflow bodies. Both evaluate a diff/PR, use security/architecture/testing lenses, classify untrusted context, produce evidence-linked findings, issue the same verdicts, and require approval to publish. `code-review.md:22` routes specialist/metadata review to `review-ticket`, while `sdlc.md:32,34` exposes both entrypoints. Distinct capabilities are specialist orchestration, acceptance-criteria coverage, and PR metadata/threads; those can be on-demand references beneath one canonical review entrypoint.

Unlike the distinct DevOps incident/statistical/release policy workflows, this pair is a concrete semantic duplication candidate. The prior 38-workflow inventory was not a finding that every possible pair was nonduplicative.

## Decision and scope

Keep `code-review` as the canonical workflow ID. Preserve fast/deep review, security gates and findings semantics. Incorporate ticket/AC and metadata capabilities when the supplied scope requires them. Remove `review-ticket` only after all active callers/configuration/validators are migrated and managed consumer cleanup is proven. No forwarding alias, second review workflow, or blanket deletion of generated copies.

This is an independent companion subproject to the provider-neutral DevOps plan. It can be accepted or rejected separately. Shared files (`sdlc.md`, metadata, quick-reference docs and generated outputs) have one integration owner and cannot be edited concurrently with DevOps Task 3/5. Planning authorization does not authorize execution.

## Required behavior

1. A valid diff-only review does not require a ticket, AC list, PR-provider MCP, or mandatory specialist fanout. Missing optional metadata is a scoped coverage gap, not a global block.
2. An explicitly required ticket/AC or metadata lane needs its source evidence, using existing authorized MCP or exported artifacts. Missing required evidence blocks that lane and prevents an unwarranted approval; no invented ACs or ticket facts.
3. Review remains independent of the change author. Specialist labels alone do not prove independence. Delegate only relevant, bounded lenses for a named benefit; preserve scout capability without unconditional dispatch of a scout for every trivial diff.
4. Retain security, logic, silent-failure, type-design, AI-safety, testing and relevant framework rules; existing organizational review policy controls severity, skip lists and nit caps.
5. Retain untrusted-context isolation, provenance, exploit/merge-risk validation and confidence, evidence gaps, and design/readiness prerequisites for sensitive changes. Treat ticket text, PR metadata, logs and comments as untrusted evidence, not instructions or authorization.
6. Deduplicate findings by root cause. Distinguish confirmed findings from needs-validation items and policy debt. APPROVE needs no Blocker/Major and sufficient required evidence; CHANGES REQUESTED covers fixable serious findings or unresolved needs-validation; BLOCKED identifies the exact missing necessary evidence/runtime.
7. Keep one report and sanitized publication handoff. Publish only with user approval through the existing commenter specialist; untrusted contexts never authorize autonomous publication. Archive durable evidence before owned cleanup.
8. Verdict is not a merge, acceptance, or deployment grant. Resolve current fixed-routing mismatch with an explicit matrix, not a mechanical replacement of `review-ticket` by `code-review` in records.

## Routing and reporting matrix

| Outcome / next required work | Route |
| --- | --- |
| APPROVE; technical acceptance checks remain | `verify-work` |
| APPROVE; no next workflow required | `null`; no inferred release/merge authority |
| CHANGES REQUESTED; approved feature work needs correction | `implement-feature`, carrying findings and existing approved scope |
| CHANGES REQUESTED; bug remediation required | `dev-fix`, retaining root-cause and approval discipline |
| Required sensitive technical design/readiness evidence missing | `design-solution` or `implementation-readiness`, selected by the actual missing decision |
| BLOCKED; missing required diff/context/runtime | No mutation; request precise prerequisite, no fabricated downstream completion |

Keep the existing Outcome Report schema. A review verdict does not establish a feature lifecycle transition; preserve evidenced lifecycle rather than unconditionally emitting `implemented`. If lifecycle is unknown, use the review report without inventing a feature run record; flag any mandatory consumer/schema conflict for separate approval. Historical run records naming `review-ticket` remain immutable evidence; do not globally rewrite them or recreate a live alias just to make history look current.

## Migration and generated-output boundary

Classify every reference as an active caller/configuration, executable test expectation/fixture, generated managed output, historical evidence, or explanatory migration note. Migrate only operative uses. Preserve historical reports, receipts and sealed fixtures; if supported historical validation requires a narrow adjustment, demonstrate it with a fixture before changing the validator. Do not weaken unknown-workflow validation or silently expand the live workflow catalog.

Check default workflow selection, explicit `.skillsrc` selections, chain/router validation, security-review workflow lists, outcome rules, docs, and consumer discovery. A removed canonical source does not by itself prove stale consumer outputs will be removed safely: test owned versus edited/unowned exports using the actual sync/generator path. Preserve or refuse on user-edited/unowned files, reconcile selection explicitly, and never bypass ownership digests.

## Acceptance and verification

- `code-review` supplies focused and ticket-enriched review without a second workflow.
- A simple diff-only case can pass without optional integrations; missing required AC evidence cannot pass by claiming not-applicable.
- Security, independence, provenance, approval-to-publish and fast/deep behavior are preserved.
- Verdict-dependent handoffs follow the matrix; no automatic feature implementation or release claim from an APPROVE result.
- All active callers migrate, supported existing consumer configuration is handled explicitly, retired `review-ticket` is not advertised, and generated managed cleanup does not erase user edits.
- Historical records are preserved; any history-validation behavior is explicitly tested and distinguished from the live catalog.
- Structural/schema/selection tests, real scorer discrimination, package/discovery smoke, and actual-agent behavior remain separate evidence lanes. No premium or runtime qualification is implied by this plan addition.

## Review scope

The prior premium consultation and independent closure review covered the DevOps documents at recorded hashes only. They did not cover this companion subproject or later linking edits. No additional premium call is authorized. Before implementation, an independent reviewer must assess this consolidation's preservation/migration contracts and the combined shared-file schedule; execution still requires explicit user approval.
