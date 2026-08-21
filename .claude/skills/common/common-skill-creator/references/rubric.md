# Battle Test Grading Rubric (Tessl-Aligned)

Use this rubric to evaluate every `SKILL.md`. Health is quantified by **Activation** (how accurately it triggers) and **Implementation** (how effectively it assists).

## 1. Validation Checks (Gatekeeper)

Skills must PASS all checks to be eligible for scoring:

- [ ] **Line Count**: `SKILL.md` ≤ 100 lines.
- [ ] **Code Blocks**: No inline block > 10 lines (must move to `references/`).
- [ ] **Frontmatter**: Valid YAML with `name` and `description`.
- [ ] **Description Voice**: Third-person mood (e.g., "Standardizes...", "Validate...").

## 2. Activation Score (Discovery & Triggering — 50 pts)

| Dimension           | Criteria                                                                        | Max Pts |
| :------------------ | :------------------------------------------------------------------------------ | :------ |
| **Specificity**     | Avoids vague verbs (manage, handle). Lists concrete actions (Sanitize, Rotate). | 15      |
| **Completeness**    | Explicitly defines BOTH **What** (Capabilities) and **When** (Triggers).        | 15      |
| **Trigger Quality** | Specific file globs or unique keywords. Includes natural variations.            | 10      |
| **Distinctiveness** | Zero or low risk of conflicting with other skills in the registry.              | 10      |

## 3. Implementation Score (Procedural Utility — 50 pts)

| Dimension            | Criteria                                                              | Max Pts |
| :------------------- | :-------------------------------------------------------------------- | :------ |
| **Conciseness**      | **No Redundancy**: Zero explanation of concepts the AI already knows. | 15      |
| **Actionability**    | Examples are copy-paste ready, executable, and outcome-oriented.      | 15      |
| **Workflow Clarity** | Ordered sequential steps with clear checklists/verification points.   | 10      |
| **Disclosure**       | Deep-dives, large examples, and edge cases moved to `references/`.    | 10      |

## 4. Final Grading (Overall Score)

- **90%+ (S-Tier)**: Production-ready; zero redundant tokens; perfect activation.
- **70-89% (Pass)**: Good skill; may have minor "AI-splaining" or vague triggers.
- **Below 70% (Reject)**: Needs refactor (Too long, vague description, or redundant content).

## 5. ⚔️ Battle Test Report Template

```text
╔══════════════════════════════════════════════════════════════╗
║                    ⚔️  BATTLE TEST REPORT                    ║
║  Score: [0-100]        Grade: [S/Pass/Reject]                ║
╚══════════════════════════════════════════════════════════════╝

### 🎯 Activation Details ([X] / 50)
- **Top Finding**: [e.g., Description lacks 'what' capabilities]
- **Deductions**: [e.g., Vague verbs (-5)]

### 💎 Implementation Details ([X] / 50)
- **Top Finding**: [e.g., Includes redundant HTTP code explanations]
- **Deductions**: [e.g., Redundancy (-8)]

### 🗺️ Phased Remediation Plan
| Phase | Actions |
| :--- | :--- |
| Phase 1 | [Immediate description specific fixes] |
| Phase 2 | [Refactor body content to references/] |
```
