---
name: angular-forms
description: "Standards for Typed Reactive Forms and Validators. Use when implementing typed reactive forms, custom validators, or form control patterns in Angular. (triggers: FormBuilder, FormGroup, FormControl, Validators, reactive forms, typed forms)"
---

# Forms

## **Priority: P2 (MEDIUM)**

## Principles

- **Reactive Forms**: Always use Reactive Forms (`FormControl`, `FormGroup`) over Template-Driven Forms for complex inputs.
- **Strict Typing**: Use strictly typed forms `FormGroup<LoginForm>`.
- **Non-Nullable**: Use `nonNullable: true` option to avoid `null` checks on form values.

## Guidelines

- **Component Store integration**: Sync form value changes to Signal Store/Service if needed.
- **Split Logic**: Logic for validation should be in custom validator functions, not inside the component.

## Anti-Patterns

- **No Template-Driven Forms**: Use Reactive Forms for any non-trivial inputs.
- **No untyped FormGroup**: Always use strictly typed `FormGroup<T>`.
- **No validation in component**: Extract validation into standalone validator functions.

## References

- [Typed Forms](references/typed-forms.md)
