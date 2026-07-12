# Trigger check for `python-security`

Skill description: Secure Python services against secret leakage, injection, unsafe subprocess calls, and dependency drift. Use when handling env vars, tokens, SQL, file paths, shell commands, auth flows, or Python security gates.

Based ONLY on the skill name and one-line description above — do not open the full skill body — decide whether this skill should activate for the task below.

> Is subprocess.run(f"git show {user_input}", shell=True) acceptable in Python operator code?

Answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.