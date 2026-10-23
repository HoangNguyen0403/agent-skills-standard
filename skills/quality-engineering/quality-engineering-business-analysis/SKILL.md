---
name: quality-engineering-business-analysis
description: "Investigate requirements via atomic AC decomposition, actor/permission matrices, and truth-table edge cases; enforce User Story standards (scope fences, platform tags, toggles). Use when writing/reviewing Stories or AC with multi-condition logic, feature toggles, or market variants (VN/MY/SG)."
metadata:
  triggers:
    files:
      - "**/user_story.md"
    keywords:
      - acceptance criteria
      - AC
      - business rules
      - jira story
      - toggle
      - market
      - write user story
      - improve user story
      - review story
      - BA
---

# Business Analysis Standards (Deep Analysis + Story Authoring)

## **Priority: P0 (CRITICAL)**

## 1. Deep Investigation Protocol

- **Behavior-Based AC Decomposition**: Define **Acceptance Criteria (AC)** around **one observable behavior** per AC; multiple necessary preconditions are permitted. Do NOT split based solely on the word 'And' or condition counts.
- **Variable Identification**: Extract all **Feature Toggles**, **Market Rules** (VN/MY/SG), and **User Roles**.
- **Platform Parity**: Verify if logic applies to both **Web** and **Mobile**; Flag divergent behavior early.
- **Truth Table Verification**: Map interacting conditions to a **Logic Truth Table**; escalate policy decisions to owners rather than selecting business policy silently.

## 2. Dynamic Actor & Permission Mapping

- Identify all **Actors** (e.g., `Customer`, `Sales Rep`, `Admin`).
- Use **Actor/Permission Matrix** to map specific constraints per Actor.
- [Permissions Patterns](references/analysis_patterns.md)

## 3. Edge Case & Boundary Analysis

- **State Validation**: Verify behavior across all entity (e.g., `Active`, `Suspended`) and network states.
- **Boundary Detection**: Analyze **currency**, **date**, and **count limits**.
- **Negative Testing**: Identify flows for **Unauthorized Access**, **Invalid Input**, and **Null-safety**.

## 4. Anti-Patterns (Analysis)

- **No Surface Reading**: investigate _implications_, don't restate.
- **No Unowned Unknowns**: Carry confirmed evidence and explicit non-critical assumptions. Consequential undefined states block only affected slices (naming owner, consequence, and required input); preserve PARTIAL readiness boundaries. Sensitive changes require technical design and explicit human/governance approval per [requirements modeling §1](../../product-management/product-requirements/references/requirements-modeling.md#1-applicability--sizing-gate), not blanket P0 blocking.
- Consume [shared requirements modeling](../../product-management/product-requirements/references/requirements-modeling.md#7-conflict-validation-and-transition-needs) for preserved stakeholder conflicts, quality review versus need validation, and applicable temporary transition needs; retain existing IDs and only reopen affected slices.
- For general BA/elicitation requests requiring confirmation of captured meaning, directly load the BRD-owned [analysis and elicitation procedure](../../product-management/product-business-requirements/references/analysis-planning-and-elicitation.md) without requiring brainstorm-feature or full BRD intake. Participant confirmation does not imply approval.
- **No Loose Mapping**: Ensure AC aligns 100% with Technical Impact notes.

## 5. User Story Authoring Standards

- **Story Structure**: Every story must use `As a [Actor], I want [Goal], so that [Value]`.
- **AC Format**: Each AC must use one `Given / When / Then` block representing one observable behavior; multiple necessary preconditions are permitted.
- **Platform Tag**: Prefix each AC with `[WEB]`, `[MOBILE]`, or `[BOTH]` — never mix platforms in one AC block.
- **Toggle Contract**: Each feature flag AC must name flag and state: `Toggle: <FlagName> = ON/OFF`.
- **Market Isolation**: Any market-specific AC must prefixed `[Market: VN]`, `[Market: MY]`, etc.
- **Scope Fence**: Include explicit `## In Scope`, `## Out of Scope`, and `## Deferred` sections. Deferred items must link to Jira ticket — never write "to discuss".
- **Translation AC**: Language/locale behavior separate AC, not inline note.

See [User Story Template](references/user_story_template.md) for full authoring template.

## 6. Anti-Patterns (Story Authoring)

- **No mixed-platform AC**: `[MOBILE ONLY]` buried inline hides parity gaps — use platform tags.
- **No "to discuss"**: Replace with linked Jira ticket in `## Deferred`.
- **No implicit toggle states**: Require applicable ON and OFF coverage across the story AC set; each individual AC names its own state (e.g., `Toggle: <FlagName> = ON`).
- **No multi-behavior bundling**: Split distinct user actions/outcomes into separate AC blocks; do not split single behaviors with multiple preconditions.

## 7. Validation Checklist

Run after authoring or reviewing any User Story before marking it ready for development:

- [ ] Every AC `[WEB]`, `[MOBILE]`, or `[BOTH]` platform tag
- [ ] Toggle features cover applicable ON and OFF states across the AC set (each individual AC naming its own state)
- [ ] Each AC verifies one observable behavior (multiple necessary preconditions allowed; do not split solely on 'And')
- [ ] No "to discuss" text anywhere — replaced by Jira link in `## Deferred`
- [ ] Story `## In Scope`, `## Out of Scope`, and `## Deferred` sections
- [ ] Story uses `As a / I want / So that` header
- [ ] Market-specific ACs prefixed `[Market: VN]`, `[Market: MY]`, etc.
- [ ] Translation / locale behavior its own AC or deferred with Jira link

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:

- Actor
- Mobile
- Variable

- Additional task-grounded exact anchors: Truth table
