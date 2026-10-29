# Task 1 Phase 1B schema checkpoint — independent review, round 1

## Verdict

**APPROVE — static schema-checkpoint spec + quality/security review only.** No consequential Blocker/Major finding identified within the released prerequisite. This is not focused-test/semantic-check PASS, Task 1 completion, metric publisher approval, or root generator clearance. Parent owns execution and release decisions; generator implementation remains outside this review.

## Scope and evidence

Reviewed the schema brief, schema report, metadata-scope contract including shared parser/lifecycle closure, and current source/test regions below. Sources are local frozen candidate code; the implementation report is a claim checked against source, not execution evidence. No commands, tests, probes, builds, lint, formatters, generators, delegation, or source edits performed. Only this report was written. In-flight generation tests were not inspected.

| Contract | Static evidence and assessment |
| --- | --- |
| Exact optional descriptor, distinct full/scoped identity | `cli/src/services/LockfileService.ts:22–28` retains the original whole-file hash and adds only the approved optional descriptor. `:93–118` requires exact metadata path, non-null/non-array object, exactly the supported keys, supported kind, and 64-hex digest. `:120–135` rejects unknown entry keys, validates the original fields, and reconstructs the descriptor rather than discarding it. |
| No scope retains ordinary semantics | Scope validation is conditional on an own scope property (`:93`); absent scope leaves the original source/hash entry representation intact (`:131–135`). This checkpoint does not add projection or whole-file authority decisions to CLI consumers. |
| Load rejection is authoritative | `LockfileService.ts:187–209` parses v2 generation and rejects generation on v1. `SyncService.ts:152–169` propagates load rejection before constructing install ownership from ordinary entries. `install/UninstallService.ts:99` similarly propagates rejection during planning. No malformed-to-missing fallback introduced. |
| Existing invalid namespace cannot be replaced | `LockfileService.ts:216–223` validates on-disk generation before using any supplied replacement. `:225–228` distinguishes omitted/undefined generation from explicit null and parses supplied values. Invalid input throws before the only write at `:248`. |
| Normal sync and disclosure retain descriptor | `SyncService.ts:225–231` omits generation; `LockfileService.ts:225–244` preserves the parsed existing ledger. `writeDisclosed`, `:264–272`, validates existing namespace before rewriting raw JSON and retains scope/unrelated fields through raw spread. Existing v1 disclosure behavior without generation is retained. |
| Uninstall validates before effects | `install/UninstallService.ts:215–218` loads current authority before backup creation (`:233–238`), removals (`:241–246`), integrations (`:249–256`), or lock deletion (`:259–262`). Applies to both persistence branches. Late load/write protections remain (`:265–279`). |
| Newly protected stale delete plan refuses | `UninstallService.ts:219–227` rejects a delete-lock plan when current supported generation entries are nonempty. It refuses rather than deleting authority or silently replanning, exactly matching brief contract 5. |
| Ordinary and unrelated data preserved | Planning iterates ordinary `lock.entries` only (`UninstallService.ts:140`); generation protects the lock (`:129`). Non-delete persistence changes only ordinary entries and writes the reloaded lock (`:265–279`). Lockfile persistence retains supplied registry/sources and existing disclosure through established interfaces. Metadata content itself is not rewritten by these schema operations. |

## Test-source assessment — execution NOT RUN

- `cli/src/services/__tests__/LockfileService.spec.ts:83–141`: supported scope round-trip with distinct whole/scoped digests and an unrelated no-scope generation entry.
- `:143–193`: omitted-generation normal write preserves scoped and no-scope generation entries, sources, and disclosure while applying the ordinary-entry update.
- `:195–208`: unsupported namespace-version load refusal.
- `:209–309`: null/array descriptor, unsupported kind, malformed digest, extra/missing descriptor key, and wrong output path. Exercises load rejection, invalid-existing replacement refusal, disclosure refusal, invalid incoming refusal, and unchanged ledger bytes.
- `:312–344`: explicit null incoming namespace refuses without modifying the existing scoped ledger.
- `:346–377`: existing missing-file/v1 disclosure and ordinary write behavior remains represented.
- `:378–423`: disclosure updates preserve scoped generation, ordinary entries, and sources.
- `cli/src/services/install/__tests__/UninstallService.spec.ts:294–346`: ordinary no-generation `--all` still removes owned output and lock.
- `:347–418`: actual plan/apply preserves scoped metadata bytes, unrelated no-scope router ownership/content, source and disclosure state while removing ordinary owned output.
- `:419–494`: malformed scope and newly supported authority introduced after a delete-lock plan both refuse before effects; checks host/metadata/lock bytes, no backups, and no integration calls.

These tests exercise observable consumer behavior rather than source text or mock-forwarding success. Digest fixtures are opaque valid schema values; this checkpoint does not claim they prove metric projection computation. No consequential test gap identified for this bounded schema prerequisite.

## Limits and audit

- LSP status again reported **No language servers configured for this project**. No successful LSP references are claimed; direct source consumers were inspected.
- Entry-time namespace validation is not a generic concurrent uninstall transaction guarantee. No such broader guarantee is claimed or required by this checkpoint.
- Actual CLI smoke, focused tests, semantic checks, and version-bound consumer qualification remain parent-owned and unobserved by this reviewer.
- Followed `docs/review-policy.md`; loaded `code-review`, `common-code-review`, `common-security-audit`, `common-owasp`, `common-llm-security`, TypeScript/common standards, and routed test standards. MCP compliance audit completed; its broad Next.js/React/product-management category warnings do not identify applicable rules for these CLI schema files.
- Cost telemetry requested; exact runtime token usage/pricing unavailable. No cost estimate fabricated.
