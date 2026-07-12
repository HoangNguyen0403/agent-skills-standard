Fiber::suspend() pauses the currently running fiber and returns a value to the code that called start, resume, or throw. The fiber can later continue when the scheduler calls resume or throw.

~~~php
$fiber = new Fiber(function (): string {
    $input = Fiber::suspend('need input');

    return strtoupper((string) $input);
});

$signal = $fiber->start();       // 'need input'
$result = $fiber->resume('hello'); // 'HELLO'
~~~

It may only be called from a running fiber. Use a scheduler or event loop to decide when to resume it, and handle FiberError or exceptions from the fiber.

