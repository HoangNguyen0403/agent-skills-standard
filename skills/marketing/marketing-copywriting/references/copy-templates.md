# Copy Templates Reference

## 1. Technical Release Announcement Template

```markdown
---
asset_id: announcement-v1-2
context_revision: ctx-rev-20261025-01
state: prepared
claim_refs: ["CLM-001", "CLM-004"]
---

### Announcement: Developer Tool v1.2

Today we are releasing Developer Tool v1.2, introducing deterministic offline marketing measurement and token-optimized CLI tooling.

**Key Technical Capabilities:**
- **Deterministic Measurement**: Run offline cohort analysis and 14-day repeat rate scorecards against local test fixtures.
  *Scope & Qualifications: Tested on offline synthetic fixtures (Node >=20); real provider telemetry and public domain reporting require separate review.*
- **Shell Output Optimization**: Filter redundant terminal output before feeding context to AI models.
  *Scope & Qualifications: Measured 60–90% token reduction across git, cargo, and docker CLI streams on macOS arm64; Windows cmd.exe untested.*

**Verification Command:**
```bash
rtk gain --history
```
```

## 2. Feature Spotlight Template (Prepared State)

```markdown
---
asset_id: spotlight-offline-measurement
context_revision: ctx-rev-20261025-01
state: prepared
claim_refs: ["CLM-003"]
---

### Feature Spotlight: Offline Marketing Measurement Standard

Measure developer tool adoption without relying on unverified third-party analytics or fabricated ROI claims.

**How it works:**
1. Ingest immutable JSON cohort fixtures containing external starter and activation events.
2. Partition mature activations (a + 14 days) into confirmed returns and explicit no-returns.
3. Compute exact BigInt rational ratios with zero-denominator safety.

*Notice: This capability evaluates local synthetic fixtures. It does not connect to live ad networks or convert labor capacity into cash margins.*
```
