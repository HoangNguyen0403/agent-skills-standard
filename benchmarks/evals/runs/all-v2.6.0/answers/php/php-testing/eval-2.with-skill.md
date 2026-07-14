Pest provides concise functional syntax while retaining PHPUnit underneath:

~~~php
it('finds a user by id', function (): void {
    $repository = Mockery::mock(UserRepository::class);
    $repository->expects('findById')->with('u-1')->andReturn(new User('u-1'));

    expect((new UserService($repository))->find('u-1')->id)
        ->toBe('u-1');
});
~~~

Organize tests by Unit, Integration, or Feature, keep them deterministic, and follow red-green-refactor.

