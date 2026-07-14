Declare immutable constructor state with a PHP 8.1 readonly property:

~~~php
final class User
{
    public function __construct(
        public readonly string $id,
    ) {
    }
}
~~~

A readonly property can be initialized once, so use it for values that must not change after construction.

