Prefer assertSame for exact value and type comparison; use assertEquals only when type coercion is intentionally part of the contract:

~~~php
self::assertSame(3, $result);
self::assertSame('3', $formatted);
~~~

Also choose focused assertions such as assertCount or assertMatchesRegularExpression where they express behavior clearly.

