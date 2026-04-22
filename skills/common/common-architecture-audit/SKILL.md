---
name: common-architecture-audit
description: Audit structural debt, logic leakage, and monolithic components across Web, Mobile, and Backend codebases. Use when reviewing architecture, assessing tech debt, detecting logic in wrong layers, or identifying God classes.
metadata:
  triggers:
    files:
    - 'package.json'
    - 'pubspec.yaml'
    - 'go.mod'
    - 'pom.xml'
    - 'nest-cli.json'
    keywords:
    - architecture audit
    - code review
    - tech debt
    - logic leakage
    - refactor
---
# Architecture Audit

## **Priority: P1 (STANDARD)**

## 1. Discover Structural Duplication

Identify split sources of truth by searching for redundant directory patterns.

- Compare `Service.ts` vs `ServiceNew.ts` vs `ServiceV2.ts`.
- Check for `/v1`, `/v2` or "Refactor" folders.

See [implementation examples](references/implementation.md) for detection scripts.

## 2. Detect Logic Leakage (by Ecosystem)

Find business logic trapped in wrong layer.

- **Web (React/Next.js/Vue)**: `grep -rE "useEffect|useState|useMemo" components --include="*.tsx" | wc -l` — if `components/` hook count > 20x `hooks/` folder, architecture monolithic.
- **Mobile (Flutter/React Native)**: `grep -rE "http\.|dio\.|socket\." lib/widgets --include="*.dart" | wc -l` — I/O or state mutation > 5 lines in `build()` High Debt.
- **Backend (NestJS/Go/Spring)**: `grep -rE "Repository\.|Query\.|db\." src/controllers --include="*.ts" | wc -l` — Controllers must only handle request parsing and response formatting.

## 3. Identify Monoliths

Flag massive files violating Single Responsibility Principle.

- **UI**: > 500 lines (Medium), > 1,000 lines (Critical).
- **Backend Services**: > 1,500 lines indicates "God Class".

See [implementation examples](references/implementation.md) for monolith detection scripts.

## 4. Audit Resource Performance

Check for large metadata or constants impacting IDE performance and binary size.

- Resources > 1,000 lines require granulation.

See [implementation examples](references/implementation.md) for resource audit scripts.

## Scoring Impact

- **Layer Violation**: -15 per business logic instance in UI/Controller layer.
- **Structural Fragmentation**: -10 per duplicated legacy entity.
- **Monoliths**: -10 per unit > 1,000 lines.

## Anti-Patterns

- **No applying generic patterns over project-specific rules**: Respect existing architecture constraints.
- **No ignoring error handling or edge cases**: Audit must cover boundary conditions.

## References

- [Architecture Patterns & Remediation Protocols](references/PATTERNS.md)