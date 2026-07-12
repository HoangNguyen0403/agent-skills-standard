Usually, no. A global `var config AppConfig` works for small apps, but it makes code harder to test, hides dependencies, and can create initialization and concurrency problems.

Prefer to load config once at startup and pass it explicitly to the components that need it, or attach it to an `App`/service struct. That keeps dependencies clear and makes testing much easier.

If you do keep it global, treat it as immutable after startup and initialize it in one place only.

