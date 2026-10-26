# Large-source delegation

## Separation of roles

1. **Tool-first mechanical extraction:** Extract text, document layout, tables, and page boundaries once using available local tools or utilities. Never use model turns for raw file paging or mechanical extraction where programmatic tools suffice.
2. **Conditional diagnostic/visual worker:** Inspect charts, complex visual layout, corrupted extraction spans, or image-heavy pages only when mechanical extraction reports defects or ambiguity. Dispatch only under the worker brief contract below, with its own authorized spans, modality, provider/account, output target, and limits. Never run a visual or multi-modal reader over the entire book by default.
3. **Bounded semantic synthesis workers:** Assign bounded packets of source text and dependencies to worker agents for analysis, rule extraction, and card drafting. Workers do not coordinate peers, delegate work, or perform shared writes.
4. **Coordinator integration:** One coordinator reconciles vocabulary, manages the compact packet ledger, sequences dependencies, resolves conflicts against source anchors, and performs final assembly without accumulating full worker outputs or transcripts.
5. **Independent review:** An independent reviewer verifies source fidelity, rights compliance, and boundary integrity without implementation ownership. Reviewers emit bounded receipts with sampled locators and explicit unreviewed scope; review does not grant source rights or imply whole-corpus approval.

## Source identity and locator discipline

- **Immutable identities:** Preserve raw source and extracted text hashes. Treat extracted text as read-only reference data.
- **Dual locators:** Maintain explicit distinction between physical file/PDF page IDs (e.g., `pdf:p42`) and source-printed labels/folios (e.g., `source:p28` or `sec:3.2.1`).
- **Canonical ownership vs. context-only overlap:** Each source span has exactly one canonical owner packet responsible for synthesizing its content. Bounded overlap across packet boundaries provides reading context only and must be explicitly labeled `context-only` to prevent duplicate canonical cards.

## Packet planning and brief contract

- **Pilot-informed sizing:** Choose packet size, concurrency, and batching limits from a measured representative pilot under authorized host/account limits, not fixed page counts, theoretical calculations, or prompt-only caps/savings.

Every dispatched worker brief — bounded synthesis packets and conditional diagnostic/visual inspection alike — explicitly specifies the same contract with role-appropriate inputs, actions, and outputs:

- **Boundaries & inputs:** Canonical source spans, `context-only` overlap spans, exact input file paths, and approved external dependency slices. Diagnostic briefs name the exact pages, image handles, or corrupted spans under inspection plus the reported extraction defect justifying them.
- **Permissions & authorization:** Allowed action scope (read-only analysis, artifact write), approved provider/account boundaries, permitted modalities (text, image, multi-modal), and tool access restrictions. A local extraction defect never authorizes sending source pages or images to an unapproved provider or account.
- **Output targets:** Assigned artifact file path(s) (cards, partial maps, visual defect notes, or transcription).
- **Budget & limits:** Explicit allocation covering instructions, input source, dependencies, and an output generation reserve, noting whether limits are host-enforced.
- **Escalation conditions:** Immediate stop-and-escalate conditions on missing external definitions, corrupted/ambiguous extraction, inadequate budget reserve, or unapproved provider/tool/modality access requests. Workers request external slices via coordinator rather than loading external chapters.

Tool-first mechanical extraction keeps its existing authorized local-tool scope and is not a model worker stage.

## Worker receipt and artifact handoff

- **Artifact-based outputs:** Workers save discrete output files and return a structured receipt naming:
  1. Saved artifact paths and covered canonical source locators;
  2. Semantic dispositions (`converted`, `partial`, `reference-only`, `excluded`, `unresolved`);
  3. Identified extraction defects or layout ambiguities;
  4. Checks actually performed and observed results (or explicitly marked unperformed/unavailable);
  5. Unresolved external dependencies or glossary terms;
  6. Observed token/call usage when exposed by the host.
- **Strict worker boundaries:** No recursive delegation (never spawn sub-agents), no coordinator tool calls, and no direct writes to shared canonical registries.

## Coordinator compact ledger and integration

- **Compact ledger:** The coordinator maintains a minimal ledger containing canonical span ownership, artifact pointers, dispositions, dependency/conflict status, and acceptance state. Keep full packet outputs and complete worker transcripts out of accumulated coordinator context.
- **Coverage reconciliation:** Reconcile ledger against source outline: identify and resolve uncovered spans, duplicate ownership claims, or conflicting dispositions from receipts before retrieving targeted artifact evidence.
- **Source-grounded repair:** Reconcile discrepancies directly against source anchors and locators. When an integration check fails, re-dispatch only the affected packet with narrowed context. Never re-run the entire corpus.
- **Preserve accepted work and review limits:** Do not rewrite or globally re-paraphrase accepted packets during final assembly; normalize identifiers, verify cross-references, and assemble monotonically. Retain independent review receipts (sampled locators, findings, unreviewed scope) alongside final artifacts.
- **Sequential fallback:** If host concurrency, tool availability, or sub-agent runtime support is missing or exhausted, fall back to bounded sequential packet execution. Do not ingest the entire book into a single context.
