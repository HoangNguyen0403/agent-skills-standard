Install PHP-CS-Fixer, configure a PSR-12 rule set and the project paths, then run it in check mode in CI and fix mode locally.

~~~sh
composer require --dev friendsofphp/php-cs-fixer
vendor/bin/php-cs-fixer fix --dry-run --diff
~~~

~~~php
<?php

$finder = PhpCsFixer\Finder::create()
    ->in([__DIR__ . '/src', __DIR__ . '/tests']);

return (new PhpCsFixer\Config())
    ->setRules(['@PSR12' => true])
    ->setFinder($finder);
~~~

Pin the tool version in Composer and review formatting changes rather than mixing unrelated behavior changes into the same commit.

