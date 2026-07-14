Declare a property readonly when it should be initialized once and then never reassigned. A readonly property must be typed and is normally initialized in the constructor.

~~~php
final class User
{
    public function __construct(
        public readonly int $id,
        public readonly string $email,
    ) {
    }
}
~~~

This prevents reassignment after initialization; it does not make an object stored in the property deeply immutable.

