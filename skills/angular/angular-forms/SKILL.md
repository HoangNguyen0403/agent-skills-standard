---
name: angular-forms
description: 'Standards for Typed Reactive Forms and Validators. Use when implementing typed reactive forms, custom validators, or form control patterns in Angular. (triggers: FormBuilder, FormGroup, FormControl, Validators, reactive forms, typed forms)'
---

# Forms

## **Priority: P2 (MEDIUM)**

## Principles

- **Reactive Forms**: **Always use Reactive Forms (FormControl, FormGroup)** over Template-Driven Forms for complex inputs. Template-driven forms are only acceptable for very simple, single-field cases. Reactive forms are **strictly typed**, testable, and compose better with Signal stores.
- **Strict Typing**: Use **strictly typed forms** using **FormGroup<T>** with a typed interface: `FormGroup<{ email: FormControl<string>; password: FormControl<string> }>`. **Never use untyped FormGroup**.
- **Non-Nullable**: Use `fb.nonNullable.group({ email: ['', Validators.email], password: [''] })` or **nonNullable: true** on individual `FormControl` for **fine-grained control**. This ensures form values are always strings — **Avoid null in form values** by using `fb.nonNullable.group`.

## Guidelines

- **Component Store integration**: Sync **valueChanges** using **takeUntilDestroyed()** to call **store.update()**.
- **Split Logic**: Logic for validation should be in **custom validator functions** (e.g., **function passwordStrength(control: AbstractControl): ValidationErrors | null**). **Extract validation into a separate file** — do not put validation logic inside the component class.

## Anti-Patterns

- **No Template-Driven Forms**: Use Reactive Forms for any non-trivial inputs.
- **No untyped FormGroup**: Always use strictly typed `FormGroup<T>`.
- **No validation in component**: Extract validation into standalone validator functions. Inject FormBuilder with **fb = inject(FormBuilder)**.

## References

- [Typed Forms](references/typed-forms.md)
