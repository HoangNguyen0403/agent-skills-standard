# Content Mapping Reference

## 1. Intent, Channel, and Action Triad (AC-21)

Every asset proposed in a marketing content strategy must satisfy the triad contract:

```json
{
  "asset_id": "guide-token-optimization",
  "context_revision": "ctx-rev-20261025-01",
  "intent": {
    "category": "procedural",
    "problem_statement": "Developers running agent pipelines face 429 quota exhaustion and high token expenditure on CLI command outputs.",
    "evidence_ref": "SRC-MKT-004"
  },
  "channel": {
    "path": "docs/guides/token-optimization.md",
    "format": "technical_guide",
    "target_segment": "agent_pipeline_maintainers"
  },
  "action": {
    "observable_target": "Install rtk proxy and execute benchmark command with token accounting enabled.",
    "verification": "rtk gain command output observed",
    "primary_cta": "Run rtk gain to inspect local token compression ratio"
  },
  "proof_bindings": {
    "claim_refs": ["CLM-004"],
    "source_refs": ["SRC-MKT-004"]
  },
  "state": "prepared"
}
```

## 2. Intent Categorization

1. **Informational Intent**:
   - Focus: Deep architectural understanding, protocol boundaries, trade-off comparisons.
   - Typical Channels: Repository Architecture documentation, technical blog whitepaper.
   - Intended Action: Read contract specifications, inspect architectural decision records.
2. **Procedural Intent**:
   - Focus: Exact commands, configuration snippets, reproduction steps, troubleshooting.
   - Typical Channels: Getting-started guides, setup tutorials, CLI manuals.
   - Intended Action: Clone repository, execute test suite, run local CLI filter.
3. **Evaluative Intent**:
   - Focus: Evidence-based benchmark results, offline scorecard verification, objective constraint analysis.
   - Typical Channels: Benchmark reports, comparative evaluation briefs.
   - Intended Action: Run offline evaluation script, review synthetic test fixtures.

## 3. Rejection Rules

- Reject assets without `intent.evidence_ref` or verifiable user problem.
- Reject assets lacking a concrete `channel.path`.
- Reject assets where `action` is abstract ("engage with brand", "learn more") without an observable step.
- Reject assets without `context_revision` binding.
