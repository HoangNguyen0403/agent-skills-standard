---
name: system-design-document
description: "Standardizes high-level design (HLD) and architecture documents for engineering managers, delivery managers, and client product owners. Governs section structure, decision ownership, dataflow arrow directions, top-to-bottom system topology, module boundaries, ETL option comparisons, sign-off criteria, and docx/pdf export rules. Use when writing, structuring, or revising an architecture document, HLD, or solution options comparison."
metadata:
  triggers:
    files:
      - "docs/**/*-design.md"
      - "docs/superpowers/specs/*.md"
    keywords:
      - hld
      - high level design
      - architecture document
      - design document
      - solution options
      - option comparison
      - etl options
      - architecture review comments
---

# System Design Document Standard

## **Priority: P0 (CRITICAL)**

Sets the standard for HLD and architecture documents handed to reviewers (engineering manager, delivery manager, client PO). Complements [system-design-methodology](../system-design-methodology/SKILL.md) and [system-design-review](../system-design-review/SKILL.md).

## Rules

1. **Resolved items leave the list**: Once an open question is answered, move it to Decisions (with evidence). The Open items / Sign-offs section keeps ONLY items needing a named person's agreement as "Agree that..." rows, never open questions.
2. **Declared decision owners**: "Made by" column uses ONLY declared parties (`Vendor`, `Client technical team`, `Client product owner team`, mapped to real names). NEVER "my call", "user", "AI", or role guesses. Credit Client only if decided in discussion; pending choices go to sign-offs.
3. **Data movement arrows**: Arrows show direction of data flow (`source -> job -> staging -> store`), never ownership or "who reads". Label every arrow. NEVER draw an arrow entering a system the design only reads from.
4. **Top-to-bottom HLD**: One top-to-bottom diagram: users -> frontend -> backend (one cross-cutting identity/access layer in front of business modules, then data stores) -> outside systems along the bottom. Maximum ~15 boxes; detail goes to separate diagrams.
5. **Module boundaries & single identity**: One module per capability; no catch-alls ("Schedule", "Common", "Manager"). Authentication and authorization form ONE identity & access layer drawn once in front of all modules, not duplicated. Include a screen/feature -> module table (1:1 mapping).
6. **Solution options parity**: Each option gets its own small diagram with the same shape (`sources -> job -> staging -> store`), a short note, and one unified comparison table sharing identical rows. Recommended option first; fallbacks in stated order with rationale. Include a "verified in repo vs assumed" evidence list.
7. **Configuration vs admin UI**: State explicitly whether settings are hardcoded vendor config files or admin screens; never leave administration implicit.
8. **Revision note**: Document header records version, date, and specific reviewer comments that prompted revisions.
9. **Export integrity (docx/pdf)**: Tables require explicit borders, fixed layout (`w:tblLayout`), content-based column widths fitting the longest word, repeat header row (`w:tblHeader`), and `w:cantSplit`. Blank line before every list in Markdown. Page break before architecture if diagram is tall. Keep Mermaid source beside exported PNG. Visually inspect rendered tables and diagrams before delivery.
10. **Canonical section order**: Follow the 13-section structure in [document template](references/document-template.md).

## Workflow

1. **Intake & Scope**: Capture intent (goals, non-goals, anti-goals), client prerequisites, and revision notes citing reviewer feedback.
2. **Options & Trade-offs**: Model data/ETL options with uniform diagram shapes and comparison criteria; record repo-verified vs assumed facts.
3. **Topology & Boundaries**: Draft top-to-bottom HLD (<=15 boxes), single identity layer, single-purpose modules, and 1:1 screen mapping.
4. **Decisions & Sign-offs**: Assign declared owners to decisions; phrase pending agreements as "Agree that..." rows.
5. **Format & Verify**: Apply export checklist, render docx/pdf, and inspect visual layout before delivery.

## Verify Checklist

- [ ] Revision note references specific reviewer comments.
- [ ] No open questions in sign-offs; all items are "Agree that..." with named owners.
- [ ] Decisions have declared parties (`Vendor`, `Client technical team`, `Client product owner team`).
- [ ] All diagram arrows follow data movement; read-only sources have outgoing arrows only.
- [ ] HLD is top-to-bottom with <=15 boxes and a unified identity & access layer.
- [ ] Screen-to-module table maps each screen to exactly one capability module.
- [ ] Options share identical diagram shapes, comparison rows, and an evidence list.
- [ ] Settings explicitly designated as config files or admin UI.
- [ ] Tables use fixed layout, proper widths, repeated headers, and were visually checked.

## Anti-Patterns

- **Questions in sign-offs**: Leaving open questions instead of moving answered ones to Decisions and pending ones to "Agree that...".
- **Ambiguous decision ownership**: Writing "my call", "AI", or unmapped personal names in Decisions.
- **Backwards/ownership arrows**: Pointing arrows into source systems because "the job queries it".
- **Sprawling HLD**: Exceeding 15 boxes or duplicating Auth/RBAC across individual services.
- **Catch-all modules**: Creating "Schedule" or "Common" buckets that bundle unrelated workloads.
- **Asymmetric options**: Comparing options with different metrics or missing architectural diagrams.
- **Unchecked export**: Shipping docx/pdf with clipped table columns, orphan headers, or broken page breaks.

## References

- [Document Template](references/document-template.md) - Canonical 13-section HLD skeleton
- [Export Checklist](references/export-checklist.md) - docx/pdf styling, XML properties, visual inspection
- [Review Feedback Log](references/review-feedback-log.md) - Scout 4A review findings mapped to standard rules
