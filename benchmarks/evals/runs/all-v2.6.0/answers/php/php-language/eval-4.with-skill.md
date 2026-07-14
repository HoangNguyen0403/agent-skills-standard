Use constructor property promotion to combine declaration, visibility, and assignment:

~~~php
final class UserService
{
    public function __construct(
        private readonly UserRepository $repository,
        private readonly LoggerInterface $logger,
    ) {
    }
}
~~~

Keep promoted properties typed and readonly when they represent immutable dependencies.

