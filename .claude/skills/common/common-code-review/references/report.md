# Audit & Review Reporting Templates

Use these templates to structure the final report. Follow the [rubric](../../common-skill-creator/references/rubric.md) for scoring.

## 1. Codebase Review Dashboard

```text
## [ProjectName] — Score [X/100] | [Framework] | [YYYY-MM-DD]
```

| Metric               | Value               | Signal      |
| :------------------- | :------------------ | :---------- |
| Source Files         | [N] excl. generated | Health      |
| Test Files           | [N]                 | Ratio       |
| Tech Debt (TODOs)    | [N in $SRC]         | Density     |
| Fat Files (>600 LOC) | [N]                 | Complexity  |
| Secret Scan          | Safe / Vulnerable   | Exposure    |
| RCE / SSRF Surface   | [N candidates]      | Criticality |
| N+1 Query Signals    | [N candidates]      | Performance |
| Unguarded Routes     | [N% unguarded]      | Security    |
| OWASP P0 Findings    | [N]                 | Compliance  |

### Category Scores (Deduct from 100)

| Category     | Score | Key Driver      |
| :----------- | :---- | :-------------- |
| Security     | /100  | [P0 findings]   |
| Architecture | /100  | [L1 issues]     |
| Performance  | /100  | [N+1/Latency]   |
| Testing      | /100  | [Coverage gaps] |

## 2. Review Finding Template

```text
[BLOCKER|MAJOR|NIT] [file:line] Issue Description
Why:   Risk or impact on correctness/security/maintainability.
Fix:   1–2 line action or code suggestion.
Score: XX/100
Layer: Security | Architecture | Silent Failure | AI Safety
```

## 3. Phased Improvement Plan

Group findings into phases with a **"Why / Benefits"** column.

| Phase                | Action                | File(s) | Why / Benefits    |
| :------------------- | :-------------------- | :------ | :---------------- |
| Phase 1: Quick Wins  | [e.g. Patch SQLi]     | [file]  | Secure core data  |
| Phase 2: Refactoring | [e.g. Extract logic]  | [file]  | Decouple UI       |
| Phase 3: Quality     | [e.g. Add unit tests] | [file]  | Regression safety |
