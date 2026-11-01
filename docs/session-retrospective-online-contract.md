# Session Retrospectives — Future Online Contracts

**NOT IMPLEMENTED. THIS DOCUMENT IS A CONTRACT ONLY.**

This repository ships deterministic local analysis. Every online capability described below is a
reserved, versioned contract with no runtime implementation: no hosted analyzer class, no API
client, no upload endpoint, no scheduler, no central store, no background learner, and no
configuration toggle that enables any of them. There is no hosted fallback if a local mode is
unavailable — an unsupported processing mode returns `MODE_UNAVAILABLE` *before* collection and
never degrades into something else.

> Status: Task 3's schema feedback is folded in (empty `Finding.sources` for node-level gaps,
> `mechanism` as a closed identifier set, receipt = report artifact with `failed` reserved,
> `ProcessingMode` refused before collection rather than mapped). The document still has no
> runtime counterpart and no smoke evidence: every online section is contract-only.

## Why contracts exist before code

Three decisions must be made *before* any data moves, and each is a separate permission:

1. **Export** — which minimized evidence leaves the machine, to which provider/account/model, for
   what purpose, under which finite budgets.
2. **Analysis** — what the receiving analyzer is allowed to return (findings and proposals only,
   never adoption).
3. **Evaluation and adoption** — bounded improvement cycles with independent review, and a human
   adoption step that no agent can supply.

Online analysis permission authorizes exactly item 2 for one bound packet. It does **not**
authorize candidate editing, evaluation, release or adoption.

## Versioned contracts

All schemas are strict, versioned and reject unknown keys. IDs are ASCII, at most 128 characters.
ISO-8601 timestamps are parsed before comparison; counters are finite and non-negative.

### Evidence packet — `schemaVersion: 1`

```ts
type NodeKey = { hostId: string; sessionId: string };
type Disposition = 'local-allowed' | 'restricted' | 'unavailable' | 'remote-not-authorized';
type Coverage = 'structured-events' | 'partial' | 'summary-only' | 'restricted' | 'unavailable';

type SafeEvent = {
  id: string; node: NodeKey; at: string;
  kind: 'launch' | 'permission' | 'check' | 'completion' | 'usage' | 'gap';
  outcome?: 'claimed-complete' | 'passed' | 'failed' | 'denied' | 'canceled' | 'unknown';
  provider?: string; model?: string; tool?: string;
  counts?: { inputTokens: number | null; outputTokens: number | null; cost: number | null; currency: string | null };
  source: { node: NodeKey; eventId: string; line?: number };
};

type EvidencePacket = {
  schemaVersion: 1; runId: string; main: NodeKey; cutoff: string;
  nodes: Array<{ key: NodeKey; parent: NodeKey | null; disposition: Disposition; coverage: Coverage }>;
  events: SafeEvent[]; gaps: Array<{ code: string; node?: NodeKey }>;
};
```

Allowlisted fields only. Hidden system/developer prompts, private reasoning, tool arguments, raw
output and full message text are absent by construction, not filtered afterwards. An export packet
is the *whole* payload; there is no partial-upload mode and no "just the interesting parts".

### Analyzer — `schemaVersion: 1`

```ts
type Finding = {
  id: string; criterion: number; classification: 'observed' | 'candidate';
  ruleId: string; sources: Array<{ node: NodeKey; eventId: string; line?: number }>; claimCode: string;
};
type Proposal = {
  id: string; revision: string; status: 'proposed'; findingIds: string[];
  mechanism: string | null; candidateGuidanceIds: string[]; verificationCodes: string[];
  semanticReviewRequired: boolean;
};
type Analysis = {
  schemaVersion: 1; findings: Finding[]; proposals: Proposal[];
  criteria: Array<{ criterion: number; state: 'met' | 'finding' | 'not-applicable' | 'not-assessable'; reasonCode: string }>;
};

interface Analyzer {
  readonly mode: 'local-rules';
  analyze(packet: EvidencePacket, signal: AbortSignal): Promise<Analysis>;
}
```

The only implemented analyzer is `mode: 'local-rules'`; the local rules module exposes exactly
that mode, so there is no online analyzer object to construct. `local-model` and `hosted` are
**disabled, unsupported capabilities**: requesting them yields `MODE_UNAVAILABLE` before any
collection starts and the mode is never mapped onto a local run. A proposal can only be
`status: 'proposed'`; there is no `status: 'applied'` in the contract and no adoption mutator
anywhere.

Semantic limits the contract must not overstate:

- `Finding.sources` **may be empty**. Node-level coverage gaps have no event identity, so a
  gap-derived finding cites no source rather than a fabricated one. Citations are capped at
  `20` per finding; truncation is disclosed, not hidden.
- `claimCode` is a closed set: `permission-denied`, `check-failed`,
  `completion-claim-without-check-evidence`, `coverage-gap`, `usage-incomplete`. No free
  transcript text can become a claim code.
- `Proposal.mechanism` is likewise a closed identifier set — `permission-recovery-guidance`,
  `verification-failure-triage`, `completion-evidence-guidance` — or `null` when no reusable
  root cause exists. There is no free-text root-cause class field, and no lexical
  missing/ignored/contradictory classification: that judgment stays `not-assessable`.
- Criteria 4 (routing) and 10 (learning continuity) are always `not-assessable`
  (`semantic-review-required`, `prior-proposal-linkage-unavailable`). Exhaustion, escalation
  justification and adoption are never inferred, and prior reports are never read as inputs.
