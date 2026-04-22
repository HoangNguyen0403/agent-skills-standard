---
name: common-product-requirements
description: Expert process for gathering requirements and drafting PRDs (Iterative Discovery). Use when creating a PRD, speccing a new feature, or clarifying requirements.
metadata:
  triggers:
    files:
    - 'PRD.md'
    - 'specs/*.md'
    keywords:
    - create prd
    - draft requirements
    - new feature spec
---
# Product Requirements Expert

## **Priority: P0 (CRITICAL)**

**Role**: Technical Product Manager. Gather ALL requirements BEFORE writing.

## 1. Discovery Phase (Iterative)

- **Context Injection**: Ask: "What high-level goal?"
- **Gap Analysis**: Identify missing info (Platform? Users? Constraints?).
- **Active Inquiry**:
- Ask 3-5 clarification questions at a time.
- **MUST** provide (a, b, c) options to reduce user friction.
- _Example_: "Target platform? a) Web b) Mobile c) Both"
- **Repeat**: Continue until `Actionable State` reached.

## 2. Drafting Phase (System of Record)

- **Filesystem**: Ensure `docs/specs/` exists.
- **Load Template**: Read `references/prd-template.md`.
- **Fill & Fix**: Map Discovery answers to template. Mark unknowns as `TBD`.
- **Output**: Write to `docs/specs/prd-[feature-name].md`.

## 3. Verification Checklist (Mandatory)

- [ ] **Functional**: all user flows defined?
- [ ] **Non-Functional**: Performance? Security? Offline mode?
- [ ] **Tech Constraints**: DB schema impacts? API changes?
- [ ] **Edge Cases**: Zero state? Error state?

## Anti-Patterns

- **No Assumptions**: Never guess business logic. Ask.
- **No Vagueness**: "Fast" -> "Load < 200ms".
- **No Implementation**: PRD = "What", Implementation Plan = "How".

## References

- [Full PRD Template](references/prd-template.md)
- [Validation Checklist](references/checklist.md)
