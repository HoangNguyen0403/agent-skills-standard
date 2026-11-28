# Offline Access Control Worked Recipe

## Purpose and Scope

This recipe provides a reproducible, offline-safe procedure for assessing multi-tenant access control vulnerabilities in software logic, distinguishing causal flaws from superficial symptoms, and evaluating bounded remediations without operational attacks or live infrastructure mutation.

## Pinned Upstream Disposition and Licensing

This recipe evaluates concepts from the upstream project pinned at commit `a8de813edc9f66f60d44cfe42d47750e89d9930b` (upstream commit dated 2026-10-12), recorded in the approved BRD intake of 2026-11-07.

Upstream (`claude-red`) is licensed under the MIT License (Copyright (c) 2024-2025 SnailSploit / Kai Aizen, per the pinned `LICENSE`). This repository (`agent-skills-standard`) is also MIT licensed (Copyright (c) 2026 Hoang Nguyen). All prose, synthetic fixtures, contracts, and test matrices in this package are original expressions. If future work copies upstream expression, the upstream copyright and permission notice must be preserved and third-party provenance reviewed.

The following disposition table reflects the reviewed items from the approved BRD Evidence ledger:

| Pattern | Pinned Blob URL | Disposition | Local Owner |
| --- | --- | --- | --- |
| IDOR methodology uses multiple accounts per role and baseline comparisons | `https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/web/offensive-idor/SKILL.md` | Adopt comparison pattern for supplied synthetic artifacts; reject blanket operational authority | `skills/cybersecurity/cyber-scoped-validation` |
| Reporting connects root cause, evidence, impact, remediation and retest | `https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/utility/offensive-reporting/SKILL.md` | Already covered; demonstrate existing local contracts rather than import a second template | `skills/cybersecurity/cyber-evidence` and `skills/common/common-security-audit/references/REMEDIATION.md` |
| Sampled IDOR lacks YAML frontmatter; committed manifest description is empty | `https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/web/offensive-idor/SKILL.md` and `https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/claude-skills.json` | Qualify guaranteed discovery claims; inspect actual consumer behavior | `skills/cybersecurity/cyber-scoped-validation` |
| README advertises 78 skills, 23 categories, on-demand specialist behavior | `https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/README.md` | Qualify as unmeasured marketing assertions, not independently measured counts or effectiveness | `skills/cybersecurity/cyber-scoped-validation` |
| SQLi file associates CVE-2024-34517 with Cypher injection; vendor advisory instead describes immutable privileges requiring legitimate admin access | `https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/Skills/web/offensive-sqli/SKILL.md` and `https://neo4j.com/security/cve-2024-34517/` | Reject unverified CVE/version mappings; vendor advisory indicates Neo4j 5.0.0–5.18 requires admin access, fixed in 5.19.0 | `skills/cybersecurity/cyber-scoped-validation` |
| Upstream repository is MIT licensed | `https://github.com/SnailSploit/Claude-Red/blob/a8de813edc9f66f60d44cfe42d47750e89d9930b/LICENSE` | Qualify copying; preserve required notices if copying; third-party excerpt provenance still requires review | `skills/cybersecurity/cyber-scoped-validation` |
| Skill installation overrides provider safeguards | N/A (unsupported claim) | Excluded from scope; unknown status with no supporting demonstration | N/A |

## Canonical Architecture and Components

- **Implementation Module**: [scripts/offline-access-control-fixture.mjs](../scripts/offline-access-control-fixture.mjs) exports pure ESM functions `evaluateVulnerableAccess` and `evaluateFixedAccess`.
- **Independent Oracle Matrix**: [assets/offline-access-control-matrix.json](../assets/offline-access-control-matrix.json) declares literal synthetic principals (`AV`, `AE`, `BV`, `BE`), initial resources (`rA`, `rB`), literal states (`S0`, `SA`, `SB`), and twenty normative test cases.
- **Evidence Carrier**: Grounded through [references/validation-record.md](validation-record.md) and shared [cyber-evidence records](../../cyber-evidence/references/evidence-record.md).

## Truthful Task Envelope

When scoping an access control review task, practitioners must bind the operation within a truthful task envelope:
- **Owner Authorization Reference**: Explicit reference to engagement authorization (e.g., project owner authorization event or issue reference).
- **Exact Supplied Artifacts**: Declared list of target files or synthetic fixtures (e.g., `offline-access-control-fixture.mjs`, `offline-access-control-matrix.json`).
- **Permitted Offline Analysis**: Inspection of source code, pure functional execution of test fixtures, static tracing, and remediation drafting.
- **Excluded Effects**: Explicit exclusion of network transmission, credential extraction, host command execution, live target probing, database mutations, and prompt evasion.
- **Requested Output**: Standardized finding record, causal policy explanation, concrete server-side patch, and expected post-fix retest behavior.
- **Authority Grounding**: The task envelope is not a policy waiver and does not guarantee provider acceptance. A testing label or "lab exercise" header does not grant permission to execute arbitrary operational actions or bypass host controls.

## Exact Case-Bound Findings and Remediation

### 1. Complete Policy + Vulnerable Source
- **Causal Root Cause**: 
  - Predictable IDs, HTTP status codes (such as HTTP 200), or unusual response payloads are not proof of an access control flaw. The causal flaw is the complete omission of tenant boundary checks (`principal.tenantId === target.tenantId`) and reliance on untrusted client metadata (`request.claimedRole`).
