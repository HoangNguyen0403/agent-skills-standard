Return early for invalid or exceptional cases so the happy path stays flat:

~~~php
public function process(?User $user): Result
{
    if ($user === null) {
        return Result::failure('User not found');
    }

    if (!$user->isActive()) {
        return Result::failure('User is inactive');
    }

    return $this->processor->process($user);
}
~~~

Avoid an else after a return and keep nesting shallow.

