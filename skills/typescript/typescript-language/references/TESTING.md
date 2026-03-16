# TypeScript Testing Patterns

## Testing Patterns

- **Mock Types**: Use `jest.Mocked<T>` or `as unknown as T`. Never use `any`.
- **Enum Usage**: Always use enum values (`Status.UPCOMING`) instead of string literals.
- **DTO Validation**: Ensure test data includes all required fields to match DTO validation.
- **Repository Mocks**: Mock all repository methods used by services (`findOne`, `create`, `save`, `findAndCount`).

## Common Test Issues & Solutions

### Service Method Mismatches

**Problem**: Tests call methods that don't exist on services (e.g., `findByEmailWithPassword` not mocked).
**Solution**: Always check service implementation for actual method names before writing tests. Mock all methods that the service actually calls.

### Error Message Mismatches

**Problem**: Tests expect error messages that don't match the actual messages thrown by services.
**Solution**: Use the exact error messages from `ErrorMessages` constants instead of hardcoded strings.

### Type Safety Violations

**Problem**: Mock objects don't satisfy interface requirements (missing required properties).
**Solution**: Provide complete mock objects with all required properties, or use `as unknown as Type` casting for complex mocks.

### CurrentUser Interface Issues

**Problem**: Mock user objects missing required `CurrentUser` properties (`id`, `email`, `subscriptionTier`).
**Solution**: Always include all required `CurrentUser` properties in test mocks. Import `SubscriptionTier` enum for proper typing.

### Auth Guard Mocking

**Problem**: Using `Partial<UsersService>` doesn't satisfy constructor requirements.
**Solution**: Provide complete service mocks with required properties or cast to `unknown` first.

### Controller Parameter Issues

**Problem**: Tests pass wrong parameter types to controller methods (e.g., passing request objects instead of `CurrentUser`).
**Solution**: Check controller method signatures and decorator usage (`@CurrentUserDecorator()`) to pass correct parameter types.
