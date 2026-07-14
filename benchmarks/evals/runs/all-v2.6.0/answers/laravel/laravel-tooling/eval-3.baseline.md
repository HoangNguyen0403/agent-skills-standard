Install Pint as a development dependency and run it against the project:

```bash
composer require laravel/pint --dev
./vendor/bin/pint
./vendor/bin/pint --test
```

Use `pint.json` to configure only project-specific rules; keep formatting deterministic and consistent with the Laravel/PHP version. Run the check in CI and before commits, and format changed files rather than mixing unrelated reformatting into a feature. Pint fixes style, not correctness, security, or static-analysis issues, so pair it with tests and other quality checks.

