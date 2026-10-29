# Routing Table — What Each Tier Changes

## Delivery Mode Is Not a Tier

`delivery_mode: brief | standard | extended` travels with the task record; it never alters `snc_tier` or the risk floor.

| Concern | `brief` | `standard` | `extended` |
| --- | --- | --- | --- |
| Approved evidence | outcome, scope fence, owner, observable criteria, approval reference, verification lane | focused PRD (decision brief plus canonical REQ/AC) | standard core plus risk-triggered contracts, migration, capacity, failure analysis, governance |
| Documents | no PRD/SRS, no new formal IDs, no walkthrough | PRD always; SRS only where technical decisions or contracts need explicit design | the same core with the triggered extensions |
| Still mandatory | behavioral criteria, owner, approval, verification lane, sensitive floor | one canonical AC definition and one verification mapping | explicit design and human gate for every triggered risk |
| Never | infer low risk from file count, ticket type, or the label itself | restate ACs in prose | omit an applicable extension without an owned blocker |

- A sensitive change is always `extended`: auth, payments, data integrity, secrets, or trust boundaries keep design and human approval even when the arithmetic tier is `low`.
- A missing mode is a routing decision from approved evidence and risk, never automatic permission for `brief`.
- Each handoff carries `delivery_mode`, the authoritative work-item reference with its source revision, and the approval reference; downstream stages never re-infer authority.

| Concern | `tier=low` (0-2) | `tier=medium` (3-4) | `tier=high` (5-6) |
| --- | --- | --- | --- |
| Autonomy | Autonomous; proceed without plan approval in autonomous mode | Guided; plan shared, self-review before handoff | Plan-first; **HARD STOP** for plan approval before any code |
| Verification | Focused tests + lint on changed files | Full TDD loop per `common-tdd`, self-review of diff | Full TDD loop + independent verification via `verify-work` |
| Review mode (`code-review`) | `fast`: changed files + direct call graph | `deep`: related flows, boundaries, prior incidents | `deep` plus the relevant specialist fanout |
| Reviewer specialists | none required | `specialist-test-gap-finder` when tests changed | `specialist-architecture-guard`; `specialist-security-reviewer` when auth/trust/money touched; `specialist-test-gap-finder` |
| Human approval | none | plan acknowledged | plan approved before code, merge approved by a human |
| `model_tier` | `fast` | `standard` | `strong` |
| Monitoring | none | watch first CI run | watch CI and first production window |

## Workflow Gates by Tier And Mode

| Workflow | Effect |
| --- | --- |
| `sdlc` | Records `snc_tier`/`model_tier` in Handoff Payload; tier drives autonomy in Step 4. |
| `dev-fix` | HARD STOP mandatory at `tier=high`; `tier=low` may skip plan approval in autonomous mode. |
| `implement-feature` | `tier=high` adds architecture-guard and security-reviewer before `verify-work`. |
| `code-review` | Default `fast` at `tier=low`, `deep` otherwise, when the user has not chosen a mode. |
| `implementation-readiness` | Go/no-go per slice; a missing mode or approval reference blocks the affected slice, not independent ones. |
| `verify-work` | Proves technical criteria only; business acceptance and release stay separate referenced decisions. |
| `uat-signoff` | Human acceptance gate; reused acceptance policy requires an authorized owner's scoped grant. |
| `deploy-release` | Release authority is never inferred from verification or acceptance records. |
| `session-report` | Non-SDD work links the same work-item, approval, and evidence references without requiring SDD state. |

## `model_tier` Semantics

Runtime-neutral hint. Adapters map `fast` / `standard` / `strong` to whatever model ladder the runtime exposes; never hardcode a vendor model name in a workflow.

## Capability and effort resolution

Canonical guidance for provider-neutral capability/effort selection, dispatch receipts and cost honesty. Other workflows reference this heading instead of restating routing rules.

### Separation

Capability states how much model strength the work needs. Thinking effort states how much reasoning budget the host spends per call. They are independent: a `strong` model at low effort is not `standard` at high effort. Recommend the least expensive **eligible** configuration adequate for the task and its verification burden, never the cheapest model categorically — repair makes cheap attempts expensive.

