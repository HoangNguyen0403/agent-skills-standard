Use PHP 8.1 Fibers for cooperative concurrency, and let an event loop or scheduler decide when to resume them:

~~~php
$fiber = new Fiber(function (): string {
    Fiber::suspend('waiting');
    return 'done';
});

$fiber->start();
$fiber->resume();

$result = $fiber->getReturn();
~~~

Catch failures around the Fiber boundary, keep state isolated, and use a separate PDO connection per Fiber when database work is involved.

