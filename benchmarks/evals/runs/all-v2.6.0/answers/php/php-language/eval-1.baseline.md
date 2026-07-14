Use match when each input maps to an expression result. It uses strict comparison, does not fall through, and must be exhaustive unless a default arm is provided.

~~~php
$label = match ($status) {
    200 => 'ok',
    404 => 'not found',
    500, 503 => 'server error',
    default => 'unknown',
};
~~~

Unlike switch, match returns a value and does not use loose comparisons.

