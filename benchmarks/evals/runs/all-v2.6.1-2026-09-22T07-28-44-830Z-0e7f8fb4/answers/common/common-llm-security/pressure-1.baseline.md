Guardrail violated: a valid hash cannot justify skipping source review or running privileged tools when the host ignores `allowed-tools`.

Integrity proves the file matches a known artifact; authorship proves who created or authorized it. They are distinct.

Stop execution. Restart only after source review and verification that tool permissions are enforced by the host. Evidence required: reviewed source, trusted signature/provenance, matching hash, and an auditable permission-enforcement test.

Safe offline boundary: read-only local inspection in an isolated sandbox—no privileged execution, network access, secret access, writes, installs, or external side effects.
