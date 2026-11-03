# Brief: Landing-page interaction polish and coverage clarity

slug: landing-page-interaction-polish
operator_profile: technical
lane: direction
snc_tier: medium
model_tier: standard
approval: approved(requesting maintainer, 2026-11-02)
repository_status: approved brief saved
activation_status: not_required

## Contract

**Outcome:** Visitors can follow landing-page navigation, understand the illustrative routing walkthrough, copy concise setup commands, and identify relevant supported capabilities without leaving the page just to determine scope.

**Owner / sponsor / validation owner:** Requesting maintainer (assumed). Implementation and delivery dates are not committed by this brief.

**Sizing:** SNC: S=1 N=2 C=0 total=3 tier=medium. Several files in one peripheral website module; selection-triggered animation, command typing, and coverage presentation add behavior. CLI package behavior and registry contents stay unchanged.

### You said

- Pull latest develop before work.
- Add animation for clicks and section jumps.
- Animate the walkthrough and change its data when an example is clicked.
- Type the displayed commands; recommend npm installation and the `ags` alias.
- Show supported programming languages/frameworks and distinguish specialist agents, product management, and quality engineering.

### Assumed defaults

- Preserve existing dark ink/paper/lime aesthetic, typography, section narrative, and responsive layout; polish rather than redesign.
- “Jumping” means in-page anchor navigation, not page-route transition effects.
- Animate commands once on entry, not an endless terminal loop. Keep complete commands available to copying and assistive technology throughout.
- Recommend global npm installation; retain a clearly secondary no-global-install npx alternative.
- Keep the walkthrough illustrative, not live agent execution. Preserve the existing TypeScript, React, and Go examples.

### Capability inventory and trace seed

| Capability | Requirement Ref | Rationale | Out-of-scope pair |
| --- | --- | --- | --- |
| Navigate sections with coherent motion | REQ-001 | Make clicks and destinations visually legible | Site-wide redesign or routing architecture |
| Switch and animate routing examples | REQ-002 | Connect selected trigger to resulting guidance | Live agent execution or backend |
| Learn and copy concise setup commands | REQ-003 | Reduce setup ambiguity | Changing CLI binaries or package publishing |
| Discover supported capability groups | REQ-004 | Explain coverage beyond one specimen | New registry skills or runtime-support promises |

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

### Acceptance criteria

- **AC-001 / REQ-001:** Header, mobile-menu, and CTA in-page links scroll smoothly with the fixed-header offset; native hash/deep-link/history behavior remains usable. Existing destination-focus behavior is preserved. Pointer press and keyboard focus states remain visible, with no layout movement caused by feedback.
- **AC-002 / REQ-002:** Selecting each TypeScript/React/Go example updates filename, matching pattern, category index, skill name/path, rule excerpt, and source link to one coherent selected example. Selection starts one bounded routing transition without requiring Replay. Rapid switching ends on the last selected example, without stale content or accumulating animation work; existing Replay remains usable.
- **AC-003 / REQ-003:** Primary setup displays `npm install -g agent-skills-standard@latest`, followed by `ags init` and `ags sync`, with accurate step labels and prerequisite copy. Existing supported npx init/sync commands remain secondary alternatives. Copy always yields the complete selected command, including during animation. Copy feedback and error behavior are preserved.
- **AC-004 / REQ-003:** Command text has one bounded typewriter reveal on entry, reserved geometry, and no repeated screen-reader announcements per character. Re-entry does not endlessly replay it. With JavaScript disabled or before hydration, full commands remain readable.
- **AC-005 / REQ-004:** An in-page supported-coverage area, reachable from Skills navigation, presents distinct groups for languages, frameworks/platforms, specialist agents, product management, and quality engineering. Every displayed entry corresponds to current canonical registry material and links to its appropriate source/catalog. Languages and frameworks are visibly distinguished; a TypeScript-only specimen is not presented as the full catalog.
- **AC-006 / REQ-004:** Coverage copy distinguishes guidance skills, specialist roles/subagents, and workflows. It does not imply that all catalog capabilities install by default or that every host supports identical specialist dispatch. Product-management optional capabilities are distinguishable from the default BRD/PRD foundation. Do not publish unverified headline counts.
- **AC-007 / REQ-001, REQ-002, REQ-003, REQ-004:** Reduced-motion users receive immediate stable content and nonanimated navigation. All controls remain keyboard operable with meaningful selected/focus states. Desktop and narrow/mobile layouts retain readable paths and commands, without horizontal page overflow or transient blank walkthrough content.

