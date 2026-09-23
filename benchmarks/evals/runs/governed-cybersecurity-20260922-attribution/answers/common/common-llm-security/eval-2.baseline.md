Risk: Critical.

An AI agent with autonomous file reading and deletion can expose sensitive data, destroy user or system files, and be manipulated by prompt injection or path traversal. Deletion without confirmation is unsafe.

Required controls:

- Restrict access with least privilege, workspace sandboxing, and an explicit path allowlist.
- Block traversal, symlink escapes, system directories, hidden credentials, and broad recursive deletion.
- Require explicit user confirmation for destructive actions; use dry-run previews by default.
- Prefer recoverable deletion/quarantine with undo support over permanent deletion.
- Log requested paths, resolved paths, decisions, and outcomes for auditability.
- Validate authorization independently of model instructions and fail closed on ambiguity.
- Add rate, scope, and file-count limits plus cancellation support.
- Test adversarial inputs, prompt injection, symlink attacks, and partial-failure recovery.

Assumption: the agent operates on user-controlled local files and deletion may be irreversible. Until these controls exist, it should not be permitted to delete files.
