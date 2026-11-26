# Bounded qualification and routing contract design

Status: proposal only. No runtime code, public schema, host policy or paid execution is approved by this document. Candidate changes remain branch-only.

Continuation note: the later `docs/srs/srs-outcome-driven-agent-guidance.md` supersedes this document's routing recommendation with the smaller existing associated-concept input contract. The latest operator continuation authorizes only that presented five-file source change. Executable host, paid-run, distribution and activation gates below remain unchanged; this historical proposal supplies none of those permissions.

## A. Executable guidance comparison

### Existing interfaces and why they cannot be reused unchanged

`scripts/evals/execute.ts:20–22` defines EvalRunner as a prompt-to-answer/usage function. Its worker arguments request read-only execution and ignore user config/rules (`58–76`); those arguments alone are not an observed confinement proof. The runner consumes one string, retains final answer and parsed usage, and removes its temporary output directory (`157–209`). `isolatedInstruction` prohibits tools in prompt text (`141–155`). Changing those meanings in place would silently alter the normal evaluation protocol.

Recommendation: a separate pilot module, not a change to EvalRunner, GenerationProtocol, L3 manifests, or their historical readers. Proposed new owned directory if implementation is approved: `scripts/evals/guidance-pilot/`; keep its CLI separate until reviewed integration is explicitly authorized.

### Proposed contracts

- Bundle: current/candidate ID, explicit relative-path allowlist, exact bytes/digests, base source identity. Deliver selected authored guidance/resources only; exclude eval answers, hidden rubrics, expected-observation manifests and unrelated repository content. Record delivered bytes separately from observed actual loads; equal availability is not equal consumption. Preserve the same discovery rules in both arms.
- Task: opaque case/variant ID, fixture digest, authorized scope and allowed effects, gate requirements. Hidden oracle bytes and expected-observation references remain outside worker access and cannot be leaked through delivery manifests.
- Host capability: explicit verified workspace confinement, credential/network restrictions, action-event capture, owned process teardown, and independent observation. Distinguish denied worker-tool egress/credentials from host-mediated model-provider access; document the latter's authorized route without giving workers provider credentials. Prompt text is not a capability assertion. Missing capability refuses the trial before worker launch.
- Trial: arm, case, repetition, actual configuration, start/finish state, immutable action/observation references, usage fields with availability labels, failure/timeout/infrastructure classification.
- Verdict: rubric revision, criteria results, independent expected-outcome basis, safety violations, interaction counts and adjudication identity. It is not model self-reported success.

### Lifecycle

Validate approved grant and manifests → allocate exclusive owned trial/output workspace → deliver only authorized task and bundle → execute through the approved confined host → capture actual actions and independent final state → stop/reap owned resources → seal immutable receipt → grade outside worker context.

Never replay an uncertain consequential effect. Cancellation/timeout retains partial observations and cannot be marked passed. No silent retry, history rewrite, or deletion of failing trials. Resource cleanup must not remove the only evidence copy.

If capture fails after launch, cancel the owned worker, retain partial evidence, independently inspect protected targets and mark the result unknown/infrastructure-invalid wherever coverage is incomplete. Never infer “no unauthorized effect” from missing events. Reconcile uncertain effects before any replacement attempt.

### Required proof before trial execution

A synthetic consumer fixture must prove valid task completion, unauthorized outside-scope write/network denial, capture failure refusal, timeout/cancellation cleanup, oracle inaccessibility and immutable publication. A permission-denial assertion alone does not prove that the denied effect never happened; observe the actual protected target through the host observer.

The specific supported host mechanism is unresolved; name an existing approved mechanism and its observed guarantees before adapter implementation. Existing Codex read-only flags are insufficient for tool-using file edits; switching to workspace-write is not by itself proof of complete confinement. No host security-control changes may be made to satisfy the experiment. This is the load-bearing technical decision to review before implementing an adapter; this proposal is not feasibility or confinement proof.

### Budget and denominator

Retain 144 planned trial slots for one exact authorized eligible configuration; separately approve a maximum launched-attempt count, spend, concurrency, provider access and stop cap. Predeclare invalidity and replacement rules before outcomes. Rates and complete usage are currently unknown. Retain/count all launched attempts, including timeout/incomplete task failures; separately disclose and justify infrastructure-invalid attempts and any replacement. Publish both all-attempt and valid-task success rates so dropping non-completions cannot inflate efficacy.

## B. Routing contract

The metadata candidate removes generic keyword collisions but cannot represent a conjunction of domain and intent independently of word order. It currently enumerates qualified phrases; review found remaining genuine-phrase losses. Do not describe those as an accepted trade-off.

Two explicit approval options:

1. Accept a finite metadata contract, naming the supported positive/negative corpus and known losses. This changes the original acceptance interpretation and requires operator approval; no claim of universal semantic recognition.
2. Approve a bounded matcher contract design: associated Flutter CI/CD intent, with word-order independence and adversarial non-CI negatives. Freeze mixed-domain (“Flutter navigation workflow and Go deployment pipeline”), negated, quoted-content and ambiguous requests before selecting representation; mere domain-token AND intent-token presence is insufficient. Preserve ordinary routing and explicit file-route semantics. Exact representation and any public metadata delta require separate design review; no schema or matcher edits are authorized yet.

Recommendation: option 2 for a maintainable generalization; do not continue appending phrases to match reviewer examples. Evidence does not prove a global semantic router or LLM classifier is required. Prefer deterministic bounded association if a reviewed design can preserve existing consumers; do not claim token conjunction establishes intent.

## Decision requested

Approve the bounded runtime/matcher contract direction and its file/interface design before implementation, or retain the candidates and defer qualification. Paid model evaluation still requires a separate exact account/configuration/resource grant. Review approval is not human authorization, distribution, or activation.
