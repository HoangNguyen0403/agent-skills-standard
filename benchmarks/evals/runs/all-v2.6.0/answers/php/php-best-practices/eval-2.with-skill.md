Apply SRP by keeping each class focused, and apply dependency inversion by depending on interfaces:

~~~php
interface UserRepository
{
    public function findById(int $id): ?User;
}

final class UserService
{
    public function __construct(
        private UserRepository $repository,
    ) {
    }
}
~~~

Use composition and constructor injection for testability; extract unrelated responsibilities instead of growing a large class.

