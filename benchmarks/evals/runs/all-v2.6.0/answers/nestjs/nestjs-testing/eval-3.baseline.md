For a focused E2E test, override the guard provider in the testing module before `compile`:

```ts
const module = await Test.createTestingModule({ imports: [AppModule] })
  .overrideGuard(AuthGuard('jwt'))
  .useValue({ canActivate: () => true })
  .compile();
```

If the guard is a custom class, pass that class to `overrideGuard`. For globally registered guards, override the `APP_GUARD` provider or configure the test module’s global provider as appropriate. Set a test user/principal explicitly if controllers depend on `request.user`; bypassing authentication does not test authorization, so keep separate E2E cases with real auth/guards for security behavior. Close the app/module and isolate test data.

