Build a unit test module with the service under test and typed mocks for every dependency. Follow Arrange–Act–Assert and clear mocks after each test.

```ts
const repo = { findById: jest.fn() } satisfies Pick<UserRepository, 'findById'>;
const module = await Test.createTestingModule({
  providers: [UsersService, { provide: UserRepository, useValue: repo }],
}).compile();
const service = module.get(UsersService);

afterEach(() => jest.clearAllMocks());

it('returns a user', async () => {
  repo.findById.mockResolvedValue(user);
  await expect(service.findById(user.id)).resolves.toEqual(user);
  expect(repo.findById).toHaveBeenCalledWith(user.id);
});
```

Use public methods, avoid `any` and private-method tests, and declare only variables used by setup or assertions.

