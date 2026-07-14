# Trigger check for `quality-engineering-jira-integration`

Skill description: Trigger only when the user explicitly requests live Jira or Zephyr retrieval, existing-link inspection, linking authored test cases, label updates, or stale-link audits. Do not trigger for analysis-only prompts such as 'Analyze the acceptance criteria for TICK-4521', supplied acceptance criteria, test-case authoring, or AC-to-test generation.

Based ONLY on the skill name and one-line description above — do not open the full skill body — decide whether this skill should activate for the task below.

> Write a widget test for the Jira integration screen

Start with exactly `CASE: trigger-4`, then answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.