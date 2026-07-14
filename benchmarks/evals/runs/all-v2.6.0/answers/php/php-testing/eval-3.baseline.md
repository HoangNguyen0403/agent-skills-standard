Prefer dependency injection and mock an interface at an external boundary such as a repository, HTTP client, clock, or message publisher. Configure only behavior needed by the test, assert observable outcomes, and avoid mocking the class under test or private methods.

Use PHPUnit mocks, a hand-written fake, or a stub depending on the need:

~~~php
$repository = $this->createMock(UserRepository::class);
$repository->method('find')->with(42)->willReturn($user);

$service = new UserService($repository);
~~~

Do not overspecify call order or internal implementation details unless that interaction is itself a contract.