| Situation | Capability and effort choice |
| --- | --- |
| Deterministic transformation: rename, reformat, codemod | Existing tool/script first; no LLM call unless the tool cannot express the rule |
| Bounded implementation with clear acceptance | Tier-permitted capability; effort enough to read the surrounding contract |
| Ambiguous investigation or unfamiliar codebase | `standard` or higher with wider effort; scouting costs less than premature convergence |
| Consequential review or sensitive change | `strong` capability plus an independent reviewer; effort sized to the review lens, not the diff |

SNC sensitivity floors are unchanged. A small edit or a lower capability hint never lowers a floor, never authorizes premium spend and never removes a required reviewer.

### Host-owned resolution

- Eligibility, approved profiles, supported effort and authorized fallback come from current host/project configuration. A capability hint is not account authorization, so an unauthorized cheaper account stays unavailable; substitute only inside already-authorized routes.
- Explicit configured model, effort, mode and features are preserved; never silently replaced by a hint-derived default.
- Effort vocabularies are vendor-specific. Never assume `low`/`medium`/`high` mean the same across providers.
- Unsupported effort records `unsupported` plus what was actually applied, without claiming the request was applied. Unknown support records `unknown`.
- Operator preference (economy, balanced, quality-first) shapes this request only; this release adds no persisted preference interface.
- Budget or quota the host does not expose stays unknown. Premium capability requires separate human approval, a bounded analysis-only consultation and no state mutation.

### Dispatch receipt (capability and effort)

Reuse the existing handoff/receipt record; add no telemetry store and no mandatory assignment field.

| Receipt field | Content |
| --- | --- |
| Requested capability | `fast` / `standard` / `strong` hint |
| Actual configuration | Provider, model and effort when observable; otherwise `unknown` |
| Effort support | `applied`, `unsupported` or `unknown` |
| Selection reason | Adequacy for the task and its verification burden |
| Eligibility or authority reference | Approved profile/route evidence, or `unknown` |
| Budget availability | Known value or `unknown` |
| Substitution or fallback | Reason and observed evidence, else `none` |

### Recovery routes

| Observed condition | Route |
| --- | --- |
| Missing prerequisite, context, standard or authority | `needs_context` or `blocked` naming the exact item; no provider fallback |
| Defective or incomplete output | One corrective assignment naming the failed AC and expected result; not provider failure |
| Observed provider exhaustion (quota, rate limit, unavailable) | Only an already-authorized eligible fallback; record exhaustion evidence and the selected route |
| A preference for stronger capability | Capability hint only; premium remains a separately approved, bounded, analysis-only step |

### Cost vocabulary

- API usage is billed per token; subscription or quota plans consume allowance rather than itemized money; elapsed time is neither.
- Complete task cost includes parent, workers, independent reviews, repairs and failed/cancelled attempts.
- Report input/cached/output/reasoning tokens, billed money, quota consumption and elapsed time separately, reusing `ARCHITECTURE.md` task-economics contracts.
- No numerical monetary savings without complete comparable actor coverage and resolved prices. Offline fixtures never establish model efficacy.

## Sensitive-Change Risk Floor & Reassessment

- **Sensitive-Change Floor**: Any task touching authentication, authorization, payments/financial data, data integrity, secrets, or system trust boundaries enforces a minimum of `tier=medium` (guided execution, deep review, human plan acknowledgment) even if arithmetic SNC score is 0-2.
- **Sensitive High Tier**: When sensitive code involves non-zero novelty or spread (S≥1 or N≥1 with C=2), enforce `tier=high` (plan-first HARD STOP, independent security review, human merge approval).
- **Irreversible Actions**: Actions involving data destruction, schema drops, credential rotation, privilege escalation, or production cutover strictly require explicit human authorization regardless of tier.
- **Downward Reassessment**: Downward complexity reassessment is permitted ONLY with documented new evidence (e.g., scouted blast radius proves isolated scope with verified non-interference), NEVER to bypass unresolved risk, required approvals, or the sensitive-change risk floor.
