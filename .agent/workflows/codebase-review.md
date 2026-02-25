---
description: Review an entire codebase against framework best practices and generate a prioritized improvement plan
---

# 🔍 Codebase Review Workflow

> **Goal**: Auto-detect ecosystem, dynamically load matching skills, and perform a high-efficiency review with a weighted score and improvement roadmap.
> [!IMPORTANT]
> **Token Efficiency First**:
>
> - Use `grep -c` or `wc -l` for metrics.
> - Summarize findings internally; do not repeat skill rules verbatim.
> - Delegate security and architectural deep-dives to `common/` skills.

---

## Step 1 — Project Discovery

Gather enough info to identify the architecture:

```bash
# manifest/structure check
ls -F
cat package.json 2>/dev/null || cat lib/main.dart 2>/dev/null || cat go.mod 2>/dev/null || cat pom.xml 2>/dev/null
find . -maxdepth 2 -not -path '*/.*' -not -path '*/node_modules/*' -not -path '*/build/*'
```

---

## Step 2 — Skill Mapping

Match the detected project to registry keys (e.g., `flutter`, `nestjs`, `golang`, `typescript`).
**Action**: Use `view_file` to load matching `SKILL.md` files from the registry, specifically:

- `skills/common/architecture-audit/SKILL.md`
- `skills/common/security-audit/SKILL.md`

**Fallback**: If paths are missing, search `.agent/skills/` using `list_dir`. If specialized skills are unavailable, proceed using the **Lite Audit** fallbacks in the following steps.

---

## Step 3 — Broad Health Metrics

Run ecosystem-aware scans to identify hotspots:

- **Test Coverage Signal**: `find . -name "*_test.*" -o -name "*.spec.*" | wc -l`
- **Debt Signal**: `grep -riE "TODO|FIXME" . | wc -l`
- **Fat Files (>1k LOC)**: `find src lib -type f -name "*.*" | xargs wc -l | awk '$1 > 1000'`
- **Secret/Credential Signal**:
  - If skill present: Execute Step 1 from `skills/common/security-audit/SKILL.md`.
  - **Lite Fallback**: `grep -riE "password|secret|apiKey|token" . --exclude-dir=node_modules -l | head -n 10`

---

## Step 4 — Security & Architecture Audit (Adversarial)

Apply the full audit protocols defined in:

1. `skills/common/security-audit/SKILL.md`
2. `skills/common/architecture-audit/SKILL.md`

**Lite Fallback (If skills missing)**:

- **Injection Probing**: `grep -rE "\+.*SELECT|\+.*INSERT|query\(.*\+" . --include="*.ts" --include="*.go"`
- **Architecture Leakage**: `grep -rE "Repository\.|db\." src/controllers lib/widgets | wc -l`
- **Monoliths**: `find src lib -maxdepth 2 -type f | xargs wc -l | awk '$1 > 1000'`

- **Goal**: Identify 🔴 Critical (P0) findings. Do not block if specialized skills are unavailable.

---

## Step 5 — Targeted Deep Dive

Pick **three** representative files (UI, Logic, Data) for a quality assessment:

- **Typing**: Strictness vs `any`/`dynamic` usage.
- **Error Handling**: Propagation vs Swallowing.
- **Modularity**: Compliance with the detected framework's best practices.

---

## Step 6 — Generate Scored Report

### ⚖️ Weighted Scoring Algorithm (Base: 100)

1. 🛡️ **Security** (Secrets, Auth, Leakage) - **40% weighting**
2. 🏗️ **Architecture** (Separation, State, Layers) - **30% weighting**
3. 🧪 **Testing & Quality** (Coverage, LOC, Errors) - **30% weighting**

**Deductions**:

- 🔴 **Critical (-15)**: Security leaks, missing guards.
- 🟠 **High (-8)**: Massive god-files, zero tests on critical paths.
- 🟡 **Medium (-3)**: Logic leakage, missing documentation.

---

### 📊 Metric Dashboard

- **Score**: [X]/100
- **Primary Framework**: [Detected]
- **Critical Issues**: [Count]

### 🔴 CRITICAL FINDINGS

- **[SEC-001] Security**: [Finding]
- **[ARCH-001] Architecture**: [Finding]

### 🗺️ Continuous Improvement Plan

- **Phase 1**: Security & Stability (Fix P0s).
- **Phase 2**: Architectural Alignment (Refactor hotspot layers).
- **Phase 3**: Quality Polish.

---

## Step 7 — Execution Strategy

Ask:

1. "Generate `task.md` for **Phase 1**?"
2. "Optimize the worst performing module ([Module])?"
