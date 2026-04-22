# AAA Methodology (Arrange-Act-Assert)

## **1. Arrange (The Setup)**

Prepare all prerequisites before the action.

- **Rule**: Minimize shared state. Use `beforeEach` only for common environment hooks, not data setup.
- **Pattern**: `let { result, error } = { result: null, error: null };`

## **2. Act (The Action)**

Execute the SINGLE behavior under test.

- **Rule**: Avoid multiple actions. If you're testing a "get-after-set" flow, that's an Integration test, not a Unit test.
- **Pattern**: `result = service.execute(input);`

## **3. Assert (The Feedback)**

Verify expectations.

- **Rule**: Check for both Success (Return Value) and Side Effects (Mock calls).
- **Pattern**:
  - `expect(result).toBe(expected);`
  - `expect(mockService.call).toHaveBeenCalledWith(args);`

## **Code Example (TypeScript)**

```typescript
it('should return 401 when token is invalid', async () => {
  // 1. Arrange
  const service = new AuthService();
  const invalidInput = 'not-a-real-jwt';
  const mockRepo = { findById: vi.fn() };

  // 2. Act
  const result = await service.validate(invalidInput);

  // 3. Assert
  expect(result.status).toBe(401);
  expect(mockRepo.findById).not.toHaveBeenCalled();
});
```
