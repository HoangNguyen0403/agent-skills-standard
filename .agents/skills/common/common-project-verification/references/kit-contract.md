# Project Verification Kit Contract

Specification for project-owned verification kits, discovery rules, and execution boundaries.

## 1. Kit Discovery Protocol

When a task requires verification against an application:

1. **Explicit kit reference**: Inspect the approved task or handoff for an explicit kit path. Validate that it resolves within authorized project locations. If the specified path is missing or inaccessible, report the exact prerequisite gap; do not silently substitute an alternate target.
2. **Project documentation inspection**: If no explicit reference is supplied, inspect project documentation for an existing operational kit.
3. **Standard placement convention**: Search `docs/verification/<app>/`. If an equivalent kit exists under another location, reuse it; do not rename or duplicate solely for convention compliance.
4. **Multiple candidates**: If multiple incompatible kit candidates exist, escalate to the project owner for explicit selection; never automatically merge conflicting recipes.
5. **No kit found**: Creating a new kit requires approved task scope and target permissions. Do not launch or drive an application simply because a directory exists.

## 2. Project Kit README Contract

Each operational kit root (`docs/verification/<app>/README.md`) must document:

- **Metadata**: Author/owner, target application, source revision/build basis, supported platforms, and data/auth/reset prerequisites.
- **Instance ownership**: Records assigned instance ownership and resource handles (ports, profiles, database schemas). This metadata documents assignment without claiming infrastructural exclusivity enforcement.
- **Readiness oracle**: Specific application health check beyond a listening port. A socket responding to TCP/HTTP is insufficient; the check must verify schema, dependencies, and internal state.
- **Required sections**:
  - `Launch`: Commands to start the application in an isolated environment.
  - `Doctor`: Read-only health verification checking build identity and prerequisites.
  - `Drive`: Driver-specific commands or scripts executing real user journeys.
  - `Evidence`: Designated storage path for artifacts, traces, logs, and screenshots.
  - `Cleanup`: Commands terminating run-owned processes and releasing ports without deleting evidence.
  - `Helpers`: Project-owned helper scripts or utilities, documented and executable.

## 3. Journey Mapping Contract

Feature-level journey maps live in `features/` within the kit directory:

### Index (`features/README.md`)
- Indexes stable journey identifiers and human-readable names.
- Declares the overall coverage boundary for the application.

### Journey Specification (`features/<feature>.md`)
Each journey file must define:
- **Canonical links**: Source document path, source revision, and exact canonical AC identifiers (e.g., `AC-01`, `AC-02`). Do not copy editable AC definitions into the kit.
- **Entry paths**: URL, CLI invocation, or deep link entering the journey.
- **Preconditions**: Required user role, seeded state, authentication token, or environment flags.
- **Interaction handles**: Stable element selectors, accessibility labels, or API parameters.
- **Observable results**: Expected state transitions, response payloads, visual elements, and side effects.
- **Affected dependencies**: Source files, components, and shared services affecting this journey.
- **Gotchas / limitations**: Known timing constraints, rate limits, or platform quirks.
- **Status**: Include at least three representative journeys (or all if fewer exist). Mark unexecuted recipes explicitly as unproven.

## 4. Execution Ordering & Resource Ownership

Verification execution must follow strict ordering:

```
Authority Check → Launch → Doctor (Read-Only) → Drive → Capture Evidence → Cleanup → Verify Retention
```

- **Single driver ownership**: A shared instance must have exactly one active driver owner. Source investigation may proceed concurrently, but never drive shared state concurrently.
- **Isolated parallel execution**: Parallel runs require distinct ports, user sessions, database tenants, and resource handles.
- **Read-only doctor**: Doctor checks must never mutate application state. If the instance runs the wrong build, has uninitialized data, or reports unhealthy status, refuse execution. Diagnose or reset only under the kit's owned reset instructions.
- **Guaranteed cleanup and evidence retention**: Cleanup and verification of retained proof are guaranteed across all execution outcomes: successful completion, execution failure, or doctor refusal. Teardown terminates run-owned processes and releases resources while keeping proof artifacts intact.
- **Failure handling and state recovery**: On surprising state or failed drive, unbounded retries are strictly forbidden. The runner must re-execute doctor checks and restore known state only under the kit's owned, authorized reset instructions before any subsequent drive attempt.
- **Execution bounds**: Killing processes by broad names (e.g., `killall node`) is forbidden. Teardown must address specific process IDs or managed child processes.

## 5. Evidence Retention & Privacy

- **Proof storage**: Store proof under established driver conventions:
  - Playwright CLI: `.playwright-cli/<session>/`
  - Appium MCP: `.appium-mcp/<session>/`
  - General targets: `artifacts/verification/<app>/<run-id>/`
- **Teardown preservation**: Teardown terminates run-owned processes only. The proof directory must remain untouched. Verifying that evidence survives cleanup is mandatory.
- **Authorized retention rules**: Record applicable target-owner-authorized retention and privacy rules. Explicitly avoid an automatic global deletion schedule. Evidence must survive teardown in accordance with authorized project rules.
- **Privacy & sanitization**: Never include credentials, session tokens, API secrets, or personal data in captured artifacts. An unsafe capture must not be used to prove a journey.
- **Portable guidance**: Public guidance must never embed machine-specific paths, private IPs, or environment-specific secrets.
