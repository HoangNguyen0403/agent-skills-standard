# Stitch design review and creation for family (parent + child) products

Date: 2026-09-29. Ships in `common-v2.8.0` and `workflows-v1.1.0`. Neither tag exists yet
(`common-v2.7.0` and `workflows-v1.0.0` are tagged).

## Problem

The team designs in Google Stitch rather than Claude Design. Stitch output looks polished but reads
machine-made, and the registry has nothing that judges it against the audience. Two products are in
scope: **Our Children** (parent-only family health and memories app, Stitch project
`553376631581211302`) and **Wonderlens** (not yet designed; child-facing). Both target Vietnamese
parents of children aged **3+**, on **phone and tablet**.

The review of Our Children on 2026-09-29 (88 screens, 51 titles, read over Stitch MCP) found:

| Class | Finding | Evidence |
| --- | --- | --- |
| Blocker | Content is infant-age (9-month milestones, "10 Months 2 Days Old") for a 3+ product | Developmental Roadmap, Health Hub, Memories |
| Blocker | White text on the brand tan `#c5a581` is 2.31:1 on every primary button | design system `customColor`, 48/51 screens |
| Blocker | "AI VERIFIED" on a prescription, AI treatment advice, "PREMIUM" badge on a doctor | Enhanced AI Medical Details |
| Major | 4 primary colours and 4 font families; project design system had an empty `designMd` | HTML `tailwind.config` per screen |
| Major | Bottom navigation differs per screen (three different tab sets) | Health Hub, Roadmap, Visit Details |
| Major | English and Vietnamese mixed on one screen; Vietnamese form uses `mm/dd/yyyy` | Quick Add, Create Child Profile |
| Major | Up to 26 `text-xs` or 10–11px texts per screen; icon buttons without accessible names; 10 sub-44px targets on one form | HTML audit |
| Major | 0 TABLET screens; 14 "Main Dashboard" and 11 "User Settings Hub" versions, titles wrong | `list_screens` |
| Human feel | Vietnamese child with English parents; birth date contradicts stated age; four illustration styles on one timeline; empty image placeholders; hint text "PINCH TO ZOOM" | Child Profile, Memories, Main Dashboard |

Existing skills push the wrong way for this audience: `common-ui-design` asks for bold, maximalist,
dramatic-shadow aesthetics; Google's `taste-design` bans emoji and mandates perpetual micro-motion.
Google's `stitch-skills` cover driving Stitch, not judging fitness for families.

## Scope

Two skills in `common`, two opt-in workflows, evals, one read-only audit script, docs, CHANGELOG.

Out of scope: any change under `cli/` or `mcp/` beyond workflow registration constants; bundling or
vendoring Google's `stitch-skills`; adding Stitch to the repo `.mcp.json`; storing product
`DESIGN.md` files in this registry (they live in each product repo); Figma.

## A. Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Skill split | `common-stitch-design` (tool + DESIGN.md mechanics) and `common-family-ux` (audience judgement) | Stitch mechanics are product-agnostic; the family rubric also applies to screenshots from Figma or a running app. |
| Workflows | `review-stitch-design`, `create-stitch-design`; not in `DEFAULT_WORKFLOWS` | Opt-in design lane, not part of the SDLC spine. |
| Write safety | Review never edits originals: `generate_variants` (`REFINE`) or a new design system; destructive tools (`delete_project`, `update_design_system` on an existing asset, `apply_design_system` to originals) need explicit approval | Stitch has no undo over MCP. |
| DESIGN.md format | Google `design.md` spec (YAML tokens + 8 ordered sections), gated by `npx @google/design.md lint` with 0 errors and 0 warnings | Its `contrast-ratio` rule catches the Blocker class above mechanically. |
| Upload path | `create_design_system` with `theme.designMd` (plain string), then `update_design_system` on the **new** asset | Avoids base64; new asset leaves the old system intact. |
| Parent vs child surface | Rubric has two profiles; a product declares which it has | Our Children = parent-only; Wonderlens = child surface behind a parent gate. |
| Tablet | Required device class; `TABLET` generation must produce a two-pane / rail layout, not a stretched phone | 0 tablet screens today. |

## B. `common-family-ux` skill

`skills/common/common-family-ux/` — `SKILL.md` (≤500 tokens), `references/rubric.md`,
`references/child-surface.md`, `references/human-feel.md`, `evals/evals.json`.

