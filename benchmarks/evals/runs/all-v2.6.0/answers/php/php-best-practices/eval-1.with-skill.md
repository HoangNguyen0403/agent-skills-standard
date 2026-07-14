Follow PSR-12 consistently:

~~~php
<?php

declare(strict_types=1);

namespace App\Service;

final class UserService
{
    public function findById(int $id): ?User
    {
        return $this->repository->findById($id);
    }
}
~~~

Use four spaces, same-line opening braces, one class per file, and place imports after the namespace. Use PHP CS Fixer with the PSR-12 preset to enforce the style.

