---
name: common-architecture-diagramming
description: Standards for creating clear, audience-appropriate C4 and UML architecture diagrams with Mermaid. Use when producing system context diagrams, container views, sequence diagrams, or updating ARCHITECTURE.md files.
metadata:
  triggers:
    files:
    - 'ARCHITECTURE.md'
    - '**/*.mermaid'
    - '**/*.drawio'
    keywords:
    - diagram
    - architecture
    - c4
    - system design
    - mermaid
---
# Architecture Diagramming Standard

## **Priority: P1 (Standard)**

## Guidelines

- **Use C4 Model**: Context -> Container -> Component -> Code.
- **Audience-Centric**: Tailor abstraction (Execs vs. Devs).
- **Select Type**: Sequence (Protocol), ERD (Data), State (Lifecycle), Cloud (Infra). See [Selection](references/diagram-selection.md).
- **Explicit Labels**: Label every arrow (e.g., "Uses", "HTTPS").
- **Consistent Notation**: Cylinders=DB, Rectangles=Systems, Dashed=Async.
- **Metadata**: Title, Date, Version, Author.
- **Legend Mandatory**: Define all shapes/colors/styles.
- **Direction**: `graph LR` (Flow) or `graph TD` (Hierarchy).
- **Deployment**: Map containers to infrastructure.
- **Governance**: CRITICAL: Review [best-practices.md](references/best-practices.md) before starting.

See [implementation examples](references/implementation.md) for C4 container diagram in Mermaid.

## Anti-Patterns

- **Mixed Levels**: DB columns in System Context.
- **Unlabeled Arrows**: Ambiguous relations.
- **Mystery Shapes**: Undefined in Legend.
- **Dead Ends**: Unconnected nodes.
- **Clutter**: >20 nodes/diagram.
- **Acronyms**: Undefined abbreviations.

## References

- [Diagram Selection](references/diagram-selection.md)
- [Cloud Architecture](references/cloud-architecture.md)
- [C4 Model Guide](references/c4-model.md)
- [Checklist](references/checklist.md)
- [Best Practices](references/best-practices.md)