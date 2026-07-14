Add Composer scripts so common checks have stable, repeatable commands. Keep the script names simple and point them at binaries installed in vendor/bin.

~~~json
{
  "scripts": {
    "analyze": "phpstan analyse",
    "test": "phpunit",
    "test:coverage": "phpunit --coverage-text",
    "cs:check": "php-cs-fixer fix --dry-run --diff"
  }
}
~~~

Run composer test and composer analyze in CI, pin tool versions in composer.lock where appropriate, and pass additional arguments through Composer when the command supports them.

