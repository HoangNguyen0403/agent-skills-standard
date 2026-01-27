# TDD & Feedback Reference

Example of the Red-Green-Refactor cycle and code review feedback.

## 🔴 Step 1: Red (Test First)

```typescript
test('should calculate discount correctly', () => {
  const calculator = new DiscountCalculator();
  expect(calculator.calculate(100)).toBe(90); // Fails: Calculator not implemented
});
```

## 🟢 Step 2: Green (Implement)

```typescript
class DiscountCalculator {
  calculate(price: number) {
    return price * 0.9; // Pass
  }
}
```

## 🔵 Step 3: Refactor (Optimize)

```typescript
class DiscountCalculator {
  private static readonly DEFAULT_DISCOUNT = 0.9;

  calculate(price: number): number {
    return price * DiscountCalculator.DEFAULT_DISCOUNT;
  }
}
```

## 🤝 Code Review Examples

- **BAD (Destructive)**: "This code is slow and messy. Change it."
- **GOOD (Constructive)**: "The nested loop here might lead to $O(n^2)$ complexity. Can we use a Map for $O(1)$ lookups instead?"
