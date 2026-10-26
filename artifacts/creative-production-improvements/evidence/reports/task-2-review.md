# Task 2 independent review

## Verdicts

- **Spec: CHANGES REQUESTED.** Preservation requirements and truthful production evidence have unresolved Major findings R1–R2.
- **Quality: CHANGES REQUESTED.** R2 embeds unobserved verification as template output; R3 contradicts commissioned-create routing.
- Findings are confirmed source-level defects, not observations of a live agent or renderer. Maintainer acceptance remains separate from this review.

## Scope and review basis

Reviewed only the six Task 2-owned core/reference files against base `1aecf6c3f3b49c01b2d66cd3afac856d29cc538d`. Read `parallel-briefs.md` shared/Task 2 instructions, the approved PRD sections 3–4 and Task 2/common restrictions, `task-2-report.md`, and the frozen shared contract. Worker claims were not used as proof.

Trust class: semi-trusted local implementation/report inputs; source read-only, with only this requested review report written. No publication, delegation, installs, paid calls, source edits, tests, build, lint, or formatters.

Loaded standards: `code-review`, `caveman-review`; MCP audit lists `common/common-code-review`, `common/common-feedback-reporter`, `common/common-llm-security`, `common/common-owasp`, `common/common-security-audit`, `common/common-session-retrospective`, `common/common-skill-creator`, `common/common-workflow-writing`. Also read `docs/review-policy.md` and the trust-review policy. File routing returned the skill-authoring rules; the audit's generic product-management coverage warning is not a missing marketing-source rule or a successful product-management review claim.

## Findings

### R1 — [MAJOR] Existing standalone content safety rules were removed

Location: `skills/marketing/marketing-content-strategy/SKILL.md:61-67` (replacement of baseline anti-patterns).

Why: The baseline explicitly prohibited invented search-volume/keyword-difficulty/CPC metrics and repetitive thin programmatic bulk publishing. Those actionable rules were removed, not moved into either owned content-strategy reference. The unchanged description mentions keyword-volume fabrication and bulk publishing, but the replacement execution guidance no longer supplies the full controls. An agent asked to populate made-up CPC/difficulty figures or batch repetitive SEO pages loses the former explicit rejection rule. This violates the shared requirement to preserve existing safety/capabilities; creative production must supplement, not replace, standalone content planning.

Fix: Restore the original factual metric and thin-bulk-content rejection rules in the core or an explicitly loaded local reference. Keep them effective when the creative-production contract is absent. Also preserve the original proof/context checks rather than treating the newly added brand rules as their replacement.

### R2 — [MAJOR] New copy templates pre-fill successful rendering evidence without a synthetic boundary

Location: `skills/marketing/marketing-copywriting/references/copy-templates.md:73-84` and `:98-110`.

Why: The new hero template asserts a produced PNG with a truncated hash, successful OCR matching, verified overflow bounds, and a resolved fallback font. No artifact or measurement evidence accompanies those assertions. The new Pinterest template similarly pairs `CLM-007` with an under-15-minutes performance claim without establishing an actual bound register claim. Unlike `proof-binding.md:7` and the shared contract's explicit synthetic-record notice, this reference has no warning that its new claim IDs, production results, and evidence assertions are fictional and must not be reused as proof. A consumer copying the template can report `exact_copy_check` success without inspecting an output—the exact failure AC-10 and the new proof guidance prohibit. The worker report's scenario narrative does not supply the missing artifact evidence.

Fix: Make these templates unfilled evidence structures, or unmistakably label the entire examples as synthetic/non-evidence and require replacement with actual register text, delivered artifact identity/hash, and observed check results. Never pre-populate successful OCR, bounds, or font verification in a deliverable template. A missing font may be disclosed as a preview limitation, but the fallback preview is not approved-brand fidelity.

### R3 — [MAJOR] Blanket redesign/copy rejection overrides explicitly commissioned changes

Location: `skills/marketing/marketing-content-strategy/SKILL.md:63`; `skills/marketing/marketing-copywriting/SKILL.md:60`.

Why: Content strategy says to “Reject requests to replace supplied approved brand assets or copy,” while its own line 41 allows new identity creation when explicitly commissioned. Copywriting likewise says “Never alter supplied approved copy or brand slogans,” omitting the unrequested-change qualification retained in line 39. For an explicit owner request to revise an existing slogan or commission a replacement identity, these absolute guardrails require refusal even though the apply/extend/create boundary permits commissioned work. AC-01 protects requested application from unsolicited redesign; it does not ban authorized new creative work.

Fix: Scope the prohibitions to unsolicited changes or the `apply` operation. Permit explicitly commissioned revisions/new identity as new proposed revisions, preserving old approved versions and requiring new revision-bound review/approval.

## Acceptance and preservation assessment

