## Task 5: Risk-sized workflow (NV3)
**Own:** `.agents/workflows/implement-feature.md` and narrowly relevant permanent workflow eval definitions only; no generated copies.
- Condition task-list, requirement IDs, decision trace, and PRD/SRS updates on governed delivery. Explicitly allow low-risk maintenance to keep its approved brief, acceptance criteria, decisions, and evidence in-chat/task report.
- Preserve sensitive-change risk floors, TDD, verification, approval, and independent review. Keep canonical workflow under80 lines.
**Acceptance:** A code/test-only low-risk maintenance scenario does not mandate new PRD/SRS documents; high-risk governed work retains trace and gates.
**Verification:** scenario trace against actual workflow; `rtk pnpm audit:sdlc`; no paid model evaluation.
**Report:** `.agents/sdd/pr223-remediation/task-5-report.md`.

