# Duplicate `UserService` implementations

Having both `UserService.ts` and `UserServiceNew.ts` is a design-risk signal, but the filenames alone do not prove that the code is wrong. The second file may be a temporary migration, a deliberately different implementation, or an accidental fork. The risk is that the repository has no unambiguous source of truth.

The first audit step is to trace actual usage rather than compare filenames. Search all imports, re-exports, NestJS module provider registrations, injected constructor types or tokens, tests, scripts, and package entry points. Then compare the public methods and behavior, inspect version history, and determine which implementation is reachable in production. In NestJS, two different classes can be registered as separate providers and coexist; class-based injection resolves by provider token, so the application may silently use one implementation while tests or another module use the other. If both are bound to the same custom token, provider ordering or module wiring can make the selected implementation especially easy to misunderstand.

Important questions are:

- Do both services implement the same contract, or do their responsibilities differ?
- Are validation, authorization, transactions, events, and error behavior consistent?
- Which one is exported by the owning module and consumed by each caller?
- Are there callers importing the “new” file directly and bypassing the intended public module API?
- Does either implementation contain behavior that the other lacks, including security or data-integrity fixes?

If they are intended to be alternatives during a migration, define an explicit interface and provider token, name the variants by strategy or capability rather than chronology, and document the selection rule. Add contract tests that both implementations must satisfy if both are still supported. If the new version is the replacement, choose one canonical service, migrate imports and provider wiring, run the relevant unit and integration tests, remove the obsolete file, and add a guard such as a lint rule or review convention to prevent direct imports from internal paths.

If the services have different responsibilities, rename them to communicate those responsibilities—for example, `UserProvisioningService` and `UserQueryService`—and give each a clear ownership boundary. Avoid keeping a permanent `New` suffix: it describes history, not behavior, and tends to become stale. The desired end state is a single obvious implementation per contract, explicit provider configuration where variants are intentional, no dead or shadow production path, and tests proving that the runtime wiring uses the intended service.