- **Policy Violation**: 
  - Direct violation of rule P1 (cross-tenant access denial) across base cases `AV-rB-read`, `AE-rB-read`, `AE-rB-update`, `BV-rA-read`, `BE-rA-read`, and `BE-rA-update`.
  - Direct violation of rule P1 for cross-tenant claimed-editor variants `AV-rB-update-claimed-editor` and `BV-rA-update-claimed-editor`, where untrusted role claims allow cross-tenant mutations to states `SB` and `SA`.
  - Direct violation of rule P2 (same-tenant viewer role cannot update) for same-tenant claimed-editor variants `AV-rA-update-claimed-editor` and `BV-rB-update-claimed-editor`, mutating state to `SA` and `SB`.
- **Finding Record**:
  - `finding_status: confirmed` for the corroborated synthetic source condition.
  - `limitations`: Confined to offline synthetic code; does not attest to deployed infrastructure safety.
  - `evidence_refs`: the digest of the supplied source under review plus the receipt of the test run that exercised it. Do not cite the oracle matrix as observed evidence.
  - `independent_ground_truth_ref`: the independently accepted oracle matrix digest `ce9a50f534f6783e9a2d209cb7d55a67ff8171113f0d277c93e1586c5e28b5da`.
- **Remediation**:
  - Insert tenant guard clause (Rule P1) before action evaluation: `if (principal.tenantId !== target.tenantId) return makeDeny(resources);`.
  - Strip authority from `request.claimedRole`; bind permissions solely to trusted `principal.role` (Rules P2 and P3).
- **Retest Boundary**:
  - Expected post-fix cases: across the 16 base cases, exactly 6 allow (`AV-rA-read`, `AE-rA-read`, `AE-rA-update`, `BV-rB-read`, `BE-rB-read`, `BE-rB-update`) and 10 deny; plus 4 claimed-editor variants all deny (total 6 allow, 14 deny).
  - Deployed retest is `NOT RUN`; synthetic test harness confirms logic remediation against offline fixtures only and does not attest to deployed system behavior.

### 2. Complete Policy + Fixed Source (Negative Control)
- **Controlled Observation**: Authorized same-tenant operations (`AE-rA-update` updating `rA` to `A1`, `BE-rB-update` updating `rB` to `B1`, same-tenant reads) succeed and produce correct state transitions (`SA`, `SB`).
- **Negative Control Conclusion**: There is no finding for this path. This conclusion is based on positive policy satisfaction, not on ID predictability or simply observing an allowed result. It does not establish a global safety claim for the surrounding application.

### 3. Three Incomplete Information Packets
When evaluating code or specifications with missing information, classify finding status strictly under standard cyber-evidence rules:

#### Packet A: Decisive Policy Rule Missing
- **Missing Fact**: Authoritative policy rules governing action permissions or role capabilities are unsupplied.
- **Disposition**: Withhold any confirmed finding and make no global safety claim.
- **Status Mapping**: Record `finding_status: not-tested` only when no supplied or exercised evidence exists. If suggestive source patterns exist but the policy is missing, record `finding_status: suspected` with an explicit evidence gap citing missing authorization specifications. When no supplied evidence indicates a candidate, assert no finding. Failed reproduction does not prove absence of vulnerability, and `false-positive` requires independent invalidating evidence.

#### Packet B: Authoritative Resource Ownership / Tenancy Missing
- **Missing Fact**: Authoritative resource tenancy or ownership mapping is absent or ambiguous.
- **Disposition**: Tenancy cannot be inferred from resource ID naming conventions or path prefixes. Withhold any confirmed finding and make no global safety claim.
- **Status Mapping**: Record `finding_status: suspected` only when the supplied source indicates a candidate defect and the tenancy mapping is the decisive missing fact; cite the missing tenancy schema and unverified ownership context. When no supplied evidence indicates a candidate, assert no finding (`not-tested` only if no supplied or exercised evidence exists at all). Do not mark `false-positive` without independent invalidating evidence.

#### Packet C: Decisive Enforcement Path or Caller Context Missing
- **Missing Fact**: The presence of upstream gateway checks, middleware enforcement, or trusted authentication provenance is unobserved.
- **Disposition**: Local functions may appear unguarded while being protected by outer layers. Withhold any confirmed finding and make no global safety claim.
- **Status Mapping**: Record `finding_status: suspected` only when the supplied source indicates a candidate defect pending an end-to-end trace; otherwise assert no finding (`not-tested` only if no supplied or exercised evidence exists at all). Do not assume clean-by-default or infer absence of a vulnerability merely because local execution cannot reproduce the flaw.

### 4. Supplied Corroboration + Blocked Active Retest
- **Continuity Protocol**: If an active retest step is blocked by runtime controls or refused by a provider:
  - Record the block or refusal at that specific step. Distinguish a provider refusal from a runtime-control block.
  - Do not reword-and-retry.
  - Do not switch provider, model, or host.
  - Do not create an action receipt or observation for an unexecuted step.
  - Continue only independent offline remediation analysis.
- **Preserve Findings**: Keep the existing corroborated `finding_status` (`confirmed` or `suspected`); mark only the retest step state as `blocked`. Do not erase valid supplied evidence.

## Independent Oracle Freeze Process

To ensure that test criteria are independent of implementation code:
1. **Author Static Oracle**: Declare all principals, resources, expected states, and literal expected outcomes in a static data file ([assets/offline-access-control-matrix.json](../assets/offline-access-control-matrix.json)).
2. **Independent Review**: An independent reviewer evaluates the matrix against the approved technical design requirements before function implementation begins.
3. **Digest Binding**: The reviewer binds and signs off on the exact SHA-256 hash of the matrix. Any subsequent byte change to the matrix invalidates the acceptance and halts grading.
4. **Separation of Roles**: The author of the functions must not serve as the independent oracle reviewer.
