# References

Move large code blocks here.

## Inline Examples

```typescript
// Controller-level caching with custom key and TTL
@UseInterceptors(CacheInterceptor)
@CacheKey('users_list')
@CacheTTL(300) // 5 minutes
@Get()
findAll() { return this.usersService.findAll(); }
```

```typescript
// TTL with jitter — prevents stampede on grouped caches
const baseTTL = 300;
const jitter = Math.floor(Math.random() * 20) - 10; // ±10s
await this.cacheManager.set(key, value, baseTTL + jitter);
```
