Assumption: “session feedback” refers to the provided agent instructions.

Improve the skills library by:

- Requiring `SKILL.md` discovery and full reading before edits.
- Prioritizing MCP skill resolution via `list_workflows`, `load_skills_for_files`, and `audit_session_compliance`.
- Adding explicit no-repository-context guidance: state assumptions and proceed without inventing repository facts.
- Enforcing token-efficient commands and skill content, including optional `rtk` and `caveman` usage.
- Requiring documentation updates when architecture or contribution workflows change.
- Adding completion checks for changed files, verification evidence, and compliance auditing.
