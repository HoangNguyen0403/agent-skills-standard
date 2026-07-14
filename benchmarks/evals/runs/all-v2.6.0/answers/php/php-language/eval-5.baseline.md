Union types accept more than one declared type, while intersection types require a value to satisfy every listed class or interface type. Union types use |; intersection types use & and apply to class or interface types.

~~~php
function formatId(int|string $id): string
{
    return (string) $id;
}

function render(Renderable&Cacheable $value): string
{
    return $value->render();
}
~~~

Avoid overly broad unions such as mixed when a narrower domain type or value object communicates the contract better.

