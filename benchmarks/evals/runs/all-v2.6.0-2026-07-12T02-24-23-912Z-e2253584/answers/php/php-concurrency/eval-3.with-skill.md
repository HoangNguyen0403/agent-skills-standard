Use ReactPHP's event loop and promise-based APIs for async work:

~~~php
$loop = Loop::get();

$promise = $client->request('https://example.com');
$promise->then(
    static fn (ResponseInterface $response): void => $handle($response),
    static fn (Throwable $error): void => $logger->error('Request failed', ['exception' => $error]),
);

Loop::run();
~~~

Use non-blocking libraries, handle rejection, and avoid custom schedulers or blocking calls.