| Area | Source evidence and disposition |
| --- | --- |
| Apply/extend/create, AC-01 | Present in content core 38–41 and mapping 49–59; absolute anti-patterns conflict with commissioned changes (R3). |
| Selective invalidation, AC-02 | Present in content core 50–52, governance 34–49, copy core 50, templates 146–179. Nondependents retain prepared/authorized/rejected/stale rather than being promoted. |
| Format precedence / reuse, AC-03–04 | Present in content core 42–46 and mapping 61–107; hero/Pinterest scenes remain subordinate to deliverable geometry. Scenario dimensions are examples, not evidence of rendering. Complete constraints are reused; only consequential gaps are queried. |
| Selective repair, AC-09 | Present in governance 51–56, copy core 51, and templates 116–144; passing siblings retain prior state. |
| Rendered evidence, AC-10 | Core 40–43 and proof-binding 60–83 distinguish source from rendered proof and exact from visual review. The new pre-filled template contradicts that boundary (R2). |
| Font/editability, AC-11 | Core 44–46, proof-binding 85–89, templates 181–201 disclose unavailable native sources and custom fonts; no claim that a raster preview is an editable native file. |
| Authority / proxies, AC-12–13 | Content core 55–58 and governance 60–73 retain operation-specific host authorization, recipient/revision media consent, cost/cap, human publish sign-off, and proxy labels. Guidance is not runtime enforcement. Copy core 52–54 rejects assertion-as-authority and observed-ROI claims. |
| Shared contract resolution | Content core 24–26 uses local reference. Copy core 24–26 names both standard and flattened installed locations and a missing-contract capability gap while preserving standalone copy. Copy reference link at 67 is standard-layout-relative, but explicit resolver instructions—not that bare link—must govern flattened installs. No silent installation or new renderer is promised. |
| Existing context/proof/capacity/lifecycle | Context tokens, triad, proof caveats, experimental disclosures, no time-to-cash conversion, reviewer capacity and proposal-only lifecycle remain in source. Strategy core no longer explicitly says its context token must match campaign **and proof ledger**; integration should ensure the existing binding semantics are not weakened. Removed anti-pattern controls are R1. |
| AC-15 | Observed cores end at 73 and 69 lines; frontmatter is unchanged in scoped diff. Metadata validator and packaged reference availability were not run in this read-only review and are not claimed PASS. |

Shared C1–C6 remains the named canonical reference; local prose restates substantial C2/C5/C6 requirements, so future changes must not treat those summaries as an independent schema or competing authority. No schema/script/provider/runtime edits are included in the reviewed six-file diff. Duplicate governance headings at 26–27 are editorial only, not a blocking finding.

## Evidence and limits

Commands executed:

- `rtk git diff 1aecf6c3f3b49c01b2d66cd3afac856d29cc538d -- <six exact Task 2 paths>`: inspected the scoped changes; RTK summarized the diff and truncated part of the template addition, which was read directly in full afterward.
- `rtk proxy shasum -a 256 <six Task 2 paths> <shared contract>`: bound the inspected working-tree sources below.

No tests/build/lint/formatters or behavior/model/scorer execution. Findings use concrete source contradictions and removed rules; no claim of live efficacy or actual rendered failure. Task 4/5 own eval/scorer and packaging execution. This review does not approve integration or substitute for Task 6.

### SHA-256 snapshot

| Path | SHA-256 |
| --- | --- |
| `skills/marketing/marketing-content-strategy/SKILL.md` | `b9710a55dfe149a74fb80786dd363a5f2dc82df93bea35c32eccca70f182c137` |
| `skills/marketing/marketing-content-strategy/references/content-mapping.md` | `f38645dbeb2fb3b5c93351f84eb76994a328777859aac3d727ef64ea3c68d665` |
| `skills/marketing/marketing-content-strategy/references/editorial-governance.md` | `930c0151c84781eaaba448d8c72ba4dc87db5d1ceec84cb2d45654df70f336c0` |
| `skills/marketing/marketing-copywriting/SKILL.md` | `89b855eb4405ba4b70c375076b55aa17e413aa1c183665c2b42519b32362c647` |
| `skills/marketing/marketing-copywriting/references/proof-binding.md` | `dec3e9510d77d46cf9d57b89ccabb0ce972fb6aea82bb95cd5b05b213af85cbe` |
| `skills/marketing/marketing-copywriting/references/copy-templates.md` | `52c1774a6b969d998a8647190c569439ce6cece9da2f8216d0de86f3febe7424` |
| `skills/marketing/marketing-content-strategy/references/creative-production-contract.md` | `f99c809820fac4fbfde964d1239b0b072a675f0d98140f774b571cd16d4627e8` |

## Next action and cost

