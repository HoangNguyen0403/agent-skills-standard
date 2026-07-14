PHP Fibers provide cooperative concurrency, not parallel threads. A Fiber runs until it returns or calls Fiber::suspend(), allowing a scheduler or event loop to resume other work. Use an async library that schedules fibers rather than creating a fiber per blocking operation without coordination.

~~~php
$fiber = new Fiber(function (): string {
    Fiber::suspend('waiting');
    return 'done';
});

$value = $fiber->start();
$result = $fiber->resume();
~~~

All operations inside a fiber must yield through non-blocking APIs; a blocking database call or sleep still blocks the PHP process.

