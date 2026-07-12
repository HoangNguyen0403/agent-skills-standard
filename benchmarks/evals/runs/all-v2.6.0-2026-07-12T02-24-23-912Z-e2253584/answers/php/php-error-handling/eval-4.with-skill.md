Catch Throwable when a boundary must handle both PHP Error instances and Exception instances:

~~~php
try {
    $result = $handler->run();
} catch (Throwable $error) {
    $logger->error('Operation failed', ['exception' => $error]);
    throw $error;
}
~~~

Use narrower exception catches when possible, never suppress the failure silently, and reserve recovery for errors the application can safely handle.

