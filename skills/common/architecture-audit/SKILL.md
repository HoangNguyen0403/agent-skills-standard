---
name: Architecture Audit
description: Protocol for auditing structural debt, logic leakage, and fragmentation across Web, Mobile, and Backend.
metadata:
  labels: [architecture, tech-debt, logic-leakage, refactoring, code-quality]
  triggers:
    files:
      ['package.json', 'pubspec.yaml', 'go.mod', 'pom.xml', 'nest-cli.json']
    keywords:
      [architecture audit, code review, tech debt, logic leakage, refactor]
---

# Architecture Audit

## **Priority: P1 (STANDARD)**

## 📋 Audit Protocol

### 1. Structural Duplication Discovery (Universal)

Identify split sources of truth by searching for redundant directory patterns or naming conventions.

- **Services**: Compare `Service.ts` vs `ServiceNew.ts` vs `ServiceV2.ts`.
- **Versioning**: Check for `/v1`, `/v2` or "Refactor" folders.
- **Action**:
  ```bash
  # Identify potential duplicates or legacy files
  find . -type f -name "*New.*" | sed 's/New//'
  ```

### 2. Logic Leakage Analysis (Ecosystem Specific)

Detect business logic trapped in the wrong layer (e.g., UI layer in apps, Controller layer in APIs).

#### 🌐 Web (React/Next.js/Vue)

- **Action**: `grep -rE "useEffect|useState|useMemo" components --include="*.tsx" | wc -l`
- **Threshold**: If `components/` hook count > 20x `hooks/` folder, architecture is **Monolithic**.

#### 📱 Mobile (Flutter/React Native)

- **Action**: `grep -rE "http\.|dio\.|socket\." lib/widgets --include="*.dart" | wc -l`
- **Threshold**: I/O or state mutation > 5 lines in `build()` is 🟠 High Debt.

#### ⚙️ Backend (NestJS/Go/Spring)

- **Action**: `grep -rE "Repository\.|Query\.|db\." src/controllers --include="*.ts" | wc -l`
- **Threshold**: Controllers must only handle request parsing and response formatting.

### 3. Monolith Detection (Ecosystem Specific)

Identify massive files violating Single Responsibility Principle.

- **Thresholds**:
  - **UI**: > 500 lines (🟡 Medium), > 1,000 lines (🔴 Critical).
  - **Backend Services**: > 1,500 lines indicate "God Class".
- **Action**:
  ```bash
  find . -type f \( -name "*.tsx" -o -name "*.dart" -o -name "*.go" -o -name "*.java" \) | xargs wc -l | awk '$1 > 1000'
  ```

### 4. Resource Performance Audit (Universal)

Check for large metadata or constants impacting IDE performance and binary size.

- **Threshold**: Resources > 1,000 lines require granulation.
- **Action**:
  ```bash
  find . -type f \( -name "*constants*" -o -name "*.graphql" -o -name "*strings*" \) | xargs wc -l | awk '$1 > 1000'
  ```

## ⚖️ Scoring Impact

- **Layer Violation**: -15 per business logic instance in UI/Controller layer.
- **Structural Fragmentation**: -10 per duplicated legacy entity.
- **Monoliths**: -10 per unit > 1,000 lines.

## 📚 Reference Links

- [Architecture Patterns & Remediation Protocols](references/PATTERNS.md)
