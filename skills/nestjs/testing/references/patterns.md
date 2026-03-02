# NestJS Testing Patterns Reference

Detailed examples and advanced patterns for NestJS testing.

## Unit Testing Patterns

### AAA Pattern Example

```typescript
describe('UserService', () => {
  it('should create user', async () => {
    // Arrange
    const dto = { email: 'test@test.com', password: 'Pass123!' };
    mockRepo.findByEmail.mockResolvedValue(null);
    mockRepo.save.mockResolvedValue({ id: 1, ...dto });

    // Act
    const result = await service.createUser(dto);

    // Assert
    expect(result.email).toBe(dto.email);
    expect(mockRepo.save).toHaveBeenCalled();
  });
});
```

### Mock Repository Factory

```typescript
function createMockRepository<T>() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    create: jest.fn((dto) => dto),
  };
}
```

### Testing Services

```typescript
describe('AuthService', () => {
  let service: AuthService;
  const mockUsersService = { findByEmail: jest.fn(), update: jest.fn() };
  const mockJwtService = { sign: jest.fn(), verify: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should validate user', async () => {
    const user = { id: 1, email: 'test@test.com', password: 'hashed' };
    mockUsersService.findByEmail.mockResolvedValue(user);
    jest.spyOn(bcrypt, 'compareSync').mockReturnValue(true);

    const result = await service.validateUser('test@test.com', 'pass');

    expect(result).toEqual({ userId: 1, email: 'test@test.com' });
  });
});
```

### Testing Guards

```typescript
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  const mockReflector = { getAllAndOverride: jest.fn() };

  beforeEach(() => {
    guard = new JwtAuthGuard(mockReflector as unknown as Reflector);
  });

  it('should allow public routes', () => {
    mockReflector.getAllAndOverride.mockReturnValue(true);
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });
});

function createMockContext() {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { id: 1 } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}
```

### Test Data Builders

```typescript
class UserBuilder {
  private user = {
    email: 'test@test.com',
    password: 'hashed',
    role: 'USER',
  };

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withRole(role: string): this {
    this.user.role = role;
    return this;
  }

  build() {
    return this.user;
  }
}

// Usage
const admin = new UserBuilder().withRole('ADMIN').build();
```

## E2E Testing Patterns

### Complete User Flow

```typescript
describe('Auth Flow (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should register', () => {
    return request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'test@test.com', password: 'Pass123!' })
      .expect(201)
      .expect((res) => {
        accessToken = res.body.access_token;
      });
  });

  it('should access protected route', () => {
    return request(app.getHttpServer())
      .get('/users/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
```

### Database Cleanup Strategies

#### Option 1: Transaction Rollback (Fast)

```typescript
let queryRunner: QueryRunner;

beforeEach(async () => {
  queryRunner = dataSource.createQueryRunner();
  await queryRunner.startTransaction();
});

afterEach(async () => {
  await queryRunner.rollbackTransaction();
  await queryRunner.release();
});
```

#### Option 2: Explicit Truncate

```typescript
afterEach(async () => {
  await dataSource.query('TRUNCATE TABLE "orders" CASCADE');
  await dataSource.query('TRUNCATE TABLE "users" CASCADE');
});
```

### Override Providers

```typescript
// Bypass authentication
beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

  app = module.createNestApplication();
  await app.init();
});
```

## Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.module.ts',
    '!src/**/main.ts',
    '!src/**/*.dto.ts',
  ],
};
```

## Mock vs Spy

**Use `jest.fn()` when:**

- Creating mock from scratch
- Complete control over behavior

**Use `jest.spyOn()` when:**

- Spying on existing method
- Need original implementation sometimes

```typescript
// Mock
const mockService = { send: jest.fn().mockResolvedValue(true) };

// Spy
jest.spyOn(emailService, 'send').mockResolvedValue(true);
```

## Test Organization

```typescript
describe('UserService', () => {
  // Happy paths
  describe('Happy Path', () => {
    it('should create user', () => {});
  });

  // Error cases
  describe('Error Cases', () => {
    it('should throw on duplicate email', () => {});
  });

  // Edge cases
  describe('Edge Cases', () => {
    it('should handle concurrent requests', () => {});
  });
});
```

## Best Practices

1. **Coverage Target**: 80-90% (100% often impractical)
2. **Test Naming**: Describe behavior, not implementation
3. **Cleanup**: Always use `afterEach` to clear mocks
4. **Isolation**: Each test should run independently
5. **Fast Unit Tests**: Run in parallel with `--maxWorkers=4`
6. **Real E2E**: Use actual DB (Docker/in-memory SQLite)

## Common Mistakes

| Mistake                 | Fix                                  |
| ----------------------- | ------------------------------------ |
| Testing private methods | Test through public API              |
| Mocking DB in E2E       | Use real test database               |
| Shared test state       | Clear mocks in afterEach             |
| No resource cleanup     | Close app/DB in afterAll             |
| Over-mocking            | Balance mocks with integration tests |
