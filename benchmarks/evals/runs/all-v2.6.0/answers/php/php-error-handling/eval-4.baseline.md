Both Exception and Error implement Throwable, so catch Throwable when a boundary must handle either category. Prefer catching specific exceptions inside normal application logic; catching Errors can hide programming defects if used as routine recovery.

~~~php
try {
    $result = $service->run();
} catch (Throwable $throwable) {
    $logger->error('Unhandled operation failure', [
        'exception' => $throwable,
    ]);
    throw $throwable;
}
~~~

At a process boundary, report the failure and terminate or return a generic response as appropriate.