Return R1–R3 to Task 2 implementation owner, then independently re-review changed source and corrected report claims. No fixes applied by reviewer. MCP compliance audit completed before report publication. Host token usage/pricing unavailable; no dollar-cost estimate claimed.

## Corrective re-review — R1–R3

### Current scoped verdict

- **Spec: PASS for R1–R3 and their correction regressions.**
- **Quality: PASS for R1–R3 and their correction regressions.**
- Original findings above remain historical evidence; these dispositions supersede their open status for the corrected source hashes below. No remaining blocking finding in this bounded re-review. This is not integration acceptance, runtime verification, or human approval.

### Evidence dispositions

| Finding | Disposition | Independently inspected source evidence |
| --- | --- | --- |
| R1 | Resolved | Content-strategy core 63–65 restores explicit prohibitions on fabricated monthly search volume, keyword difficulty, CPC, repetitive thin programmatic SEO, and unmapped assets. Mapping 112–120 retains rejection rules and adds the same metric/bulk controls. Core 27 and mapping 115 restore exact campaign/proof-ledger context binding. These controls remain local and do not depend on an installed creative-production contract. |
| R2 | Resolved | Copy templates 3 explicitly identifies the entire document's claim IDs, outputs, and inspection records as synthetic/non-evidence; real claims, paths/hashes, and observed measurements must replace sample fields. Hero 81–86 uses pending OCR/font inspection and unfilled artifact identity instead of asserted success, with fallback typography explicitly not approved-brand fidelity. Pinterest 100–122 uses a sample claim, removes the under-15-minute assertion, and retains pending artifact checks. Records at 125, 155, and 190 are explicitly synthetic. None of these examples is accepted as actual proof. |
| R3 | Resolved | Content core 39–41/66 limits unsolicited-change rejection to application while allowing owner-commissioned new revisions. Mapping 58–60 explicitly creates proposed revisions, preserves prior approved revisions, and gates locked-token updates on authorization. Copy core 38–40/61 and proof-binding 53 permit commissioned revisions as new revision-bound proposals requiring review/approval. A commission authorizes proposal work, not implicit approval of its output. |

### Correction regression check

Source inspection shows the correction retains format-over-scene precedence, complete-brief reuse, dependency-only invalidation, exact prior states for nondependents, selective repair, proof qualifications, experimental disclosures, capacity pacing, proposal-only lifecycle, and operation-specific authority boundaries. Copy qualification preservation still governs commissioned changes: a commission does not authorize unsupported claims or removal of proof caveats.

The new revision prose is read together with the explicit proposed-revision and review/approval requirements, not as permission to replace an approved brand token on generation success. Only an authorized foundation update triggers AC-02 invalidation. Existing approved revisions remain in the ledger; a requested revision is not approved merely because it was commissioned.

Observed corrected cores end at 76 and 70 lines. The shared contract hash is unchanged from the original review. No new runtime mechanism, renderer, approval authority, or evidence source is supplied by these corrections.

### Corrected SHA-256 snapshot

| Path | SHA-256 |
| --- | --- |
| `skills/marketing/marketing-content-strategy/SKILL.md` | `e8d74982c87f5ec74c317536e75c3e31d1f2526acb6da3d7504cf1c1cb0c6608` |
| `skills/marketing/marketing-content-strategy/references/content-mapping.md` | `6ed23542f67f60c669d66215208580d2b95f7e7fb02b145b52e265d68dcf696d` |
| `skills/marketing/marketing-content-strategy/references/editorial-governance.md` | `5842fe0efe7a5e51c63917be0a10a4142ef4bd3358dd867d784e49f42b8ac125` |
| `skills/marketing/marketing-copywriting/SKILL.md` | `09e266f1ec500f0a173f92cea06bbe4d4ce5022c66ad049b03e4e4b97bbe83fa` |
| `skills/marketing/marketing-copywriting/references/proof-binding.md` | `b44c086bd328df049335b1c7cf4314ffe597b6ed8a72562b206897ed105c8961` |
| `skills/marketing/marketing-copywriting/references/copy-templates.md` | `be444cb6228ddac3bc8799a29dc182b40866cfb41a57da21c5d39371502e7946` |
| `skills/marketing/marketing-content-strategy/references/creative-production-contract.md` | `f99c809820fac4fbfde964d1239b0b072a675f0d98140f774b571cd16d4627e8` |

### Re-review execution limits

Read corrective report section 8 and inspected the actual six owned source files around the corrections and their governing rules. Executed `rtk proxy shasum -a 256` on those six sources plus the shared contract. No tests, build, lint, formatter, source edits, paid calls, or delegation. Only this review report was appended. MCP compliance audit was repeated before recording the verdict. Packaging, metadata validation, scorer behavior, and rendered fidelity remain integration verification responsibilities, not exercised PASS claims here.
