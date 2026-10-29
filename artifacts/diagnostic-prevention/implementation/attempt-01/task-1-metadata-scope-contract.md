# Metadata field authority — parent contract for later Phase1B

This resolves representation and authority within the user's explicit metric-only approval; it is not released implementation or root-execution clearance. Do not implement during Phase1A.

## One bounded extension, not a generic JSON policy engine

Extend the existing GenerationEntry with an optional scope descriptor:

```ts
scope?: { kind: 'category-token-metrics'; sha256: string }
```

Existing `GenerationEntry.sha256` continues to record the observed whole published file digest. With no scope, existing whole-file authority rules remain unchanged. With this descriptor, only the digest over the deterministic `categories.*.token_metrics` projection is authority; the full-file digest is observation/drift evidence, not authority over nonmetric fields.

The descriptor is valid only for the exact normalized `skills/metadata.json` path in the separate repository-generation namespace. Validate exact supported keys/kind/digest shape and preserve it through candidate CLI lock writes and uninstall. Reject unknown scope kinds or attempts to scope another path; never silently discard the scope and fall back to whole-file authority. No new namespace, ordinary install owner, arbitrary JSONPath evaluator, blanket force flag or compatibility alias.

Exported interface changes require references before editing when a language server is available. Follow every actual parser/persistence/consumer reference; older unqualified CLI binaries are not claimed to preserve a namespace they never implemented. Candidate source/CLI consumers must be version-bound by verification evidence.

## Initial and continuing authority

- Default check/apply never silently establishes field ownership. Unchanged unknown output remains a no-op without adoption.
- Explicit approved `--adopt-base` may establish this metric scope by independently reconstructing the old BASE producer metrics and comparing the relevant current worktree and regular Git-index metric projections to those old owned values. Do not require authored nonmetric values to equal BASE, and do not overwrite them with BASE data.
- Preserve normal whole-file pristine/current-index requirements for every other adoption path. The metadata exception does not widen those rules.
- Bind the exact current full worktree and regular Git-index identities, including authored portions, during acquisition; revalidate them through the corresponding publication. Concurrent staged-only or worktree edits still abort. Never mutate/reset the index.
- Subsequent metric updates require the stored scoped authority digest to match current owned metrics; nonmetric source edits alone must not transfer or invalidate ownership of unchanged metrics. Edited metrics without authority still refuse.

## Candidate and publisher invariants

Treat all nonmetric metadata values/content as current authored source. The candidate must preserve them; reject any producer mutation outside the allowed fields rather than accepting a whole staged document wholesale. Compose the published metadata from the active baseline plus only approved generated metrics using existing repository JSON conventions; do not introduce unrelated normalization or source-field changes. Preserve current version 2.9.1, date 2026-10-28, workflow release 1.1.7 and all owners/routing/other fields.

Whole-file destination/absence/symlink/drift checks and exact written-byte verification still apply. Record the actual full file hash and new owned metric hash only after verification. Merge that authorized entry into previous generation ownership; preserve every unrelated host/generation/source/disclosed entry. Archive before-bytes and both whole/scoped identities. Partial effects are failed receipts, not a license for whole-file rollback of unrelated source changes.

## Required observable controls

1. Existing nonmetric source edits survive an explicitly authorized metric-only update.
2. Staged nonmetric mutation refuses with no publication.
3. Owned metric tampering refuses; ordinary subsequent nonmetric source edits do not grant broader authority.
4. Staged-only Git-index or worktree drift refuses without modifying the user's index.
5. Candidate normal CLI refresh/uninstall preserves the scoped descriptor and unrelated entries; generation-owned metadata is not an install-prunable entry.

The old producer currently assigns only category token_metrics in calculate-tokens.ts:156–163 and serializes metadata at :191. If a required changed mixed surface elsewhere cannot satisfy its existing authority, return its exact path/region; do not silently extend this exception or omit its parity requirement.

## Shared parser and lifecycle closure

Preparatory read-only lookup by `bd8a3eec-b32b-4eac-93bf-4df7264195eb` traced current LockfileService, sync and uninstall consumers; no runtime outcome was claimed. The existing parser rejects scope keys and reconstructs only source/sha256, so allowing an extra key without retaining the descriptor is expressly forbidden. Change exported GenerationEntry and the shared parser together; supported scope survives every load/write.

Keep current validation of both on-disk and supplied generation ledgers before persistence. Missing optional data is not permission to accept explicit null/unknown scope or downgrade it to whole-file ownership. Validate the existing namespace before `writeDisclosed` rewrites raw lock JSON; do not leave capability disclosure as a bypass. Sync beginInstall and uninstall plan currently propagate load rejection—preserve that behavior rather than translating malformed authority into a missing-lock default.

Uninstall apply must validate its current ledger before its first removal/integration effect, including the delete-lock path, not merely after removals during final persistence. This is a bounded namespace-consumer correction within the already authorized UninstallService write set, not a new uninstall architecture. Test supported descriptor preservation and unsupported descriptor refusal with untouched file/ledger bytes through actual consumer methods. LSP was unavailable in the preparatory lookup; do not claim successful references unless a later tool actually provides them.

## Bounded serialization decision

Repository lookup found whole-document JSON writers, not a format-preserving JSON-edit primitive. `calculate-tokens.ts` assigns category token_metrics and emits `JSON.stringify(metadata, null, 2) + '\n'`. Parent executed a read-only formatting qualification: current active metadata equals precisely that serialization; common version/date remain 2.9.1/2026-10-28, workflows 1.1.7, 26 categories.

Reuse that existing convention rather than adding dependencies or a generic structural editor. When owned metrics actually change, require the active baseline text to equal its own existing two-space/final-newline serialization; otherwise refuse the unsupported authored formatting without publication. Compose from the active baseline plus metric values only, prove nonmetric data is identical, and reject a staged nonmetric mutation. Preserve every existing property/order outside the owned values under the qualified convention. If metric values are unchanged, retain the exact active bytes: producer formatting alone must not create a publication or adoption.

This is an explicit fail-closed formatting prerequisite, not a promise to support arbitrary authored JSON layouts or permission to normalize them. Document that limit in the finished generation subsection. Do not extend it to any other output or silently omit a required metric update.
