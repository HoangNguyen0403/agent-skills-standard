# Landing Audit Protocol Reference

## 1. Scope & Purpose

This protocol specifies the empirical audit methodology for inspecting developer-focused landing pages. It operationalizes requirements from PRD REQ-MKT-011 (AC-23) and REQ-MKT-017 (AC-29 through AC-32).

Every diagnostic finding must ground directly in observed DOM structures, verified component contracts, and viewport geometry.

## 2. Target Viewport Geometry & Surface Checklists

Audits inspect viewports across evidence-based target choices or requested design breakpoints. Never hardcode a specific product's section names, headline copy, or component file paths: derive every checklist item from the supplied product goals, the selectors observed in the page under audit, and the primary action the page owner named.

### 0. Supplied Baseline Inputs (record before inspecting)

| Input | Required value | If missing |
| --- | --- | --- |
| Product goal | The outcome the page owner states for this page | Mark `goal_unresolved`; ask rather than infer a goal |
| Primary action | The single action the page owner wants a qualified visitor to take | Mark `primary_action_unresolved`; do not assume install versus signup |
| Observed selector map | Every audited region bound to a selector captured from the page, annotated with its role (navigation, value proposition, primary action, supporting proof, secondary path) | Mark that region `unverified`; never substitute an assumed section or component name |
| Declared claims | The `context_revision` and `proof_ref` values the page is allowed to display | Report proof binding as unavailable; never invent claim identifiers |

Every finding cites the observed selector and the supplied input it serves. A finding with no observed selector is not a finding.

### A. Target Desktop Viewport (e.g. $\ge 1280 \times 800\text{ px}$ or requested desktop breakpoint)
- **Navigation**: Confirm that every target in the observed navigation resolves, and that external links carry appropriate security attributes (`rel="noopener noreferrer"`).
- **Value proposition**: Check visual hierarchy between the observed headline, its supporting subtitle, and the primary action.
- **Primary action prominence**: Verify the observed primary-action selector is readable without horizontal clipping and exposes an accessible trigger.
- **Section rhythm**: Verify that the observed top-level section order serves the supplied product goal (statement of the problem $\to$ capability or proof $\to$ primary action), and name any observed section that interrupts that path. Report the order you observed; do not assert a canonical order that belongs to another product.

### B. Target Mobile Viewport (e.g. $\le 390 \times 844\text{ px}$ or requested mobile breakpoint)
- **Mobile Navigation**: Confirm accessible toggle button (`aria-expanded`, `aria-controls`), sliding drawer with appropriate focus containment, and automatic closure upon anchor selection.
- **Touch Target Sizing**: All interactive touch targets (buttons, links, copy triggers) must satisfy minimum touch bounding boxes of $44 \times 44\text{ px}$.
- **Vertical Density & Stacking**: Ensure multi-column grids collapse cleanly into single-column flows without horizontal overflow (`overflow-x: hidden`).
- **Above-The-Fold Action**: Verify that the observed primary-action selector, or a navigation target that reaches it, is reachable within the initial mobile scroll viewport.
## 3. Conversion Hypothesis Schema (AC-23)

When analytics or telemetry baselines are absent (`status: "unavailable"`, `reason: "baseline_unknown"`), analysts must NEVER invent baseline conversion loss, drop-off rates, or potential percentage lifts.

All recommendations must be recorded in the following structured hypothesis format. The values below are **illustrative placeholders only** — no product's real section names, selectors, or metric names are implied; fill every field from the page observed in this audit.

```json
{
  "hypothesis_id": "HYP-LND-001",
  "context_revision": "<approved-context-revision>",
  "claim_ref": "<approved-claim-id>",
  "observed_surface": {
    "viewport": "mobile",
    "region_role": "primary action",
    "element_selector": "<selector captured from the audited page>",
    "current_behavior": "<what the captured element actually does at this viewport>"
  },
  "rationale": "<why that observed behavior may block the supplied product goal>",
  "proposed_variation": "<one concrete UI variation to test>",
  "proxy_signal": "<metric from the measurement contract that would move if the hypothesis holds>",
  "guardrail": "<how the primary action still completes with telemetry disabled>",
  "status": "prepared"
}
```

## 4. Zero-Telemetry Graceful Degradation Checklist

The landing page must adhere to privacy-preserving degradation invariants:
1. **Unblocked Core Pathways**: Reading documentation, inspecting specs, selecting text, and copying CLI commands must execute natively regardless of telemetry state.
2. **Failure Isolation**: If telemetry network transport fails (e.g. adblocker, network timeout, 404/500 endpoint response), catch handlers must discard telemetry errors silently without raising unhandled promise rejections or disabling the UI.
3. **No Phantom Conversions**: No analytics event (`install_command_copy`) may be emitted if the underlying clipboard write operation fails or is denied.

## 5. Output Governance

Audit reports and proposed redesigns are prepared drafts by default (`status: "prepared"`) and cannot authorize production action. Skills provide procedural guidance for agents and do not enforce host-level runtime gates. Direct code mutation of landing components requires explicit human review and implementation approval by the designated web owner.
