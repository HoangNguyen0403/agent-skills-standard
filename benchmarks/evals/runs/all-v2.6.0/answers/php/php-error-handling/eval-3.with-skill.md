Register a top-level handler that accepts Throwable, logs structured context, and performs final cleanup:

~~~php
set_exception_handler(static function (Throwable $error) use ($logger): void {
    $logger->critical('Unhandled exception', ['exception' => $error]);
    http_response_code(500);
    echo 'Internal Server Error';
});
~~~

Pair it with a deliberate set_error_handler strategy where needed, keep display_errors off and log_errors on in production, and do not expose stack traces.

