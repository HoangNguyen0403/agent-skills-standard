Mock external boundaries, not private methods or simple data objects:

~~~php
$repository = $this->createMock(UserRepository::class);
$repository->expects($this->once())
    ->method('findById')
    ->with(42)
    ->willReturn($user);

$service = new UserService($repository);
~~~

Assert public behavior, avoid over-mocking internals, and use an in-memory database or transaction for database integration tests.

