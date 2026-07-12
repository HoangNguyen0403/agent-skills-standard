# Trigger check for `quality-engineering-jira-integration`

Skill description: Jira ↔ Zephyr traceability: fetch story AC and components, detect existing TC links, link new Zephyr TCs back to Jira, and apply has-zephyr-tests labels. Use after creating Zephyr test cases that need linking, when fetching a Jira story's details for test generation, or when auditing and cleaning up stale TC links.

Based ONLY on the skill name and one-line description above — do not open the full skill body — decide whether this skill should activate for the task below.

> Fetch TICK-4521 from Jira and tell me its acceptance criteria, labels, linked components, and whether any Zephyr test cases are already linked to it.

Answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.