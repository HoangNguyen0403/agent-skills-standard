Declare PSR-4 mappings in composer.json:

~~~json
{
    "autoload": {
        "psr-4": {
            "App\\": "src/"
        }
    }
}
~~~

Match namespaces and class paths, then run composer dump-autoload. Use Composer's generated autoloader instead of manual require statements.

