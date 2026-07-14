Install Pint as a development dependency and run it against the project:

```bash
composer require laravel/pint --dev
./vendor/bin/pint
```

If the project uses `pint.json`, keep its preset and exclusions under version control; the Laravel preset should be the baseline. Run Pint in CI and before merging so formatting drift is caught consistently. Treat Pint as an automated style check/formatter, not as a substitute for tests or architectural review.

