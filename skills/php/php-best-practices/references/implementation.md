# PHP Best Practices Reference

## PSR-12 and Clean Code Implementation

```php
declare(strict_types=1);

namespace App\Services;

use App\Interfaces\LoggerInterface;

class NotificationService
{
    private const NOTIFICATION_LIMIT = 5;

    public function __construct(
        private LoggerInterface $logger,
    ) {}

    public function sendBatch(array $users): void
    {
        // Guard clause for early return
        if (count($users) === 0) {
            return;
        }

        if (count($users) > self::NOTIFICATION_LIMIT) {
            $this->logger->warn('Batch size exceeded');
        }

        // ... implementation
    }
}
```
