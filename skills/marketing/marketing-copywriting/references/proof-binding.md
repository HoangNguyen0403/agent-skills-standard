# Proof Binding & Qualification Preservation Reference (AC-22)

## 1. Overview of AC-22 Contract

When drafting marketing copy from proof register claims, the copywriter must preserve all qualifications, testing boundaries, and caveats in the output asset.

> **Illustrative only — not proof.** The `CLM-004` claim, percentages, command lists, and platform/version bounds shown in this reference are fictional examples that demonstrate the preservation mechanics. They are not a source of proof and must never be copied into an asset as evidence. Generated copy MUST bind to the actual claim text in the proof register; optional details such as `Node.js >=20` apply only when the bound claim itself states them.

```
+-------------------------------------------------------------------+
| FICTIONAL PROOF REGISTER EXAMPLE (illustrative, not real proof)   |
| Claim: CLM-004 (illustrative)                                     |
| Statement: "Reduces CLI output tokens by 60-90%."                 |
| Qualifications:                                                   |
|  - Tested exclusively on shell tool outputs (git, cargo, docker)   |
|  - Measured on macOS arm64 under Node.js >=20                     |
|  - Untested on Windows command prompts and non-UTF8 logs          |
+-------------------------------------------------------------------+
                                  |
                                  | AC-22: Qualification Preserved
                                  v
| GENERATED COPY (Prepared State)                                   |
| "Compress shell tool outputs by 60–90% on macOS arm64 (Node 20+). |
| *Tested on standard git, cargo, and docker CLI logs; Windows and  |
| non-UTF8 command streams currently untested.*"                    |
+-------------------------------------------------------------------+
```

## 2. Copy Asset Metadata Contract

Every copy artifact must include metadata anchoring it to the proof register. The values below are the same fictional illustration, not real register records:

```json
{
  "copy_id": "hero-cli-token-optimization",
  "context_revision": "ctx-rev-20261025-01",
  "state": "prepared",
  "claim_refs": ["CLM-004"],
  "source_refs": ["SRC-MKT-004"],
  "qualifications_preserved": [
    "Applies strictly to shell tool outputs (git, cargo, docker)",
    "Measured on macOS arm64 under Node.js >=20",
    "Windows and non-UTF8 environments untested"
  ],
  "not_ready_limitations": []
}
```

## 3. Transformation Rules

| Input Proof Claim State | Permitted Copy Expression | Prohibited / Rejected Copy Expression |
|---|---|---|
| Narrow benchmark (git, cargo, docker; 60–90% savings) | "Measured 60–90% token reduction across git, cargo, and docker commands." | "Reduces AI agent costs by 90% across your entire software stack." |
| Offline synthetic measurement (T02) | "Deterministic offline cohort measurement tested against synthetic pilot fixtures." | "Proven to double real customer retention and enterprise campaign ROI." |
| Experimental / NOT READY feature | "Experimental alpha capability; developer preview for evaluation only." | "Battle-tested, enterprise-ready, production-grade release." |
| Labor hours capacity metric | "Reduces maintainer review workload by up to 10 hours per release." | "Saves your team $1,500 per sprint in labor costs." |