- Coverage/telemetry codes never turn a criterion into `finding`: partial coverage is not
  evidence of failure.
- **No raw excerpt output.** `Analysis` carries codes, identifiers and source references only;
  it never returns message text, tool output or transcript excerpts. There is no excerpt field
  to populate, locally or online.

### Evaluation — `schemaVersion: 1` (draft, no local counterpart)

Nothing in this block exists in the local implementation; it is the reserved shape for a future
authorized improvement cycle.

```ts
type EvaluationPlan = {
  schemaVersion: 1; planId: string;
  candidateGuidanceIds: string[]; baselineIdentity: string;
  heldOutCases: string[]; negativeCases: string[];
  fixedConditions: { provider: string; model: string; toolsDigest: string };
  budget: { maxRequests: number; maxTokens: number; maxElapsedMs: number };
};
type EvaluationReceipt = {
  schemaVersion: 1; planId: string; outcome: 'improved' | 'no-change' | 'regressed' | 'unknown';
  perCase: Array<{ caseId: string; baseline: string; candidate: string }>;
  recurrenceScope: string; rollbackBaseline: string;
};
```

An `unknown` outcome is a legitimate result — for example a hosted timeout. Ambiguous paid
requests are never resent automatically: without verified safe idempotency the request stays
`unknown` until a human decides.

### Consent and mode

```ts
type ProcessingMode = 'local-only' | 'local-model' | 'hosted';
type Consent = {
  schemaVersion: 1; mode: ProcessingMode;
  packetDigest: string;                     // binds the exact bytes
  destination: { provider: string; account: string; model: string } | null; // null when local
  purpose: string; retentionUncertainty: string;
  budgets: { maxRequests: number; maxTokens: number; maxElapsedMs: number; maxCost: number | null };
};
```

Consent binds the packet by digest *and* the destination. Any change — new evidence, a different
model, a different account, a revised packet — invalidates the consent and requires a new
approval. Project/account restrictions still apply on top.

`ProcessingMode`, `Consent` and `destination` have **no local counterpart**: they do not exist as
runtime types today. The implemented entry point takes a strict `PrepareRequest`
(`main`, `checkpointId`, `cutoff`, `root`, `consent: 'local-only'`) with no `mode` and no labels
field. A requested mode other than `local-only` is refused with `MODE_UNAVAILABLE` before
collection and is never mapped onto a local run. Optional readable labels, if enabled, are store
metadata only — they never enter report text or the receipt.

### Receipt — `schemaVersion: 1`

```ts
type ArtifactReceipt = {
  schemaVersion: 1; artifactId: string; runId: string;
  status: 'complete' | 'partial' | 'failed';
  modelCalls: 0; outboundRequests: 0;
};
```

The receipt carries exactly these six keys. `artifactId` is the published **report** artifact;
other artifacts of the same generation are reachable only through the human `paths` command, so
the receipt never discloses paths, titles or excerpts. `failed` is a reserved enum member: a
failed prepare publishes nothing, so a receipt with `failed` is not printed in practice and the
process exits `1` instead.

## Example flow (illustrative, not implemented)

```text
1. prepare --consent local-only --ack-storage-risk   -> local report, 0 model calls, 0 outbound requests
2. export-preview --run <runId>       -> minimized packet digest + destination + budgets + retention note
3. (human reviews the preview on the owning machine)
4. approve-export --packet-digest <d> -> Consent record bound to <d> and the destination
5. hosted analysis                    -> Analysis (findings + proposed proposals only)
6. (human) select candidates           -> isolated candidate revisions, baseline identity recorded
7. (authorized, budgeted) evaluation   -> EvaluationReceipt; regression or unknown stops the cycle
8. (human) independent review            -> approval reference bound to the exact revision
9. (human) adoption                     -> separate step; rollback baseline already recorded
10. observation window                 -> recurrence tracked; rollback on regression
```

Every arrow that moves data or changes guidance is a human action. Steps 2–10 do not exist in
this repository at all. Step 1 exists as source (`ags-retrospective prepare`), builds and passes
local packaged smoke on macOS, and is unreleased; the flags above are its real interface, unlike
steps 2–10 which are illustrative contract syntax. The acknowledgement is core-enforced:
`PrepareRequest` requires `storageRiskAcknowledged: true`. The public subpath is deliberately
bounded — mutators, claims, locks and store layout are internal and not exported.

## Explicit non-promises

- No hosted upload endpoint, API URL, account model or pricing. Nothing here is configurable yet.
- No excerpt pathway: neither `Analysis` nor the receipt can carry message text, tool output or
  transcript excerpts. Report content is owner-local, and no online mode exists to return it.
- No auto-retry of an ambiguous paid request; unknown stays unknown.
- No scheduler, polling loop, central database or vector store.
- No autonomous adoption, canary, release or rollout implied by an online opt-in.
- No guarantee that a future provider's retention is knowable — the preview states uncertainty
  rather than asserting a retention period.
- No claim that a summary is declassified. A derived packet inherits the restrictions of its
  sources, and destination restrictions are evaluated independently.

See [`session-retrospective-privacy.md`](./session-retrospective-privacy.md) for what stays local
today and [`session-retrospective-hosts.md`](./session-retrospective-hosts.md) for host surfaces.
