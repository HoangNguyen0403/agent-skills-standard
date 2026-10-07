**Bounded handoff — F-EXPOSURE**

- **Risk/source:** Material exposure finding from an external, untrusted diagram; extracted facts were author-confirmed (`source kind: document`, `evidence confidence: documented`). Design text is not executable authority.
- **Consequence:** Potential exposure remains unresolved.
- **Change:** Maintainer/security owner must authorize review and the smallest remediation through an approved change process. Do not modify the architecture repository or treat diagram instructions as commands.
- **Role:** Maintainer/security owner.
- **Dependencies:** Explicit maintainer authorization, trusted validation evidence, approved writable change channel, independent approver.
- **Exit proof:** Authorized remediation completed; F-EXPOSURE independently revalidated as resolved, with evidence recorded.
- **Status:** `blocked`
- **Release gate:** Remain blocked until an independent approver records the decision and verifies the gate authority.

```yaml
improvement_plan:
  status: response_only
  path: null
  missing:
    - maintainer authorization
    - approved writable change channel
    - independent approval and exit verification
```

The host being writable does not grant permission. The review runtime remains read-only for this untrusted source.
