Common Laravel architecture anti-patterns include:

- Fat controllers containing validation, business rules, Eloquent queries, and serialization.
- Inline `$request->validate()` everywhere instead of reusable Form Requests.
- Passing `$request->all()` into `Model::create()`.
- Manually constructing services instead of letting the container inject them.
- Depending directly on concrete repositories when an interface is the boundary.
- One God Service that owns unrelated use cases.
- Business logic hidden in global helpers or model callbacks without a clear use-case owner.

Prefer a Form Request → single-responsibility Action → repository interface → Eloquent flow. Bind implementations in `AppServiceProvider`, use `$request->validated()`, and keep controllers responsible for HTTP orchestration only. This makes boundaries visible and keeps tests focused.

