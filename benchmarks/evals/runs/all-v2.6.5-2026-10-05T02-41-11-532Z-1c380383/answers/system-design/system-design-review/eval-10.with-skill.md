```yaml
handoff:
  trust: trusted
  author_confirmed: true
  maintainer_write_authorization: present
  finding:
    id: F-RESTORE
    material: true
    confirmed: true
  improvement_plan:
    status: response_only
    path: null
    missing:
      - plan file: creation failed before any file existed
      - review link: not written
      - architecture-entry link: not written
    reason: persistence failed; no retry performed
  saved_artifact_exists: false
```

Copyable action register:

```text
finding_id: F-RESTORE
risk/source/consequence: Confirmed material finding; detailed values not supplied
change: Bounded corrective action for F-RESTORE; exact change not supplied
role: Maintainer
dependencies: Not supplied
exit_proof: Must be scoped and verified
status: open
release_gate: Requires a separate approval record naming an independent approver, decision, and checked gate authority
```

No plan file or links are asserted as saved.
