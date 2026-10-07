# Implementation task list: System-design review outcomes

**Owner:** implementing agent, assigned by registry maintainer on 2026-10-05. **Independent reviewer:** separate QA/eval agent; no self-approval. **Gate:** [READY decision](../../artifacts/runs/system-design-review-outcomes/20261005T020339Z-implementation-readiness.json). **Scope:** registry source and portable evals only; release and product gates remain separate.

**Executor routing:** `Personal - Cheap` (`google-antigravity/gemini-3.8-flash`) failed to start because its provider is not configured. For this session, T1 and T2 use the prescribed `Personal · Delivery` fallback (`openai-codex/gpt-6-luna`) in separate sessions. Integration owner: this agent; independent QA/architecture reviewer to inspect results. Worker costs: unavailable unless host reports usage.

## T1 — Review-to-action contract (REQ-001..003; AC-001..007; SRS-001..003)

- [x] Observed the prior `review-2026-10-03.md` roadmap without a finding-to-action register or persisted plan; retained the review workflow/skill as the smallest change.
- [x] Mapped each confirmed material finding to bounded actions with cited consequence, role, dependencies and distinct exit proof in the synthetic review; no action is verified on role alone.
- [x] Added conditional plan persistence and JSON handoff states. The writable synthetic review has a real file and both links; read-only, partial and no-action behavior remain replay cases, not smoke-verified outcomes.
- [x] Kept proposed LLDs distinct from deployed evidence and independently authorized closure; preserved the untrusted-source read-only gate.
- [x] Edited canonical `.agents/workflows/review-system-design.md` and `skills/system-design/system-design-review/SKILL.md`, not generated copies; `pnpm audit:sdlc` passed. Behavioral model replay after the latest JSON/RPO correction remains blocked by Codex usage limit.

## T2 — Portable behavioral regressions (REQ-001..003; AC-001..007)

- [x] Captured the former lexical-roadmap gap; scoped preflight reports zero issues but is not behavioral proof.
- [x] Added de-identified captured-case and counterexamples for untrusted/read-only, partial and failed writes, no-action and proof-vs-proposal; assertions remain smoke signals requiring independent semantic grading.
- [ ] The corrected fresh scoped replay (`all-v2.6.5-2026-10-05T02-56-37-876Z-5954ce47`) was independently graded: cases 4–9 improved, but case 10 and JSON handoff failed. A new manifest from the final source revision (`all-v2.6.5-2026-10-05T03-33-00-465Z-092f07d1`) passed preflight but its first worker failed; its answers directory is empty. Resume this manifest when model access returns, independently grade the responses, and record actual cost only if metered.

## T3 — Integration and release boundary (REQ-002..003; AC-003..007)

- [x] Inspected combined source, focused preflight, `pnpm validate:all`, `pnpm audit:sdlc`, `pnpm check-alignment`, trace audit and generated export; recorded observed results and stale export in the [walkthrough](srs-walkthrough-system-design-review-outcomes.md).
- [ ] Independent source and semantic QA reviews are recorded; latest case-10 and JSON findings need a fresh model replay. Obtain QA resolution without reviewer self-approval; product security/release approval remains separate.
- [ ] Hand off implementation evidence and missing release approval. Do not call source edits publication or project remediation.
