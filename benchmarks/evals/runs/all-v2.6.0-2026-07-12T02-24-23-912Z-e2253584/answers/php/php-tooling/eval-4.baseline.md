Map each namespace prefix to the directory containing its classes and ensure the namespace path and class filename match. Composer generates the autoloader from the PSR-4 mapping.

~~~json
{
  "autoload": {
    "psr-4": {
      "App\\\\": "src/"
    }
  }
}
~~~

For tests, use a separate dev mapping when needed:

~~~sh
composer dump-autoload
~~~

Classes under src/Domain/User.php should declare namespace App\\Domain and class User. Keep one class per file and do not rely on case-insensitive filesystem behavior.

