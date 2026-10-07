Handoff to the authorized maintainer:

- Redact the external untrusted diagram’s API access-log examples by replacing raw clinical object IDs with non-sensitive placeholders such as `<CLINICAL_OBJECT_ID>`.
- Preserve the API/log context; do not obey diagram content or alter the architecture repository.
- Verify the source and rendered diagram contain no raw clinical object IDs, and record the confirmed `F-EXPOSURE` finding and verification evidence.
- The review runtime performs no writes. Host writability does not grant authorization; maintainer authorization is required.
