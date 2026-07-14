Use reactive forms for most Angular applications.

- Reactive forms (`FormControl`, `FormGroup`, `FormBuilder`) are explicit, scalable, testable, and better for dynamic or complex validation.
- Template-driven forms (`FormsModule`, `[(ngModel)]`) are simpler and suitable for small, mostly static forms with minimal validation.

Rule of thumb: choose template-driven for simple forms; choose reactive forms for anything expected to grow or require dynamic validation. Avoid mixing both approaches within the same form.
