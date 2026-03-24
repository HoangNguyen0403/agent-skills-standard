---
name: quality-engineering-business-analysis
description: "Investigate requirements with atomic AC decomposition, actor/permission matrix, platform parity audit, truth table verification, and edge case discovery. Use when writing test cases or impact analysis — especially for stories with multi-condition AC, feature toggles, market variants (VN/MY/SG), or undefined platform behavior. (triggers: **/user_story.md, acceptance criteria, AC, business rules, jira story, toggle, market)"
---

# Business Analysis Standards (Deep Analysis)

## **Priority: P0 (CRITICAL)**

## 1. Deep Investigation Protocol

- **Atomic AC Decomposition**: Split **Acceptance Criteria (AC)** into **1-Condition** logic units (e.g., "User can X and Y" -> "User can X", "User can Y").
- **Variable Identification**: Extract all **Feature Toggles**, **Market Rules** (VN/MY/SG), and **User Roles**.
- **Platform Parity**: Verify if logic applies to both **Web** and **Mobile**; Flag divergent behavior early.
- **Truth Table Verification**: Map complex multi-condition logic to a **Logic Truth Table**.

## 2. Dynamic Actor & Permission Mapping

- Identify all **Actors** (e.g., `Customer`, `Sales Rep`, `Admin`).
- Use an **Actor/Permission Matrix** to map specific constraints per Actor.
- [Permissions Patterns](references/analysis_patterns.md)

## 3. Edge Case & Boundary Analysis

- **State Validation**: Verify behavior across all entity (e.g., `Active`, `Suspended`) and network states.
- **Boundary Detection**: Analyze **currency**, **date**, and **count limits**.
- **Negative Testing**: Identify flows for **Unauthorized Access**, **Invalid Input**, and **Null-safety**.

## 4. Anti-Patterns

- **No Surface Reading**: investigate the _implications_, don't just restate.
- **No Assumption**: Flag undefined states (e.g., Offline) as P0 blockers.
- **No Loose Mapping**: Ensure AC aligns 100% with Technical Impact notes.