Keywords: `family app`, `parents and children`, `kids app`, `child ux`, `parent gate`, `preschool`,
`toddler ui`, `coppa`, `designed for families`. No file globs (design artifacts have no extension).

Rubric, six axes, each scored 0–3 with evidence:

1. **Audience fit** — declared age band matches content and examples; parent and child surfaces separated; parent gate before settings, purchases, external links, data deletion.
2. **Accessibility** — text contrast ≥4.5:1 (≥3:1 large), status never colour-only, body ≥16px, labels ≥14px, targets ≥48px (parent) / ≥64px (child 3–6), accessible names on icon buttons, reduced-motion respected.
3. **Safety and trust** — no dark patterns; generated or AI content visibly labelled and separated from clinician-recorded data; no "verified" claims without a source; destructive actions two-step with export/restore; child data minimisation (Apple Kids Category, Google Play Families, COPPA wording) flagged `needs validation` rather than asserted as compliant.
4. **Comfort** — calm palette, one accent, no countdown timers, streak guilt or red badges for non-urgent items, natural stopping points on child surfaces.
5. **Consistency and convenience** — one design system; identical navigation on every top-level screen; one language per screen; locale dates and units; primary action in the thumb zone; ≤3 taps to log a common event; tablet two-pane.
6. **Human feel** — coherent sample people (names, ages, dates agree; locale-appropriate); one illustration style; no empty placeholders; no filler hint text; no AI copy clichés; no invented metrics.

Child surface (ages 3–6) rules in `child-surface.md`: icon + voice prompt for pre-readers, no text-only
instructions, drag distances short, no hidden gestures, rewards are sticker/animation moments rather
than points or streaks, sessions end with a calm hand-back to the parent.

Severity ladder: Blocker (fails audience fit, safety, or AA contrast on a primary action), Major,
Minor, Human-feel. Each finding row: severity, axis, screen, evidence, consequence, smallest fix,
ready-to-run Stitch edit prompt.

## C. `common-stitch-design` skill

`skills/common/common-stitch-design/` — `SKILL.md`, `references/stitch-mcp.md`,
`references/design-md.md`, `references/prompting.md`, `scripts/audit_html.mjs`, `evals/evals.json`.

Keywords: `stitch`, `google stitch`, `stitch mcp`, `design.md`, `stitch screen`, `stitch variants`.
Files: `DESIGN.md`, `.stitch/**`.

- `stitch-mcp.md`: setup (`X-Goog-Api-Key` header, `https://stitch.googleapis.com/mcp`, omp / Claude Code / Codex config), tool table with read-only vs write flag (15 tools observed), `get_screen` returns signed `screenshot.downloadUrl` (append `=w390` for phone, `=w1280` desktop) and `htmlCode.downloadUrl`; `generate_*` may time out — poll `get_screen` every 30 s up to 10 times, never retry blindly; `apply_design_system` needs screen **instance** ids from `get_project`, not screen ids. Observed 2026-09-29: variant calls take about 4 minutes; `outputComponents[].design.screens` also carries generated illustration `IMAGE` screens (null `deviceType`) that must be filtered out; a `TABLET` request came back labelled `DESKTOP` at 2560×2048, so the device class is verified from the screenshot, not the label.
- `design-md.md`: section order, token naming, contrast-pair rule (every `backgroundColor`/`textColor` component pair must pass lint), `designMd` vs base64 upload paths.
- `prompting.md`: generation prompts carry layout and content only; edit/variant prompts may carry hex; one shared fix block plus per-screen specifics; `REFINE` for fixes, `EXPLORE` for new device classes. Observed: `REFINE` fixed contrast, language, sample data, navigation and AI labelling in one pass but did **not** enforce minimum text size (12px `text-xs` stayed on 4 of 6 screens), and "every icon button has a visible text label" produced wrapped two-line top-bar labels — standard back/notification icons need an accessible name, not a visible label.
- `scripts/audit_html.mjs` (Node ≥18, no dependencies, read-only): input a directory of downloaded screen HTML; output JSON per screen — primary colour, font families, text-size violations (Tailwind `text-xs` is 12px and counts), sub-44px targets, icon-only buttons without `aria-label`, text colour used on `bg-primary`, language mix, and WCAG contrast of the primary against white and ink. Exit 0 clean, 3 findings, 1 bad input. This replaces the throwaway scripts used in the 2026-09-29 review.

