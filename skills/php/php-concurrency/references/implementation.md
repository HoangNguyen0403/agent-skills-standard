# PHP Concurrency Reference

## Fiber-based Multitasking

```php
// Concurrent HTTP fetching simulation
$fiber = new Fiber(function (string $url): void {
    // Non-blocking call suspends current execution
    $data = CustomHttpClient::get($url);
    Fiber::suspend($data);
});

// Control flow
$fiber->start('https://api.example.com');
while ($fiber->isSuspended()) {
    // Perform other tasks...
    $result = $fiber->resume();
}
```

## Directory Structure

```text
src/
└── Async/
    ├── Schedulers/
    └── Clients/
```

## Fiber Example

```php
// Cooperative multitasking with Fibers
$fiber = new Fiber(function (): string {
    $value = Fiber::suspend('paused');
    return "Received: $value";
});

$fiber->start();           // Returns 'paused'
$fiber->resume('hello');   // Fiber continues
echo $fiber->getReturn();  // "Received: hello"
```

## Guzzle Pool Example

```php
// Concurrent HTTP requests with Guzzle Pool
use GuzzleHttp\Pool;
use GuzzleHttp\Psr7\Request;

$requests = fn () => yield from [
    new Request('GET', 'https://api.example.com/users'),
    new Request('GET', 'https://api.example.com/orders'),
];

$pool = new Pool($client, $requests(), [
    'concurrency' => 5,
    'fulfilled' => fn ($response, $index) => $results[$index] = $response,
]);
$pool->promise()->wait();
```
