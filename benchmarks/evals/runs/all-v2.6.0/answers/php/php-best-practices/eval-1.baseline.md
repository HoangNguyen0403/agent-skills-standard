Follow PSR-12 by using <?php with one statement per line, four-space indentation, braces on their own style-consistent lines, one class per file, and clear spacing around operators. Declare namespaces and imports at the top, use fully typed properties/parameters/returns where practical, and keep lines and methods readable. Run PHP-CS-Fixer or PHP_CodeSniffer with a PSR-12 ruleset to enforce it automatically.

~~~php
<?php

declare(strict_types=1);

namespace App\Service;

final class Greeter
{
    public function greet(string $name): string
    {
        return 'Hello, ' . $name;
    }
}
~~~