## D. Workflows

`.agents/workflows/review-stitch-design.md` (≤80 lines):

1. Preflight: Stitch tools present, else `BLOCKED (stitch-mcp)` with the setup reference. Load `common-stitch-design`, `common-family-ux`, `common-accessibility`, `common-mobile-ux-core`.
2. Scope: `list_projects` → `list_screens`; group by title; pick the current version per title with the author (default: most recent); declare surface profile and age band.
3. Collect: download screenshot and HTML per selected screen to `.stitch/review/<date>/`; run `audit_html.mjs`; read `list_design_systems`.
4. Score: rubric per screen plus project-level findings; lexical audit results are evidence, visual judgement cites the screenshot. Cross-screen data check: allergies, conditions, names, ages and dates must agree across every screen — generation invents contradictions (observed: a tablet screen stated "no severe allergy" for a child with a severe peanut allergy).
5. Gate: present findings and proposed fixes; wait for approval.
6. Improve: write or repair `DESIGN.md` → lint → new design system; `generate_variants` `REFINE`, `variantCount: 1`, for approved screens; `TABLET` via `EXPLORE` when tablet is missing.
7. Re-score the variants with the same audit and rubric; fix residual findings with `edit_screens` on the **variants only**; stop after 2 fix passes and report what remains. Report before/after per axis with screen ids.

`.agents/workflows/create-stitch-design.md` (≤80 lines):

1. Brief: product, surfaces (parent / child), age band, locale, devices, core tasks (≤5), tone. Max 3 blocking questions.
2. DESIGN.md from `common-family-ux` guardrails + brief → lint 0/0.
3. `create_project` (or existing) → `create_design_system` with `designMd` → `update_design_system` on it.
4. Generate core screens per device class (`MOBILE`, `TABLET`) with layout/content-only prompts.
5. Run `review-stitch-design` steps 3–7 as the acceptance gate.

Both expose `Runtime Contract`, `Handoff Payload`, `Blocking Questions`, `Output Template`, `Next Workflow`
(`create-stitch-design` → `review-stitch-design` → `plan-feature` or `implement-feature`).

Registration: canonical files only (sync exports), `scripts/audit-sdlc.ts` entries, `sdlc.md` routing
line ("Stitch design needs review or a new design" → these), `docs/sdlc-workflow-quick-reference.md`,
bump `releases.workflows.version` to `1.1.0`, `common` to `2.8.0`, regenerate `skills/common/_INDEX.md`.

## E. Evals

`common-family-ux`: (1) parent app shows infant milestones and white-on-tan buttons for a 3+ audience — must flag audience fit and contrast; (2) AI summary with "verified" badge on a prescription — must require labelling and separation; (3) child game with a 30-second countdown and streak — must reject urgency; should-not-trigger: a B2B dashboard review.
`common-stitch-design`: (1) set up Stitch MCP in omp — config shape and header; (2) fix a design in place — must choose variants or a new design system, not overwrite; (3) `apply_design_system` with a screen id — must use instance id from `get_project`.

## F. Verification

- `pnpm calculate-tokens` — both SKILL.md ≤500 tokens.
- `pnpm audit:sdlc` — both workflows pass line and section rules.
- `node skills/common/common-stitch-design/scripts/audit_html.mjs <dir>` against HTML downloaded from project `553376631581211302` reproduces the review's contrast (2.31:1) and icon-label counts.
- `npx @google/design.md lint` on the Our Children `DESIGN.md` — 0 errors, 0 warnings (achieved 2026-09-29).
- `pnpm evals:audit`; existing test suites green.

## G. Already done (2026-09-29, outside the registry)

- Stitch project `553376631581211302`: new design system `assets/17789959730017738803` ("Our Children — Family Calm v1") with the linted `DESIGN.md`; old system `assets/14802853761921512067` untouched.
- `REFINE` variants for Health & Development Hub, Child Profile, Memories Timeline, Visit Details, Emergency Card, plus one `TABLET` `EXPLORE` Health Hub. Originals untouched. One `edit_screens` fix pass on 5 of those variants (text size, avatars, tablet allergy contradiction, button consistency).
