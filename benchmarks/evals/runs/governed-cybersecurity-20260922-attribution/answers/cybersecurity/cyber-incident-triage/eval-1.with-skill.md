Status: **suspected; containment blocked**. The alert supports a credential-theft hypothesis, but does not confirm it. Severity reflects urgency/impact, not proof.

Evidence: preserve the original memory image unchanged, recording its acquisition method, timestamp, custodian, hash (if available), and original reference. Treat missing metadata or artifacts as unknown—not clean.

Limitations: host isolation, active collection, scanning, eradication, and production changes require a valid scope reference, approved operation, owner, and runtime-enforced controls. The isolation scope is expired, so do not isolate, reset credentials, delete artifacts, or modify the host from prose alone.

Next actions:

1. Assign the incident owner and document the alert, affected asset, source, time, scope gap, and evidence references.
2. Continue only safe offline analysis of the preserved image; assess credential-theft indicators without altering the original.
3. Obtain renewed scope approval and independent approval for disruptive containment, with explicit host, network, credentials, cancellation, and runtime controls.
4. Once approved, execute isolation through the authorized control plane, record the operation and efficacy, then separately plan eradication and recovery.
5. Reassess status as **confirmed**, **false-positive**, or **not-tested** only when evidence supports that conclusion.

References: NIST SP 800-61r3 incident response and NIST SP 800-86 evidence handling.
