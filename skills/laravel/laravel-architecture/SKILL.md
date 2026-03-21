---
name: laravel-architecture
description: 'Core architectural standards for scalable Laravel applications. Use when structuring service layers, repositories, or scalable architecture in Laravel. (triggers: app/Http/Controllers/**/*.php, routes/*.php, controller, service, action, request, container)'
---

# Laravel Architecture

## **Priority: P0 (CRITICAL)**

## Structure

```text
app/
├── Http/
│   ├── Controllers/    # Slim (Request/Response only)
│   └── Requests/       # Validation logic
├── Services/           # Business logic (Optional)
└── Actions/            # Single-purpose classes (Preferred)
```

## Implementation Guidelines

### Controller Responsibilities

- **Skinny Controllers**: **Controller delegates to Action or Service classes**; keep controllers focused on mapping requests/responses.
- **Dependency Injection**: Use **constructor DI** to inject services or actions. Laravel resolves these via the **Service Container**.
- **No Logic in Routes**: Always delegate route closures to controllers; don't use raw Closures for logic.

### Business Logic Placement

- **Actions**: Create app/Actions/CreatePost.php (or similar) — one action per use case — with a single `handle()` method. This keeps controllers slim and Create Action class logic focused.
- **Service Classes**: Create app/Services/PaymentService.php for multi-step logic across domains. type-hint interface in controller constructor for clean DI.
- **Binding**: Bind interfaces in **`AppServiceProvider`** using **`$this->app->bind(Interface::class, Implementation::class)`**.
- **Service Isolation**: **No Eloquent queries directly in controllers**; handle database access within services or actions.

### Validation & Requests

- **Form Requests**: Use `php artisan make:request StoreUserRequest` for Form Requests for validation.
- **Usage**: call $request->validated() in the controller or action for mass assignment.
- **Validation Methods**: Implement **`authorize()`** and **`rules()`**; never use `$request->validate()` inline.

## Anti-Patterns

- **No logic in Controllers**: Move to Services or Action classes.
- **No manual instantiation**: Use Service Container via DI.
- **No inline `$request->validate()`**: Favor Form Request classes.
- **No excessive global helpers**: Use class-based logic instead.

## References

- [Slim Controller Patterns](references/implementation.md)
