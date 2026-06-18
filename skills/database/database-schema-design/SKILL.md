---
name: database-schema-design
description: Design relational or document schemas from access patterns, cardinality, and lifecycle. Use when modeling entities, choosing embed vs normalize, or shaping schema boundaries before implementation.
metadata:
  triggers:
    files:
    - '**/*.entity.ts'
    - 'prisma/schema.prisma'
    - '**/*.json'
    keywords:
    - schema
    - data model
    - cardinality
    - embed
    - normalize
---
# Database Schema Design

## **Priority: P0 (FOUNDATIONAL)**

Start from reads, writes, and ownership. Schema follows access patterns, not vice versa.

## Rules

- Model one business concept per table/collection boundary.
- Choose embed vs reference or normalize vs denormalize from cardinality, update frequency, and read locality.
- Encode uniqueness, nullability, and foreign-key or ownership rules explicitly.
- Prefer additive evolution over destructive redesigns.

## Verify

- [ ] Hot reads are supported without avoidable joins or fan-out.
- [ ] Cardinality and lifecycle were written down for major relationships.
- [ ] Constraints or validation rules exist for business invariants.
- [ ] IDs, timestamps, and soft-delete semantics are consistent.

## Anti-Patterns

- **No schema from ORM defaults**: model business access patterns first.
- **No many-to-many without owner rules**: define source of truth and cleanup behavior.
- **No nullable drift**: nullable fields need lifecycle meaning.

## References

- [Framework Map](../references/framework-map.md)
