In PHP 8.1, Fiber::suspend() yields control to the caller and the value passed to resume() becomes the return value of the suspend call:

~~~php
$fiber = new Fiber(function (): string {
    $input = Fiber::suspend('paused');
    return 'received ' . $input;
});

$fiber->start();
$fiber->resume('hello');
$output = $fiber->getReturn();
~~~

Resume only a started, suspended Fiber and handle exceptions at the boundary.

