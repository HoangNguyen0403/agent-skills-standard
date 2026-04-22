# Multi-Layer Review Lenses

Apply each lens independently when auditing files or reviewing diffs. Focus on one concern at a time.

## Lens 1: Security (Mandatory)

Follow [signals.md](../../common-security-audit/references/signals.md).

- **Secrets**: Find `password|apiKey|token` in source.
- **PII**: Find sensitive fields in `log|print` statements.
- **Auth**: Compare `@Get/@Post` against `@UseGuards/@Auth`.
- **RCE/SSRF**: Locate user input in shell/eval or outbound HTTP clients.

## Lens 2: Architecture & Correctness

Focus on separation of concerns and logic.

- **SRP (Single Responsibility)**: Does the class/method do one thing?
- **Logic Errors**: Conditionals, off-by-one, boundary cases.
- **Async Safety**: Is error handling present? Potential race conditions?
- **N+1 Queries**: Look for loops (`for`, `map`) containing database calls.
  - **TypeORM**: `find()|findOne()` inside a loop.
  - **Eloquent**: `foreach` accessing relation property without `->with()`.
  - **JPA**: `@OneToMany` without `@EntityGraph` or `JOIN FETCH`.

## Lens 3: Silent Failures & Error Handling

Examine for `try/catch` or `.catch()` blocks.

- **Empty catch blocks** → **BLOCKER** (Critical)
- **Fallback to mock/stub in production** → **BLOCKER** (Critical)
- **Error Context**: Does the log include operation details and relevant IDs?
- **Actionable Feedback**: Is the user told what to do, not just "an error occurred"?

## Lens 4: Type Design

For each new type or interface:

- **Illegal states**: Can it represent a state that shouldn't exist? (e.g., negative price).
- **Mutable internals**: Is the internal state violatable from outside?
- **Anemic model**: Is it just data with no behavior where logic should be?

## Lens 5: AI / LLM Security

Triggered if diff touches LLM SDKs (OpenAI, Anthropic, etc.).

- **Prompt Injection**: Is user input interpolated into the system prompt?
- **Output Sanitization**: Is LLM output sanitized before DOM/shell usage?
- **Human in the Loop**: Do write/delete agent tools have confirmation steps?

## Lens 6: Test Coverage & Doc Accuracy

- **Gaps**: Are new logic paths covered?
- **Redundant Tests**: Are tests verifying implementation or behavior?
- **Doc Lag**: Do comments correctly describe current logic?
- **Prose**: Are comments explaining "what" (obvious) or "why" (non-obvious)?
