Use union types when a value legitimately accepts multiple alternatives, and intersection types when it must satisfy multiple interfaces:

~~~php
function formatId(int|string $id): string
{
    return (string) $id;
}

function consume(Countable&Traversable $items): int
{
    return count($items);
}
~~~

Prefer a narrower domain type when possible and add return types to every function.

