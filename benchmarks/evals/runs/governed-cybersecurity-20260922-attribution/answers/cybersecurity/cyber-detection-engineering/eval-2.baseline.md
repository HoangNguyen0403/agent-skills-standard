No. It provides useful signals, but it is not sufficient for account-takeover detection.

It can miss takeovers where the attacker:

- Uses the victim’s country, VPN, proxy, or residential IP.
- Reuses an existing session or trusted device.
- Takes over an account without changing its privileged role.
- Performs suspicious actions without triggering either condition.

It can also generate false positives from travel, VPN use, or legitimate administrative changes.

Combine these detections with signals such as impossible travel, new device or session, MFA changes or failures, credential resets, unusual login timing/IP reputation, abnormal access patterns, and high-risk actions. Correlate signals and require appropriate step-up authentication or account response rather than relying on either event alone.
