Use an asynchronous HTTP client that supports multiple in-flight requests, collect the returned promises or futures, and await or settle them together. Add per-request timeouts, bounded concurrency, error handling, and cancellation where supported.

~~~php
$promises = [];

foreach ($urls as $url) {
    $promises[$url] = $httpClient->requestAsync('GET', $url);
}

$responses = Utils::settle($promises)->wait();
~~~

The exact API depends on the client, such as Guzzle promises or ReactPHP promises. Do not use a synchronous request in the loop and call it asynchronous; that serializes the work.

