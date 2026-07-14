Install PHPStan as a development dependency, define paths and a level in phpstan.neon, then run it in CI and locally.

~~~sh
composer require --dev phpstan/phpstan
vendor/bin/phpstan analyse -c phpstan.neon
~~~

~~~neon
parameters:
    level: 8
    paths:
        - src
        - tests
    tmpDir: var/phpstan
~~~

Start at a level appropriate for the existing codebase, fix real findings rather than broadly ignoring them, and raise the level over time.

