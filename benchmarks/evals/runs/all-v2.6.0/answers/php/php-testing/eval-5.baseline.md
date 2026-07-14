Prefer assertSame when both value and type must match; it uses strict comparison. Use assertEquals when semantically equal values may have different types and that distinction is not part of the contract. For most application tests, assertSame catches accidental coercion and is the safer default.

~~~php
self::assertSame(1, $actual);       // rejects '1'
self::assertEquals(1, $actual);      // permits equivalent values
~~~

Choose the assertion that expresses the behavior being specified rather than changing production code to satisfy a weaker assertion.

