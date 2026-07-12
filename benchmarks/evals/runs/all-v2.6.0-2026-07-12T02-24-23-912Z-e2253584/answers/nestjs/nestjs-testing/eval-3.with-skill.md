Override the guard in the E2E testing module with a typed pass-through implementation:

```ts
const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
})
  .overrideGuard(AuthGuard)
  .useValue({ canActivate: () => true })
  .compile();
```

If the application uses a global `APP_GUARD`, override that concrete guard/provider (or configure the test module with the same token) rather than assuming a route-level override is enough. Keep the real database for E2E tests, initialize/close the app in lifecycle hooks, and restore the guard behavior in tests that specifically exercise authorization.

