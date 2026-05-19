---
name: quality-engineering-business-analysis
description: 'Investigate requirements with atomic AC decomposition, actor/permission matrix, platform parity audit, truth table verification, and edge case discovery. Also enforces User Story authoring standards: story structure, scope fences, platform tags, toggle contracts, market isolation, and deferral patterns. Use when writing, reviewing, or improving User Stories, acceptance criteria, or doing impact analysis — especially for stories with multi-condition AC, feature toggles, market variants (VN/MY/SG), or undefined platform behavior.'
metadata:
  triggers:
    files:
    - '**/user_story.md'
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

- **Atomic AC Decomposition**: Split **Acceptance Criteria (AC)** into **1-Condition** logic units (e.g., "User can X and Y" -> "User can X", "User can Y").
- **Variable Identification**: Extract all **Feature Toggles**, **Market Rules** (VN/MY/SG), and **User Roles**.
- **Platform Parity**: Verify if logic applies to both **Web** and **Mobile**; Flag divergent behavior early.
- **Truth Table Verification**: Map complex multi-condition logic to **Logic Truth Table**.

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
- **No Assumption**: Flag undefined states (e.g., Offline) as P0 blockers.
- **No Loose Mapping**: Ensure AC aligns 100% with Technical Impact notes.

## 5. User Story Authoring Standards

- **Story Structure**: Every story must use `As a [Actor], I want [Goal], so that [Value]`.
- **AC Format**: Each AC must one `Given / When / Then` block — one condition per block.
- **Platform Tag**: Prefix each AC with `[WEB]`, `[MOBILE]`, or `[BOTH]` — never mix platforms in one AC block.
- **Toggle Contract**: Each feature flag AC must name flag and state: `Toggle: <FlagName> = ON/OFF`.
- **Market Isolation**: Any market-specific AC must prefixed `[Market: VN]`, `[Market: MY]`, etc.
- **Scope Fence**: Include explicit `## In Scope`, `## Out of Scope`, and `## Deferred` sections. Deferred items must link to Jira ticket — never write "to discuss".
- **Translation AC**: Language/locale behavior separate AC, not inline note.

See [User Story Template](references/user_story_template.md) for full authoring template.

## 6. Anti-Patterns (Story Authoring)

- **No mixed-platform AC**: `[MOBILE ONLY]` buried inline hides parity gaps — use platform tags.
- **No "to discuss"**: Replace with linked Jira ticket in `## Deferred`.
- **No implicit toggle states**: Always declare both ON and OFF behavior per AC.
- **No bundled AC**: "User sees X and Y and Z" → split into three separate AC blocks.

## 7. Validation Checklist

Run after authoring or reviewing any User Story before marking it ready for development:

- [ ] Every AC `[WEB]`, `[MOBILE]`, or `[BOTH]` platform tag
- [ ] Every toggle AC declares both `= ON` and `= OFF` states explicitly
- [ ] No AC block contains more than one `And` condition (split if it )
- [ ] No "to discuss" text anywhere — replaced by Jira link in `## Deferred`
- [ ] Story `## In Scope`, `## Out of Scope`, and `## Deferred` sections
- [ ] Story uses `As a / I want / So that` header
- [ ] Market-specific ACs prefixed `[Market: VN]`, `[Market: MY]`, etc.
- [ ] Translation / locale behavior its own AC or deferred with Jira link