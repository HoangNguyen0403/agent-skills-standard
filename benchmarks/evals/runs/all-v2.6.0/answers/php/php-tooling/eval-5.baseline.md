Disable Xdebug in production because its debugging and coverage instrumentation adds overhead and may expose debugging capabilities. Build the production image without the Xdebug extension, or use an explicit environment-controlled configuration that cannot be enabled accidentally.

Verify the deployed module list and configuration rather than assuming a package was disabled:

~~~sh
php -m | grep -i xdebug
php -i | grep -i xdebug.mode
~~~

Use a separate development/test image for debugging and coverage. Never expose a remote debugger to an untrusted network.

