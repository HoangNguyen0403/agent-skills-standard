Register set_exception_handler with a callable for uncaught exceptions at the application entry point. The handler should log/report the exception, return a safe response or render a generic error, and avoid exposing stack traces or secrets to users.

~~~php
set_exception_handler(static function (Throwable $exception): void {
    error_log((string) $exception);

    http_response_code(500);
    echo 'Internal Server Error';
});
~~~

The handler is for uncaught exceptions and does not replace local handling where recovery is possible. Ensure the handler itself cannot fail silently.

