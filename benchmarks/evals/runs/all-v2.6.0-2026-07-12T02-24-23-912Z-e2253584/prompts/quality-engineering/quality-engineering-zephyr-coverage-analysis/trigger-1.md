# Trigger check for `quality-engineering-zephyr-coverage-analysis`

Skill description: Audit test coverage health, gaps, and QE debt for Jira stories or epics. Produces coverage_analysis_report.md with AC-to-TC heatmap, risk scores, and prioritized action plan. Use when assessing coverage percentage, pre-release readiness, sprint readiness, or identifying missing test cases. Do NOT use for TC creation — use zephyr-test-generation instead.

Based ONLY on the skill name and one-line description above — do not open the full skill body — decide whether this skill should activate for the task below.

> Can you check the coverage for {PROJECT}-{ID}? I want to know if we have enough test cases before we ship this sprint. We're planning a release next week and the QE lead asked me to run a coverage check.

Answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.