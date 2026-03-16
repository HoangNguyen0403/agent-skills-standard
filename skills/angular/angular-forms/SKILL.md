---
name: angular-forms
description: "Standards for Typed Reactive Forms and Validators. Use when implementing typed reactive forms, custom validators, or form control patterns in Angular. (triggers: **/*.ts, **/*.html, FormBuilder, FormGroup, FormControl, Validators)"
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

## References

- [Typed Forms](references/typed-forms.md)


## 🚫 Anti-Patterns

- Do NOT use standard patterns if specific project rules exist.
- Do NOT ignore error handling or edge cases.
