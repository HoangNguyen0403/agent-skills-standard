# Strict TypeScript Testing Patterns

Patterns for writing Jest tests that pass `recommendedTypeChecked` ESLint rules.
All examples are lint-clean: no `any`, no `eslint-disable`, no `ts-ignore`.

## 1. Mock Typing (Never `any`)

### Service Mocks

```typescript
// ❌ WRONG — triggers @typescript-eslint/no-unsafe-assignment
let mockUsersService: any;
mockUsersService = { findByEmail: jest.fn() };

// ✅ CORRECT — fully typed mock
const mockUsersService = {
  findByEmail: jest.fn(),
  update: jest.fn(),
};

// Or with jest.Mocked for full type coverage:
const mockUsersService: jest.Mocked<
  Pick<UsersService, 'findByEmail' | 'update'>
> = {
  findByEmail: jest.fn(),
  update: jest.fn(),
};
```

### Repository Mocks

```typescript
// ✅ Typed mock factory
function createMockRepository() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}
```

### ArgumentsHost / ExecutionContext

```typescript
// ❌ WRONG
const mockContext = { switchToHttp: () => ({ getRequest: () => ({}) }) } as any;

// ✅ CORRECT — cast through unknown
const mockContext = {
  switchToHttp: jest.fn().mockReturnThis(),
  getRequest: jest.fn().mockReturnValue({}),
  getResponse: jest.fn().mockReturnValue(mockResponse),
} as unknown as ArgumentsHost;
```

## 2. Jest Asymmetric Matchers + Strict TypeScript

`expect.anything()`, `expect.any()`, `expect.objectContaining()`, `expect.arrayContaining()`
all return values typed as `any`. When nested inside `expect.objectContaining({})`,
they trigger `@typescript-eslint/no-unsafe-assignment`.

**Solution**: Cast each nested matcher to `unknown`.

```typescript
// ❌ WRONG — no-unsafe-assignment on expect.anything()
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({
    createdAt: expect.anything(),
    items: expect.arrayContaining([expect.objectContaining({ id: 1 })]),
  }),
);

// ✅ CORRECT — cast nested matchers to unknown
expect(mockFn).toHaveBeenCalledWith(
  expect.objectContaining({
    createdAt: expect.anything() as unknown,
    items: expect.arrayContaining([
      expect.objectContaining({ id: 1 }),
    ]) as unknown,
  }),
);
```

**Rule**: Only nested matchers need casting. Top-level matchers in `toHaveBeenCalledWith()`
or `toEqual()` are fine because the assertion function accepts `unknown`.

## 3. Null Entity Fields

```typescript
// ❌ WRONG
const member = { user: null as any, child: null as any };

// ✅ CORRECT — cast through unknown to target entity type
const member = {
  user: null as unknown as User,
  child: null as unknown as Child,
};
```

## 4. Private Method Testing (When Required for Coverage)

When a private method has complex logic requiring direct testing:

```typescript
// ❌ WRONG — triggers no-unsafe-member-access, no-unsafe-call
const result = (service as any)['isLimitReached']('photos', 5);

// ✅ CORRECT — typed helper function
type IsLimitReached = (feature: string, count: number) => boolean;
const callIsLimitReached = (
  svc: FeatureLimitService,
  feature: string,
  count: number,
): boolean =>
  (svc as unknown as { isLimitReached: IsLimitReached }).isLimitReached(
    feature,
    count,
  );

// Usage in tests
expect(callIsLimitReached(service, 'photos', 5)).toBe(true);
```

**Prefer public API testing when possible.** Use this pattern only for coverage-critical
private methods with branch logic that cannot be fully reached through public methods.

## 5. DTO Mock Verification (Prevent Shape Mismatches)

**Always verify actual DTO class before writing test mocks.**

```typescript
// ❌ WRONG — guessing DTO shape leads to test/lint fix rounds
const dto = { email: 'test@test.com', termsVersion: '2.0' } as UpdateTermsDto;

// ✅ CORRECT — read actual DTO first, match fields exactly
// If actual DTO has `latestTermsVersion` (not `termsVersion`):
const dto: UpdateTermsDto = { latestTermsVersion: '2.0' };
```

**Workflow**:

1. Open the actual DTO file → confirm field names and nesting
2. Write mock data matching the real shape
3. If DTO has wrappers (e.g., `{ settings: { ... } }`), include them

## 6. ConfigService Mocks

```typescript
// ❌ WRONG
const mockConfig = { get: jest.fn() } as any;

// ✅ CORRECT
const mockConfig = { get: jest.fn() } as unknown as ConfigService;
```

## 7. Unused Variables Prevention

```typescript
// ❌ WRONG — creates variable then never uses it
const configService = module.get<ConfigService>(ConfigService);
// ... configService never referenced

// ✅ CORRECT — only declare if used in assertions or setup
// Option A: Remove the variable entirely
module.get<ConfigService>(ConfigService); // Just verify it resolves

// Option B: Keep only if actually used
const configService = module.get<ConfigService>(ConfigService);
expect(configService).toBeDefined(); // Valid use
```

## 8. Import Style (No `require()`)

```typescript
// ❌ WRONG — triggers @typescript-eslint/no-require-imports
jest.mock('./redis.config', () => require('./redis.config'));

// ✅ CORRECT — use ES module import + jest.spyOn
import * as redisConfig from './redis.config';
jest
  .spyOn(redisConfig, 'getRedisOptions')
  .mockReturnValue({ host: 'localhost' });
```

## 9. Callback Return Types

```typescript
// ❌ WRONG — subscribe complete callback returns `any` from done()
observable$.subscribe({ complete: () => done() });

// ✅ CORRECT — wrap in void block
observable$.subscribe({
  complete: () => {
    done();
  },
});
```

## Quick Reference Cheat Sheet

| Problem                    | Pattern                                       |
| -------------------------- | --------------------------------------------- |
| `let x: any`               | Use typed object literal or `jest.Mocked<T>`  |
| `as any` on value          | `as unknown as TargetType`                    |
| `expect.anything()` nested | `expect.anything() as unknown`                |
| `null as any`              | `null as unknown as EntityType`               |
| `(svc as any)['method']`   | Typed helper with explicit function type      |
| `eslint-disable`           | **NEVER** — fix the underlying type issue     |
| `require()` in tests       | `import * as` + `jest.spyOn()`                |
| `catch (e: any)`           | `catch (e: unknown)` + `(e as Error).message` |
