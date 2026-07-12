🚨 SKILL VIOLATION DETECTED
Skill:        common-feedback-reporter (with active SKILL.md authoring rules)
File:         skills/react-hooks/SKILL.md:1-105+
Rule:         SKILL.md files must remain within the documented size limit of 100 lines; move extended material to references/.
Violation:    A detailed skill with many examples and explanations is planned as one oversized SKILL.md.
Fix:          Keep the main file concise and operational, then move long examples to `skills/react-hooks/references/examples.md` and link to it from the skill.
Auto-fixed:   YES
Root Cause:   MISSING_COVERAGE
User Intent:  Create a useful React hooks skill with enough examples to teach correct usage.
Skill Gap:   The skill guidance should provide a clear template for splitting a skill into a short activation/instructions file plus progressive-disclosure reference documents. It should also state how to preserve discoverability without putting all teaching content in SKILL.md.
Co-skills:    none

Recommended structure:

```text
skills/react-hooks/
├── SKILL.md                  # triggers, rules, workflow, concise examples
└── references/
    └── examples.md           # detailed patterns and explanations
```

The main `SKILL.md` should link to the reference file and retain only the rules needed during task execution. Before writing, count the planned lines and split content before exceeding the limit.
