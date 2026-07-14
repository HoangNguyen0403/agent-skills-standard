Use finally for cleanup that must occur whether the operation succeeds, throws, or returns. Close handles, release locks, and restore temporary state there; a return from finally can suppress the original return value or exception, so avoid returning from it.

~~~php
$handle = fopen($path, 'rb');

try {
    return fread($handle, 1024);
} finally {
    fclose($handle);
}
~~~

For modern resource objects, prefer their lifecycle-aware APIs when available, but still use finally for explicit cleanup that is not automatic.

