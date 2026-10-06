# Battle Test Grading Rubric (Tessl-Aligned)

Use this rubric to evaluate every `SKILL.md`. Health is quantified by **Activation** (how accurately it triggers) and **Implementation** (how effectively it assists).

## 1. Structural Checks (Gatekeeper)

Skills must PASS all structural checks to be eligible for scoring:

- [ ] **Line Count**: `SKILL.md` ≤ 100 lines (editorial size budget).
- [ ] **Code Blocks**: No inline block > 10 lines (must move to `references/`).
- [ ] **Frontmatter**: Valid YAML with `name` and `description`.
- [ ] **Description Voice**: Third-person mood (e.g., "Standardizes...", "Validate...").
- [ ] **No Answer-Anchor Padding**: No keywords or phrases inserted solely to game string-match tests.

## 2. Textual Evidence & Utility (Activation — 50 pts)

| Dimension           | Criteria                                                                        | Max Pts |
| :------------------ | :------------------------------------------------------------------------------ | :------ |
| **Specificity**     | Avoids vague verbs (manage, handle). Lists concrete actions (Sanitize, Rotate). | 15      |
| **Completeness**    | Explicitly defines BOTH **What** (Capabilities) and **When** (Triggers).        | 15      |
| **Trigger Quality** | Specific file globs or unique keywords. Includes natural variations.            | 10      |
| **Distinctiveness** | Zero or low risk of conflicting with other skills in the registry.              | 10      |

## 3. Implementation Evidence (Procedural Utility — 50 pts)

| Dimension            | Criteria                                                              | Max Pts |
| :------------------- | :-------------------------------------------------------------------- | :------ |
| **Conciseness**      | **No Redundancy**: Zero explanation of concepts the AI already knows. | 15      |
| **Actionability**    | Examples are copy-paste ready, executable, and outcome-oriented.      | 15      |
| **Workflow Clarity** | Ordered sequential steps with clear checklists/verification points.   | 10      |
| **Disclosure**       | Deep-dives, large examples, and edge cases moved to `references/`.    | 10      |

## 4. Executable Outcomes & Verification

A skill is not proven by textual compliance alone. Where runnable verification applies:
- **Executable Verifiers**: Measure deterministic test pass/fail and exit codes on fixture workspaces.
- **Adversarial Boundaries**: Prove the skill guards against shortcut attempts and security regressions.
- **Transcript vs Executable**: Label textual transcript assertions as textual evidence; distinguish from executable task outcomes.

## 5. Rule Retirement & Ablation Criteria

Periodically ablate candidate rules to prevent instruction bloat:
- **Evidence Requirement**: Ablation requires repeated runs across representative, risk-appropriate splits (including adversarial edge cases), not ad-hoc or single-turn prompts.
- **Candidate vs Authorization**: Demonstrating that an unprompted model passes or that ablation has zero delta identifies a rule as a *candidate* for retirement. It does NOT authorize removing safety boundaries, authorization gates, or security controls.
- **Safety & Host Guardrails Preserved**: Core trust boundaries, sensitive-change risk floors, and approval controls remain mandatory unless replaced by a verified, deterministic runtime enforcement mechanism (linter, hook, compiler check, or MCP guard).
- **Runtime Tool Cutover**: When tooling or MCP servers enforce a check deterministically, retire manual prompt instructions after verifying replacement coverage.
## 6. Final Grading (Overall Score)

- **90%+ (S-Tier)**: Production-ready; clean editorial density; perfect activation; no padding.
- **70-89% (Pass)**: Good skill; minor "AI-splaining", missing edge cases, or vague triggers.
- **Below 70% (Reject)**: Needs refactor (Too long, vague description, redundant content, or padding).
## 7. ⚔️ Battle Test Report Template

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
