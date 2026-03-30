# Tessl-Style Skill Best Practices

This reference maps the [Tessl Evaluation Scale](https://docs.tessl.io/evaluate/evaluating-skills) to our internal `agent-skills-standard`.

## 1. Activation Standards (The "Anchor")

Activation determines if the AI actually loads your skill when needed.

### Specificity

- **BAD**: "Helps debug API endpoints." (Vague verb)
- **GOOD**: "Validates HTTP headers, checks status codes, and sanitizes request bodies." (Concrete actions)
- **Standard**: List at least 3-5 high-value verbs.

### Completeness (What + When)

- **What**: The capabilities the skill provides.
- **When**: The exact user requests or file contexts that trigger it.
- **Standard**: Use a 2-part sentence in the description. "Standardizes [What]. Use when [When]."

### Distinctiveness

- **Standard**: If two skills overlap (e.g., `nestjs-security` and `common-security`), differentiate them in the first 10 words of the description.

---

## 2. Implementation Standards (The "Value")

Implementation determines if the skill actually helps the AI solve the problem efficiently.

### Conciseness (Zero-Redundancy)

- **Rule**: Never explain concepts the AI already knows.
- **Examples of Redundant Info**:
  - "401 means Unauthorized."
  - "JWT stands for JSON Web Token."
  - "SOLID stands for..."
- **Fix**: Direct the AI straight to the _custom project logic_ or _specific workflow_.

### Actionability

- **Rule**: Examples must be outcome-oriented and executable.
- **Standard**: Every code block should result in a specific state change or valid output.

### Progressive Disclosure

- **Rule**: Keep `SKILL.md` under 100 lines.
- **Standard**:
  - **SKILL.md**: Workflow + Decision Trees + Core Rules.
  - **references/**: Large code blocks, edge cases, and verbose checklists.

---

## 3. Review Benchmarks

| Score      | Meaning                          | Action                          |
| :--------- | :------------------------------- | :------------------------------ |
| **90%+**   | Efficient, precise, high ROI.    | Deploy immediately.             |
| **70-89%** | Useful but slightly "noisy".     | Refactor for conciseness.       |
| **<70%**   | High risk of hallucination/miss. | Do not deploy; fix description. |
