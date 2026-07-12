Put declare(strict_types=1) immediately after the opening PHP tag, before namespaces or other statements:

~~~php
<?php

declare(strict_types=1);

function add(int $left, int $right): int
{
    return $left + $right;
}
~~~

Add parameter and return types throughout and use strict === comparisons instead of loose ==.

