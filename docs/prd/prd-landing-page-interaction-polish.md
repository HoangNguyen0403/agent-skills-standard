# Feature Plan: Landing-page interaction polish and coverage clarity

Status: Requirements ready; Subagent-Driven execution selected
Owner: Requesting maintainer
Engineering owner: Assigned website implementers, one per slice
QA/release owner: Orchestrator for verification; maintainer for human acceptance and any release authorization
slug: landing-page-interaction-polish
operator_profile: technical
lane: direction
snc_tier: medium
model_tier: standard
delivery_mode: standard
brief_approval: approved(requesting maintainer, 2026-11-02)
execution_approval: Subagent-Driven selected by requesting maintainer on 2026-11-02

## Decision brief

- Changes since approved brief: formal trace IDs adapted to scanner grammar (REQ-001..004, AC-001..007); no scope change; explicit file ownership, sequencing, and verification lanes added.
- Recommendation: four bounded implementation slices, then integration and independent review. Use existing static Next.js composition and bounded motion infrastructure; no new animation library.
- Impact if wrong: scroll/focus regressions, stale walkthrough state, incomplete copied commands, or misleading coverage claims. No storage, API, CLI binary, or production changes are required.
- Evidence: reuse the approved [Direction brief](../brd/brd-landing-page-interaction-polish.md#evidence-ledger). Source findings are confirmed there; current visual behavior remains unverified because the browser host disconnected.
- Approval sought: Subagent-Driven execution selected by requesting maintainer on 2026-11-02. Slices 1–4 are authorized for subagent dispatch. No deployment, merge, publishing, or budget authority is implied.
- Independently ready slices: navigation, walkthrough, quick start, coverage. All share the same reduced-motion/accessibility constraints but have separate file ownership.

## Outcome and guardrails

Carry forward the approved brief's Contract unchanged. Visitors can understand routing, navigate sections, copy concise setup commands, and identify relevant coverage. No numerical conversion claim or fabricated business metric. Completion is observable compliance with the approved acceptance criteria, followed by maintainer review.

Preserve existing aesthetic, typography, layout narrative, native anchor/deep-link history behavior, static export, source links, clipboard error handling, bounded animation lifecycle, and existing performance safeguards. Reduced motion and no-JavaScript content remain usable.

## Scope inventory

```text
Polish landing-page discovery
  Navigate sections — in_scope, REQ-001
  Switch routing examples — in_scope, REQ-002
  Learn and copy setup commands — in_scope, REQ-003
  Discover capability groups — in_scope, REQ-004
  Redesign branding/layout — excluded
  Execute live agent walkthroughs — excluded
  Change CLI binaries or registry content — excluded
  Add analytics or deploy/publish — excluded
```

The actor for all in-scope leaves is a website visitor, including keyboard and reduced-motion visitors. Triggers are anchor activation, example selection, command entry into view/copy, and browsing supported coverage respectively. Rules, exceptions, and outcomes remain in the approved canonical contract below; no new domain policy is introduced.

## Requirements and acceptance criteria

The approved brief is the canonical definition of REQ-001 through REQ-004 and AC-001 through AC-007. The tables below are ownership and verification indexes, not duplicate definitions. Compound scenario groups are exercised as individual checks without renumbering the approved IDs.

> **ID Mapping Note:** Formal trace IDs follow canonical scanner grammar (`REQ-\d{3,}$`, `AC-\d{3,}$`) while preserving approved criterion identity:
```text
REQ-LP-01 -> REQ-001 (Navigate sections with coherent motion)
REQ-LP-02 -> REQ-002 (Switch and animate routing examples)
REQ-LP-03 -> REQ-003 (Learn and copy concise setup commands)
REQ-LP-04 -> REQ-004 (Discover supported capability groups)
AC-LP-01  -> AC-001  (Navigation & header offset)
AC-LP-02  -> AC-002  (Example switching & animation)
AC-LP-03  -> AC-003  (Setup command copying)
AC-LP-04  -> AC-004  (Command typewriter reveal)
AC-LP-05  -> AC-005  (Supported coverage grouping)
AC-LP-06  -> AC-006  (Coverage copy qualifications)
AC-LP-07  -> AC-007  (Reduced-motion & layout stability)
```

| Req ID | Canonical definition | Engineering owner | Priority | Status |
| --- | --- | --- | --- | --- |
| REQ-001 | BRD capability inventory | Navigation implementer | P1 | Direction approved |
| REQ-002 | BRD capability inventory | Walkthrough implementer | P1 | Direction approved |
| REQ-003 | BRD capability inventory | Quick-start implementer | P1 | Direction approved |
| REQ-004 | BRD capability inventory | Coverage implementer | P1 | Direction approved |

| AC ID | Req ID | Definition reference | QA owner | Single verification lane |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BRD Acceptance criteria | Orchestrator | Browser scenario: pointer/keyboard anchors, mobile menu, direct hash, Back, header offset |
| AC-002 | REQ-002 | BRD Acceptance criteria | Orchestrator | Browser scenario: all examples, rapid switching, Replay, coherent linked content |
| AC-003 | REQ-003 | BRD Acceptance criteria | Orchestrator | Browser scenario: primary/alternative commands and clipboard during reveal, including failure feedback |
| AC-004 | REQ-003 | BRD Acceptance criteria | Orchestrator | Browser scenario: first reveal, re-entry, reduced motion, pre-hydration/no-JavaScript readability and accessible text |
| AC-005 | REQ-004 | BRD Acceptance criteria | Orchestrator | Catalog-to-rendered-page integration scenario: grouped entries and source links compared with canonical registry |
| AC-006 | REQ-004 | BRD Acceptance criteria | Independent reviewer | Source-and-rendered-copy scenario: skill/subagent/workflow, optional/default and host qualification |
| AC-007 | REQ-001, REQ-002, REQ-003, REQ-004 | BRD Acceptance criteria | Orchestrator | Browser scenario: mobile/desktop, keyboard, reduced motion and horizontal overflow |

Source: [approved contract](../brd/brd-landing-page-interaction-polish.md#acceptance-criteria). No separate BRD objective IDs are minted: this is a Direction-lane contract.

## Implementation plan and shared contracts

### Ownership boundaries

Each worker loads applicable project skills, inspects existing patterns, changes only owned files, and reports AC outcomes and unresolved risks. No worker commits, recursive delegation, full-suite runs, or unapproved architecture/scope changes. Shared composition/content files have one integration owner. New component filenames below are proposed artifacts, not claims about existing files.

| Slice | Requirements / AC refs | Owned components and expected artifact | Size / confidence |
| --- | --- | --- | --- |
| 1. Navigate sections | REQ-001; AC-001, AC-007 | `website/src/app/globals.css`, `website/src/landing/action.module.css`; CSS-first scroll/press behavior. Touch Header/MobileMenu only if existing semantics require a demonstrated correction. No unrelated restyling. | S / high |
| 2. Switch routing examples | REQ-002; AC-002, AC-007 | `website/src/landing/RoutingFigure.client.tsx`, `hero-routing.module.css`; selection-linked bounded animation, coherent data. Own `MotionObserver.client.tsx` only if existing replay semantics cannot support selection; preserve all other consumers. | M / medium |
| 3. Present concise setup | REQ-003; AC-003, AC-004, AC-007 | `website/src/landing/CopyCommand.client.tsx`, `sections/QuickStartSection.tsx`, plus narrowly named command-motion stylesheet/client artifact if needed. Return exact `content.ts` command/type/copy changes to integration owner rather than editing shared content. | M / medium |
| 4. Explain supported coverage | REQ-004; AC-005, AC-006, AC-007 | New `website/src/landing/sections/CoverageSection.tsx`, isolated style/data/generator artifacts as required. Server/build-time registry-backed data; no browser runtime backend. Do not edit canonical registry or existing specimen. Return composition insertion and source-link needs to integration owner. | M / medium |
| 5. Integrate and document | All refs (REQ-001..004, AC-001..007) | One assigned integration worker owns `LandingPage.tsx`, `content.ts`, necessary shared type updates, Skills navigation destination, `website/README.md` and applicable existing changelog. Incorporate slices 3/4 and eliminate obsolete two-command copy. | S / high |

Sizes are relative scope estimates, not delivery dates or billing commitments. Slice 2 has an existing motion lifecycle to respect; slice 4 requires choosing the existing registry/index-reading convention after inspecting repository scripts. Neither requires another public product decision.

### Cross-slice contracts

- Navigation owns global scroll and action feedback only. Other workers must not modify its shared styles.
- Walkthrough owns observed routing replay behavior. Quick-start typing must not change global MotionObserver behavior; if reuse needs a change, return the exact need to the walkthrough owner before modifying anything shared.
- Quick-start rendering accepts complete command strings and stable IDs. The integration owner changes shared content to include install/init/sync and secondary npx alternatives; typewriter presentation never becomes the clipboard source.
- Coverage exports one server-renderable section component and isolated styles/data. Integration places it at the Skills destination and preserves the specimen without duplicate anchor IDs.
- Keep existing render content available before hydration. Animation is enhancement, never a prerequisite to discover/copy data.
- No runtime global install, init, or sync is executed against this repository to verify marketing copy. Verify the shipped bin declaration and CLI help in an isolated/nonmutating context if needed.

### Scheduling and verification

Slices 1–4 can run concurrently after the execution gate and readiness check. Slice 5 depends on returned interfaces from slices 3/4; integrated QA and independent review depend on all slices. Never parallel-edit shared content/composition.

Workers skip mid-flight build/lint/format sweeps. After integration, the orchestrator runs `pnpm website:typecheck`, `pnpm website:lint`, and `pnpm website:build` once, using the required rtk shell prefix. Inspect and use existing focused behavioral tests when applicable; add permanent tests only for distinct consumer-visible regression risks, not static copy assertions or implementation wiring.

Launch the actual preview with `pnpm website:dev` or exported preview and exercise the indexed AC scenarios. HTTP 200 alone is not UI proof. If the browser host is still disconnected, diagnose the connection and finish all reachable verification, but keep browser-dependent acceptance explicitly unverified. Independent review checks full integrated changes separately from implementation ownership. Maintainer acceptance follows observed evidence; no implicit release.

## RACI and release boundary

- Requesting maintainer: accountable for product direction and human acceptance; any merge/deploy/publish requires matching authorization.
- Orchestrator: accountable for decomposition, integration acceptance, verification evidence, and reporting limitations.
- Slice implementers: responsible for owned changes and focused behavioral proof.
- Independent reviewer: responsible for contract compliance and quality review, not self-approval of implementation.

Repository-only change. No migration, feature flag, telemetry rollout, or production activation is requested.

## Open consequential decisions

| Decision | Owner | Affected slices | Required input |
| --- | --- | --- | --- |
| Execution approach | Requesting maintainer | Implementation slices 1–5 | Selected: Subagent-Driven execution approved on 2026-11-02 |

Technical direction is settled by the approved brief. Browser-host availability is a verification prerequisite, not a reason to redesign or shrink scope.

## Status and handoff

feature_status: requirements_ready
repository_status: PRD and bounded delivery plan saved
activation_status: not_required
next_workflow: implementation-readiness

Handoff carries the approved brief, this PRD, formal trace IDs (REQ-001..004, AC-001..007), medium SNC, standard delivery mode, evidence limitations, scope fence, ownership, and confirmed Subagent-Driven execution approach. No unresolved API/storage contract requires a separate SRS. With Subagent-Driven selected, readiness checks the existing motion, test, catalog-generation, and browser prerequisites without reopening product direction.

## References and cost

- [Approved Direction brief and evidence ledger](../brd/brd-landing-page-interaction-polish.md)
- Source locations and observed preview commands are preserved in that brief; no rediscovery claimed.
- `get_session_cost(workflow="plan-feature")` requested for this handoff. Exact host token usage and billing are unavailable; no monetary estimate asserted.
