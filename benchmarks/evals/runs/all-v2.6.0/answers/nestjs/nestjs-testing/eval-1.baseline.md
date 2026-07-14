Create a `TestingModule`, provide the service and mocked dependencies, compile it, then exercise the service and close the module:

```ts
describe('UsersService', () => {
  let service: UsersService;
  const repo = { findOneBy: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: getRepositoryToken(User), useValue: repo }],
    }).compile();
    service = module.get(UsersService);
  });

  it('returns a user', async () => {
    repo.findOneBy.mockResolvedValue({ id: '1' });
    await expect(service.findById('1')).resolves.toEqual({ id: '1' });
  });
});
```

Reset mocks between tests, assert dependency calls and error paths, and avoid testing framework wiring in a unit test. Use a real database only for integration/E2E tests where query behavior matters; keep the unit test deterministic and focused on service behavior.

