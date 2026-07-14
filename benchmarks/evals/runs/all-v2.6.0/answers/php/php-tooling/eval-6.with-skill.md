Define repeatable Composer scripts for analysis, tests, and the combined check:

~~~json
{
    "scripts": {
        "analyze": "phpstan analyse",
        "test": "phpunit",
        "check": [
            "@analyze",
            "@test"
        ]
    }
}
~~~

Run them with composer check and execute the same checks in CI.