### Constraints and non-goals

CSS-first motion that reuses the current bounded MotionObserver lifecycle; avoid adding a motion dependency for this scope. Preserve static export, source links, clipboard behavior, accessibility, and existing performance safeguards. Do not animate arbitrary external links or pretend commands execute. No analytics, conversion claims, package execution, production deployment, budget authorization, or registry/CLI changes.

## Context and value

**Audience:** Developers and engineering teams evaluating portable agent guidance and setting up a repository.

**AS-IS → TO-BE:** Existing static commands and a single skill specimen become a concise install path and browsable coverage overview. Existing example data switching gains selection-linked motion; existing navigation gains coherent feedback.

**Value hypothesis:** Clearer setup and coverage reduce evaluation friction (assumed; no measured conversion baseline).

**Verification target:** Before delivery acceptance, demonstrate all seven acceptance criteria on a local preview, including desktop/mobile, keyboard, reduced motion, copy during typing, and rapid selection. No business SMART metric is asserted for this Direction-lane brief.

## Options and recommendation

**Recommend: bounded polish using existing components and motion lifecycle.** Add section scrolling/press feedback, connect selection to bounded walkthrough motion, add progressive-enhancement command typing, and add registry-backed grouped coverage. Assumption: existing static content and motion infrastructure can accommodate the changes. First failure condition: selection motion cannot restart without stale state or duplicate work. Worst plausible outcome: inaccessible or unstable navigation/demo content. Mitigate through the stated behavioral verification and immediate reduced-motion fallback. Cost to abandon: local website changes only; no migration or external activation.

**Rejected: redesign, continuously looping terminal demos, live runtime walkthrough, or animation library migration.** None is needed for the requested outcome; each adds unrelated complexity or changes the illustrative contract.

**Defer/do nothing:** Preserves current usability but leaves the requested interactions and coverage ambiguity unresolved; not recommended for this request.

## Evidence ledger

| Claim | Status |
| --- | --- |
| `git pull --ff-only origin develop` completed with `ok (up-to-date)` before discovery; initial checkout status listed no file changes | confirmed(session command output) |
| Page is composed of server-rendered sections and client interaction islands | confirmed(website/src/landing/LandingPage.tsx:1-46; website/src/app/page.tsx:1-6) |
| Selection updates selectedSkillId; Replay dispatches a separate motion event | confirmed(website/src/landing/RoutingFigure.client.tsx:12-36,77-110) |
| TypeScript/React/Go examples already contain distinct routing data | confirmed(website/src/landing/hero-examples.data.ts:1-69) |
| Existing motion has lifecycle/reduced-motion handling and filename animation | confirmed(website/src/landing/MotionObserver.client.tsx; website/src/landing/hero-routing.module.css:63-141) |
| Anchor links use native destinations and an 80px scroll margin; no smooth-scrolling rule found by scoped source lookup | confirmed(website/src/landing/sections/Header.tsx:11-40; website/src/landing/MobileMenu.client.tsx:30-60; website/src/landing/landing.module.css:140-144) |
| Quick start currently uses two long npx commands and two-step copy | confirmed(website/src/landing/content.ts:104-113,289-294; website/src/landing/sections/QuickStartSection.tsx:7-74) |
| npm package already exposes both command names to the same entrypoint | confirmed(cli/package.json:2-9) |
| Existing global-upgrade guidance uses npm install -g | confirmed(cli/src/commands/upgrade.ts:238-245) |
| Skills destination currently presents one TypeScript specimen rather than grouped registry coverage | confirmed(website/src/landing/sections/SpecimenSection.tsx:6-65; website/src/landing/LandingPage.tsx:1-46) |
| Registry includes specialist, product-management, and QE indexes | confirmed(skills/specialists/_INDEX.md; skills/product-management/_INDEX.md; skills/quality-engineering/_INDEX.md) |
| Specialists sync separately as subagents; host capabilities differ | confirmed(cli/src/commands/sync.ts:184-212; docs/agent-capabilities.md:7-19) |
| Default product-management selection is BRD/PRD foundation, not every optional capability | confirmed(cli/src/services/CategoryDefaults.ts:3-25) |
| Existing README counts are inconsistent; exact public coverage counts need authoritative derivation | confirmed(README.md:289-319, scoped scout lookup) |
| No applicable existing landing-page BRD/PRD/SRS or canonical product evidence ledger was found in scoped discovery | confirmed(scoped scout lookup); not proof of absence outside searched checkout |
| Global npm install plus ags should be the recommended presentation | assumed; proposed public-contract change awaiting brief approval |
| Actual animation appearance and user conversion impact | unknown; browser host disconnected, no conversion experiment performed |

