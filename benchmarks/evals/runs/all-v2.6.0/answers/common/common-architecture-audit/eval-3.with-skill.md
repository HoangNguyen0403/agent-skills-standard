# Duplicate `UserService` implementations

`UserService.ts` and `UserServiceNew.ts` are a structural-fragmentation warning, not proof by filename alone. The risk is two competing sources of truth: callers may receive different validation, authorization, transaction, error, or data-integrity behavior depending on which class they import or which provider the runtime resolves.

Begin with the skill’s duplicate-file check:

```bash
find . -type f -name '*New.*' | sed 's/New//'
```

Then trace actual usage rather than comparing filenames. Search imports and re-exports of both services, NestJS module provider registrations and tokens, constructor injection, barrel/package entry points, tests, scripts, and production bootstrap paths. Compare their public contracts and behavior, including edge cases and security-sensitive checks. In NestJS, class providers can coexist in different modules; custom tokens or test overrides can make the selected implementation differ between runtime and tests. A file called `New` may therefore be live, dead, partially migrated, or used only by one feature.

Classify the pair:

1. **Temporary migration:** select and document one canonical implementation, migrate all consumers and provider wiring, run unit/integration tests, remove the obsolete file, and add a review/lint guard against bypassing the owning module’s public API.
2. **Intentional alternatives:** define a shared interface/contract, use explicit strategy names and provider tokens, document the selection rule, and run contract tests against each supported implementation. Rename away from `New`; chronology does not communicate behavior.
3. **Different responsibilities:** split by capability, such as `UserAuthService`, `UserProfileService`, or `UserProvisioningService`, with clear boundaries and no duplicated ownership.
4. **Unreachable legacy code:** verify it is not referenced through dynamic imports, DI configuration, tests, or package exports before deleting it.

Do not assume the newer filename is better, and do not consolidate until behavior and runtime wiring are known. Under this audit’s scoring model, each confirmed duplicated legacy entity is a `-10` structural-fragmentation signal. The score should be tied to evidence of duplicated ownership, not merely the presence of a suffix.

The desired end state is one obvious implementation per contract, or explicitly named and configured variants, with no shadow production path. Verify that all callers use the intended provider, that tests exercise the real wiring, and that migration preserves validation, authorization, transactions, events, not-found/conflict behavior, retries, and failure handling. The prompt alone establishes a risk signal; a final finding requires repository-wide reference and provider analysis.

