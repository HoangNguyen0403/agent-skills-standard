## Task 3: Native metadata, package completeness, local catalog (F1, F9–F11)
**Own:** `.github/skills/skill-creator/SKILL.md`, `cli/src/services/utils/SpecialistTransformer.ts`, `cli/src/services/utils/__tests__/SpecialistTransformer.spec.ts`, `skills/common/common-subagent-driven-development/scripts/{review_package,test_review_package}.py`.
- Mark project-skill-maintenance metadata.internal true, preserving canonical inventory.
- Move unenforceable permission comments after native YAML closing delimiters for Cursor/Copilot/OpenCode/Gemini/Kiro; preserve body/warnings/metadata and actual least-privilege Codex projection.
- Add behavioral parsing coverage for permission-bearing canonical specialist exports.
- Include recreated untracked replacement content for base-tracked paths; use an isolated alternate index or other boring BASE-relative Git serialization, never modify the user's index.
- Support ordinary file and symlink Git additions with lstat/lexists semantics; include mode120000/target text, never follow links. Add isolated temporary-Git cases for replacement and dangling/directory symlinks, index unchanged.
**Acceptance:** Actual installer discovery excludes local helper; frontmatter parses with native metadata; collector includes current replacement bytes and safe link targets.
**Verification:** focused CLI exporter test; `rtk python3 -m unittest discover -s skills/common/common-subagent-driven-development/scripts -p 'test_review_package.py'`; installer smoke; actual export/package smokes.
**Report:** `.agents/sdd/pr223-remediation/task-3-report.md`.

