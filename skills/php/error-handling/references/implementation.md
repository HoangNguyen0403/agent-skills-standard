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