## Delivery context and risks

- Stakeholders: requesting maintainer approves direction; website implementer owns UI delivery; separate reviewer checks acceptance and regressions; visitors include keyboard and reduced-motion users.
- Cost-benefit: bounded website-only implementation; improved clarity is a hypothesis, not measured ROI. No budget or delivery estimate is approved.
- Risk: competing scroll/focus behavior. Owner: website implementer. Mitigation: preserve native anchors and verify mobile menu, deep links, and Back.
- Risk: animation hides content or copy grabs partial text. Owner: website implementer. Mitigation: semantic full command with presentation-only motion and complete copy source.
- Risk: catalog listing drifts or overstates defaults/runtime support. Owner: website maintainer. Mitigation: canonical registry-derived data, source links, qualified optional/default labels, no handwritten counts.
- Risk: long paths/commands overflow or rapid selections race. Owner: website implementer. Mitigation: reserved geometry, wrapping, and rapid-switch/mobile scenarios.
- Glossary: `ags` = shipped CLI binary alias; skill = task/file-triggered guidance; specialist = role exported as a host-specific subagent surface; walkthrough = curated illustrative routing, not execution.

## Verification performed for intake

- Safely pulled origin develop with ff-only; already up to date.
- First `pnpm website:dev` failed because Next/dependencies were missing.
- `pnpm --filter @ags/website... install --frozen-lockfile` succeeded, then `pnpm website:dev` reported Ready on port 3000.
- `curl --max-time 60 -I http://localhost:3000/` returned HTTP 200.
- Browser opened but returned empty snapshots; wait timed out and loopback retry reported a disconnected browser host. No visual or interactive behavior is claimed verified.
- No website implementation, build, lint, typecheck, or automated behavior tests performed in this intake.

## PM handoff checklist

- [x] All four requested capabilities retained; existing behaviors distinguished from requested additions.
- [x] Scope fence, assumptions, evidence, risk owners, and acceptance scenarios recorded.
- [x] No duplicate editable product ledger or invented product IDs created.
- [x] Maintainer approves this exact direction brief.
- [x] plan-feature derives PRD, source ownership, and verification plan from REQ-001 through REQ-004; see ../prd/prd-landing-page-interaction-polish.md.
- [x] Settle execution approach: Maintainer selected Subagent-Driven execution on 2026-11-02.
- [ ] Restore a responsive browser connection for desktop/mobile interaction proof before implementation acceptance.
- [ ] Independently review implemented behavior; maintainer validates the local result before any separately authorized release.

## Approval

Approved by the requesting maintainer on 2026-11-02 via the chat reply “ok” to this brief. Approval applies only to this brief, not implementation approach, spending, exposure, publishing, merge, or deployment.

## Outcome report

```yaml
schema_version: 1
run_id: brainstorm-landing-page-interaction-polish-20261102
slug: landing-page-interaction-polish
workflow: brainstorm-feature
feature_status: requirements_ready
operator_profile: technical
lane: direction
snc_tier: medium
model_tier: standard
approval: approved(requesting maintainer, 2026-11-02)
requirement_trace:
  brd_objectives: []
  requirements: [REQ-001, REQ-002, REQ-003, REQ-004]
  acceptance_criteria: [AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007]
  srs: []
completed_evidence: [develop_pull, source_lookup, alias_declaration, registry_distinctions, preview_http_200]
missing_evidence: [browser_interaction_proof, conversion_baseline]
decision_needed: []
recommended_next_workflow: plan-feature
cost:
  source: MCP_partial
  exact_tokens_and_cost: unavailable
agent:
  identity: omp_orchestrator
  model: openai-codex/gpt-6.1-sol
```

## Open questions

No blocking discovery questions. Maintainer approval confirms the proposed defaults: in-page interpretation of jumping, bounded command motion without loops, global npm installation as primary, grouped coverage preserving the existing specimen.

## Next workflow

`plan-feature`; carry this approved slug, scope, requirement IDs (REQ-001..004, AC-001..007), assumptions, and acceptance criteria forward without reopening settled decisions.

## Cost report

Called `get_session_cost(workflow="brainstorm-feature", model="openai-codex/gpt-6.1-sol")`. MCP telemetry is partial and shared with the lookup session; exact host token usage, pricing, and billed cost are unavailable. No dollar estimate asserted. Compliance audit reported no routed-category coverage gaps.
