# PHP Error Handling Reference

## Exception Hierarchy & PSR-3 Logging

```php
declare(strict_types=1);

namespace App\Services;

use App\Exceptions\DatabaseException;
use Throwable;

try {
    $result = $db->query("...");
} catch (DatabaseException $e) {
    // Log contextually using PSR-3
    $logger->error('Database failed: ' . $e->getMessage());
    throw new ServiceUnavailableException('Service is down', 0, $e);
} catch (Throwable $e) {
    // Catch-all for uncaught Errors and Exceptions
    $logger->critical('Unexpected error', ['exception' => $e]);
} finally {
    // Ensure cleanup
    $db->disconnect();
}
```

## Directory Structure

```text
src/
└── Exceptions/
    ├── {Domain}Exception.php
    └── Handler.php
```

## Exception Hierarchy Example

```php
// Domain exception hierarchy
class OrderException extends \RuntimeException {}
class OrderNotFoundException extends OrderException {}
class InsufficientStockException extends OrderException {}

// Usage with multi-catch and finally
try {
    $order = $repository->findOrFail($id);
    $order->fulfill();
} catch (OrderNotFoundException $e) {
    $logger->warning('Order not found', ['id' => $id]);
    throw $e;
} catch (InsufficientStockException | \DomainException $e) {
    $logger->error($e->getMessage(), ['exception' => $e]);
    return new ErrorResponse(422, $e->getMessage());
} finally {
    $connection->close();
}
```
