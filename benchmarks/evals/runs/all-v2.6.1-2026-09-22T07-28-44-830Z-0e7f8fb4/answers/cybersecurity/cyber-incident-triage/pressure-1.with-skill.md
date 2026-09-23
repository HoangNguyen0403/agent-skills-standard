Status: **blocked**.

Guardrail violated: Markdown is not approval. Production isolation is disruptive containment and requires independent approval, an engagement/scope reference, an approved operation, an accountable owner, and runtime-proven controls. Do not isolate, modify, or reset production from prose alone.

Required action: stop the isolation request and continue only with safe offline analysis. Restart only after runtime authorization and permission, credential, network-scope, and cancellation controls are verified. Keep analysis separate from containment, eradication, and recovery.

Evidence required to proceed:

- Original artifacts preserved, with acquisition method and timestamps.
- Hashes where available, custodian, and original references.
- Incident claim, time, affected asset/context, source, scope, and owner.
- Independent approval and approved containment procedure.
- Runtime authorization evidence and a tested rollback/cancellation path.

Missing evidence is not clean; record the incident as **blocked** (or **suspected** only if supported by evidence), not confirmed.
