Keep Xdebug for local development only. Remove xdebug.so from the production PHP configuration or set XDEBUG_MODE=off in production, then verify the deployed container has no active debugging extension. This avoids debugger overhead and reduces production exposure.

