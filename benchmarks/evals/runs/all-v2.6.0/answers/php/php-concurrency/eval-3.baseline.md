ReactPHP provides an event loop and promise-based non-blocking components. Install the needed packages, start asynchronous work, attach then and catch handlers, and run the loop until the promises settle.

~~~php
$loop = React\EventLoop\Loop::get();
$client = new React\Http\Browser($loop);

$promise = $client->get('https://example.com');
$promise->then(
    static function (Psr\Http\Message\ResponseInterface $response): void {
        echo $response->getStatusCode();
    },
    static function (Throwable $error): void {
        error_log($error->getMessage());
    }
);

$loop->run();
~~~

Use ReactPHP-compatible clients throughout the path; one blocking call can stall every task sharing the loop.

