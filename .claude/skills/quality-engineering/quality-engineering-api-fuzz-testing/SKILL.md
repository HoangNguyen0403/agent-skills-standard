---
name: quality-engineering-api-fuzz-testing
description: Author and execute structured API fuzzing, property-based robustness tests, and dynamic authorization checks. Use when fuzzing API payloads, testing schema boundaries, or verifying real-guard access controls.
metadata:
  triggers:
    files:
      - "test/**/*.fuzz.*"
      - "tests/**/*.fuzz.*"
      - "test/**/*.security.*"
    keywords:
      - api fuzzing
      - property-based api testing
      - api robustness
      - schema fuzz
      - malformed payload
      - boundary fuzzing
      - api security testing
---
# Quality Engineering: API Fuzz and Security Testing

## **Priority: P0 (CRITICAL)**

## Input

API operation contract (OpenAPI/DTO/schema), target endpoint, expected invariants, and authorization status. Purpose is `fuzz` or `security` (`lane: api`).

## Core Rules

- **`[API-FUZZ-01]` Discovery vs Robustness**: Distinguish content discovery (wordlist bruteforce) from structured fuzz testing. Fuzzing validates contract violations, unexpected 500s, unauthorized state changes, and resource exhaustion under malformed inputs.
- **`[API-FUZZ-02]` Four Contract-Derived Oracles**: Assert 4 invariants against approved operation contracts:
  1. *Crash Resilience*: No unhandled 500/502/504 errors; invalid inputs return contract-approved 4xx; valid boundary cases return contract-approved 2xx.
  2. *Contract Conformance*: Payloads match approved success/error schemas without stack traces or path leaks.
  3. *State & Isolation*: No unauthorized state mutation, unpermitted field updates, or cross-tenant leakage.
  4. *Resource & Containment*: Client enforces containment deadline with cancellation/drain; product latency evaluated against approved contract SLOs (never invent universal thresholds). Client safety ceilings (timeout, bytes, depth) are own-execution bounds, not product PASS criteria; any numeric fixture objective must be labeled synthetic and replaced with the approved objective before execution.
- **`[API-FUZZ-03]` Deterministic Seeds & Minimization**: Runs must record PRNG seeds. Failing inputs must be minimized (shrunk) to the smallest reproducing payload with explicit reproduction commands. Discovery runs with shrinking enabled; shrink replays count against the finite budget. Disabling shrinking is permitted only when replaying an already minimized seed/input, never for discovery.
- **`[API-FUZZ-04]` Regression Promotion**: Minimized distinct failures must be promoted to permanent deterministic regression tests (`lane: api`, purpose: `regression`).
- **`[API-FUZZ-05]` Real Guards for Security Proof (`AC-13`)**: Authorization tests must exercise real guards and permission filters with synthetic tenant/role personas. Bypassed guards (`canActivate: () => true`) cannot serve as security proof.
- **`[API-FUZZ-06]` Authorization & Safety Gate (`AC-15`, `C4`)**: Active dynamic fuzzing requires explicit target authorization, isolated synthetic environments, finite generation/payload byte/depth caps, and active cancellation/drain on timeout. If authorization or caps are unconfirmed, mark dependent execution `BLOCKED` while continuing offline harness/case planning. Agents cannot self-authorize.

## Workflow

1. **Classify Obligations (`C1`, `C2`)**: Record operation, HTTP method, path, principal, purpose (`fuzz`/`security`), and resource limits.
2. **Safety Check (`C4`)**: Verify explicit target authorization, non-production environment, and finite runtime/payload caps. If absent, mark dependent execution `BLOCKED` and continue offline planning.
3. **Generate Mutated Payloads**: Apply schema-aware properties, type-confusion, boundary values, nulls, and sequence variations within finite serialized byte/depth ceilings; cyclic structures require explicit wire encoding.
4. **Execute & Contain**: Run under deterministic seed, strict client containment timeout with request cancellation/socket drain, and error-abort limits.
5. **Evaluate Invariants**: Check contract-approved status codes, payload shapes, tenant isolation, and product SLOs.
6. **Shrink & Promote**: Minimize failing inputs; output reproducible scenario record and commit to regression suite.

## Anti-Patterns

- **No Uncapped Scans**: Never run fuzz loops without finite timeout, rate limit, and request ceiling.
- **No Self-Authorization**: Never run dynamic security/fuzz probes against unauthorized targets.
- **No Wordlist Equivalence**: Never treat endpoint discovery (e.g. ffuf wordlists) as fuzz robustness testing.
- **No Bypassed Guards**: Never claim access control verification when authentication guards are disabled.
- **No Unreproducible Bugs**: Never report a fuzz failure without deterministic seed and minimized payload.

## References

- [Fuzzing Methodology & Generators](references/fuzz-methodology.md)
- [API Fuzz Scenarios & Templates](references/fuzz-scenarios.md)
- [NestJS Real-Guard Verification](../../nestjs/nestjs-testing/SKILL.md)
- [DAST Tooling & Probing](../../common/common-dast-tooling/SKILL.md)
