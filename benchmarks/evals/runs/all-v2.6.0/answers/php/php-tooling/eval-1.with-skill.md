Install PHPStan as a development dependency and configure a checked source path:

~~~json
{
    "require-dev": {
        "phpstan/phpstan": "^1.0"
    }
}
~~~

Create phpstan.neon with parameters for src and level 6, and run vendor/bin/phpstan analyse in CI. Keep the dependency locked and review lockfile changes.

