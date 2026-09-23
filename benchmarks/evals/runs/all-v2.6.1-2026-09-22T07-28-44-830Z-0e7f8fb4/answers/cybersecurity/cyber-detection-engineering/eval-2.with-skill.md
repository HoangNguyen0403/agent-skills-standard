No. It is useful initial coverage, but it is not sufficient to detect account takeover.

A Boolean `new_country_login OR privileged_role_change` treats unrelated events as equivalent and produces false positives. A stronger design should include:

- A successful-login predicate, account/entity key, country baseline, device/IP/ASN, MFA result, timestamp, retention, and clock quality.
- A role-change predicate identifying the target account, initiator, old/new role, and authorization context.
- Ordered correlation where appropriate, such as:

  `new-country successful login → privileged role change for the same account within a defined window`

- Additional takeover indicators: password reset, MFA-factor or recovery-email changes, suspicious session/token creation, impossible travel, and unusual access after login.
- Expected matches, exclusions, benign cases, suppression, and an owner.

If required telemetry or collection paths are missing, coverage is `blocked` or `not-tested`; synthetic fixtures do not prove efficacy. For Sigma, use `level` for impact (`medium`/`high`) and `status` for lifecycle (`test`/`stable`). Record scope, skill/version/source, observation time, evidence references, and limitations.
