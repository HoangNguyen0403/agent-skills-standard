Use Guzzle's Pool or ReactPHP's HTTP client rather than sequential blocking calls:

~~~php
$pool = new Pool($client, $requests, [
    'concurrency' => 10,
    'fulfilled' => static fn (ResponseInterface $response): void => $collect($response),
    'rejected' => static fn (Throwable $error): void => $logger->error('HTTP failed', ['exception' => $error]),
]);

$pool->promise()->wait();
~~~

Bound concurrency, collect failures, and use an async-compatible client.

