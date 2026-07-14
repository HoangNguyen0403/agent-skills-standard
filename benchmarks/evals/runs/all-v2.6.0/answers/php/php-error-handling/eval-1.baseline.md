Wrap the smallest operation that may throw in try/catch, catch the most specific exception type you can handle, and either recover, translate, or rethrow with context. Do not catch Throwable indiscriminately unless this is a deliberate process-boundary handler.

~~~php
try {
    $user = $repository->find($id);
} catch (UserNotFound $exception) {
    return null;
} catch (RepositoryException $exception) {
    throw new RuntimeException('Unable to load user', 0, $exception);
}
~~~

Log or report failures at an appropriate boundary and preserve the original exception as the previous exception.

