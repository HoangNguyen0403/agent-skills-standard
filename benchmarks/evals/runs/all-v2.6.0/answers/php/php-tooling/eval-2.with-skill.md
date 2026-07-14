Install PHP CS Fixer as a development dependency and configure the PSR-12 rule set:

~~~php
<?php

$config = new PhpCsFixer\Config();
$config->setRules([
    '@PSR12' => true,
]);

return $config;
~~~

Run the fixer in check mode in CI and keep formatting enforcement separate from static analysis.

