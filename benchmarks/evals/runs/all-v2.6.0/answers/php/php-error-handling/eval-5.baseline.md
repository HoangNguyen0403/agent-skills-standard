Inject a PSR-3 LoggerInterface and log exceptions with the exception object under the reserved exception context key. Include stable identifiers and operation context, but never passwords, tokens, or other sensitive payloads.

~~~php
try {
    $payment->charge($orderId);
} catch (Throwable $exception) {
    $logger->error('Payment charge failed', [
        'exception' => $exception,
        'order_id' => $orderId,
    ]);

    throw $exception;
}
~~~

Configure handlers, log levels, and redaction centrally; avoid logging the same exception repeatedly at every layer.

