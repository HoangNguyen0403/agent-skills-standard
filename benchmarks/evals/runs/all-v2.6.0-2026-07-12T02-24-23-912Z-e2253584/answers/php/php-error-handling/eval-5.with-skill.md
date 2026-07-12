Depend on Psr\Log\LoggerInterface and log exceptions with structured context:

~~~php
try {
    $service->run($id);
} catch (Throwable $error) {
    $logger->error('Service operation failed', [
        'operation' => 'run',
        'entity_id' => $id,
        'exception' => $error,
    ]);
    throw $error;
}
~~~

Use the appropriate PSR-3 level and exclude passwords, tokens, and other sensitive values from context.

