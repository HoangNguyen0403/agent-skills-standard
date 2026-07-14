For a Laravel controller change, follow this sequence:

1. Define the use case and create a Form Request for authorization and rules.
2. Create a focused Action with one `handle()` method.
3. Inject the Action into the controller and pass `$request->validated()`.
4. Put persistence behind an interface when it is a meaningful boundary; bind it in `AppServiceProvider`.
5. Keep the controller thin and return the appropriate resource/view/status.
6. Test validation, authorization, the Action, and the HTTP response separately.

Avoid inline validation, Eloquent queries in the controller, manual `new` calls, and raw request data. This workflow preserves the HTTP → use-case → persistence separation and makes the change easier to evolve.

