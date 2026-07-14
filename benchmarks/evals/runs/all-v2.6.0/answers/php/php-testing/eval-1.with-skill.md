Write a focused PHPUnit test through the public service API and mock only an external dependency:

~~~php
final class UserServiceTest extends TestCase
{
    public function testFindsUserById(): void
    {
        $repository = $this->createMock(UserRepository::class);
        $user = new User('u-1');

        $repository->expects($this->once())
            ->method('findById')
            ->with('u-1')
            ->willReturn($user);

        self::assertSame($user, (new UserService($repository))->find('u-1'));
    }
}
~~~

Keep the test independent and repeatable, and use assertSame when type identity matters.

