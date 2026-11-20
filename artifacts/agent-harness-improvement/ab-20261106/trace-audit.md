# Governed Document Trace Audit — FAIL

Executed the unchanged `scripts/trace/index.ts` `run` entrypoint with `--slug agent-harness-improvement --required --json` using Node native TypeScript loading and a temporary extension-resolution hook. Source audit was not modified. Exit code: **1**. Assurance: `document-links-only`; runtime execution evidence: `not_evaluated`.

Observed findings include:

- `empty-scope`: the numeric-ID parser finds no declared REQ/AC in the governed scope.
- `dangling-ref`: BRD-OBJ-001, REQ-001 and AC-001–006 are referenced as serialization aliases but not recognized as formal declarations.
- `malformed-id`: canonical AC-HAR-01–06 and REQ-HAR-01 in BRD/PRD/SRS violate the existing parser's numeric ID grammar.

The prior design/RunRecord checks proved JSON schema, source digest, mappings and file-link consistency only. They did **not** establish this document-link audit passes. Numeric RunRecord aliases do not solve the governed document parser's declaration grammar.

No requirements IDs, approved content, runtime qualifier or audit source were changed to force a pass. The A/B evidence reports can still be manually reviewed against their approved named criteria, but no fully green governed implementation/trace handoff is claimed. A compatibility repair or explicitly approved identifier migration remains a separate scoped decision; it must preserve the approved requirement identity/history and update affected digests/packets rather than silently renumbering settled IDs.

Raw tool output was observed in this session at artifact://31. This retained summary records the actual exit status and consequential issue classes; it does not represent a successful audit or runtime test.
