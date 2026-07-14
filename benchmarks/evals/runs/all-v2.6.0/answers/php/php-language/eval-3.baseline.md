Put declare(strict_types=1); immediately after the opening PHP tag, before other statements (typically after the file docblock). It makes scalar parameter and return type coercion strict for calls originating from that file.

~~~php
<?php

declare(strict_types=1);

function add(int $left, int $right): int
{
    return $left + $right;
}
~~~

It does not validate untyped values automatically and does not change every caller's coercion mode, so enable it consistently across application files.

