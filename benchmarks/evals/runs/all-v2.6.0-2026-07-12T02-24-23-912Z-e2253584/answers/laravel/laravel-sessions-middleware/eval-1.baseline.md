Set the session driver to Redis in `.env` and point `config/session.php` at the configured cache connection:

```dotenv
SESSION_DRIVER=redis
SESSION_CONNECTION=default
```

Ensure Redis is configured in `config/database.php`, the PHP Redis extension or Predis is installed, and the application can reach the Redis server. Use a stable encryption key, secure/HTTP-only cookies, an appropriate `same_site` value, and a suitable lifetime. After changing environment values, clear/rebuild cached config. In multi-instance deployments Redis provides shared session state, but size, TTL, eviction, availability, and namespace isolation still need operational monitoring.

