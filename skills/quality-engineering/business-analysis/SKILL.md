---
name: Business Analysis
description: Standard for deep requirement investigation, logic validation, and technical impact mapping.
metadata:
  labels: [ba, requirement-analysis, logic-validation, technical-impact]
  triggers:
    files: ['**/user_story.md', '**/requirements.md', '**/jira_*.xml']
    keywords:
      [
        analyze requirements,
        scenario decomposition,
        logic conflict,
        technical impact,
      ]
---

# Business Analysis Standards (Deep Analysis)

## **Priority: P0 (CRITICAL)**

## 1. Deep Investigation Protocol

- **Atomic Decomposition**: Split AC into 1-Condition logic units.
- **Variable Identification**: Extract all Toggles, Market Rules, and User Roles.
- **Platform Parity Audit**: Verify if logic applies to both Web and Mobile; Flag divergent behavior.
- **Truth Table Verification**: Map complex logic to a [Logic Truth Table](references/logic_truth_tables.md).

## 2. Dynamic Actor Mapping

- Identify all Actors (Customer, Sales Rep, Admin).
- Map specific permissions and constraints per Actor.
- [Permissions Patterns](references/analysis_patterns.md)

## 3. Edge Case Discovery

- **State Validation**: Verify behavior across all entity and network states.
- **Boundary Detection**: Analyze currency, date, and count limits.
- **Audit**: Check for null-safety and unauthorized access paths.

## 4. Anti-Patterns

- **No Surface Reading**: investigate the _implications_, don't just restate.
- **No Assumption**: Flag undefined states (e.g., Offline) as P0 blockers.
- **No Loose Mapping**: Ensure AC aligns 100% with Technical Impact notes.
