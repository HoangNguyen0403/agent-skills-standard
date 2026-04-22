---
name: angular-forms
description: Build typed reactive forms with strict FormGroup typing, custom validators, and nonNullable controls in Angular. Use when implementing typed reactive forms, custom validators, or form control patterns.
metadata:
  triggers:
    keywords:
    - FormBuilder
    - FormGroup
    - FormControl
    - Validators
    - reactive forms
    - typed forms
---
# Forms

## **Priority: P2 (MEDIUM)**

## 1. Use Strictly Typed Reactive Forms

- Always use Reactive Forms over Template-Driven for complex inputs.
- Define typed `FormGroup<T>` with explicit control types — never use untyped FormGroup.

See [typed forms](references/typed-forms.md) for typed FormGroup examples.

## 2. Extract Validation Logic

- Create standalone validator functions in separate file.
- Sync `valueChanges` to stores using `takeUntilDestroyed()`.

See [typed forms](references/typed-forms.md) for standalone validator examples.

## 3. Ensure NonNullable Controls

- Use `fb.nonNullable.group(...)` or `nonNullable: true` on individual controls.
- This ensures form values always strings — avoids null in form values.

## Anti-Patterns

- **No Template-Driven Forms**: Use Reactive Forms for any non-trivial inputs.
- **No untyped FormGroup**: Always use strictly typed `FormGroup<T>`.
- **No validation in component**: Extract into standalone validator functions.

## References

- [Typed Forms](references/typed-forms.md)