// scripts/workflow-chain.ts
//
// Single source of truth for the core SDLC chain. Lives outside `audit-sdlc.ts`
// so the outcome auditor can consume it without importing the audit entrypoint
// (which would create a cycle: audit-sdlc -> outcome/template -> audit-sdlc).

/**
 * Core BA->PM->IT->QA->release chain that the `sdlc` router must be able to reach.
 *
 * Adjacent/specialist workflows (pentest, security-test, skill-benchmark, battle-test,
 * update-docs, zephyr-coverage-analysis) are invoked directly and are not routed by sdlc.
 */
export const CORE_SDLC_CHAIN = [
  "brainstorm-feature",
  "review-system-design",
  "plan-feature",
  "system-design-session",
  "design-solution",
  "implementation-readiness",
  "implement-feature",
  "verify-work",
  "uat-signoff",
  "traceability-audit",
  "deploy-release",
  "publish-notes",
  "retro-learn",
  "session-report",
  "dev-fix",
  "review-ticket",
  "code-review",
  "codebase-review",
  "verify-bug",
  "incident-hotfix",
  "monitor-respond",
];
