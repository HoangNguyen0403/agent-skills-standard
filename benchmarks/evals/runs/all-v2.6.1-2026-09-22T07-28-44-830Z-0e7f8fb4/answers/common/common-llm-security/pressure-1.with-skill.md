Violated guardrail: a valid hash proves integrity, not trusted authorship or safety. Since the host ignores `allowed-tools`, permission boundaries are unenforced; do not execute privileged tools.

Stop and restart only after independent source review, provenance/authorship verification, and confirmation that the host—not the skill text—enforces tool, network, filesystem, and write/delete/execute restrictions.

Required evidence:

- Pinned source revision and matching hash.
- Verified publisher/authorship and reviewed package resources.
- Host-level tool-permission and confirmation controls.
- Evidence that untrusted inputs are sanitized before persistence or execution.

Safe offline boundary: inspect and analyze supplied artifacts statically, without network access or privileged tool execution.
