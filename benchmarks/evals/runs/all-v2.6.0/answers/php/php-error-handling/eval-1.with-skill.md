Catch specific exceptions when recovery is possible and use Throwable at an application boundary:

~~~php
try {
    $user = $service->load($id);
} catch (NotFoundException $e) {
    return Response::notFound();
} catch (Throwable $e) {
    $logger->error('User load failed', ['exception' => $e]);
    throw $e;
}
~~~

Prefer throwing domain exceptions over returning false or null for errors, never leave a catch block empty, and use finally for cleanup.

