# JavaScript Tooling Reference

Testing patterns and CI/CD configuration.

## References

- [**Testing Patterns**](testing-patterns.md) - Unit and integration testing.
- [**CI/CD**](ci-cd.md) - Continuous integration setup.

## Jest Testing Patterns

```javascript
// user-service.test.js
import { UserService } from './user-service.js';

describe('UserService', () => {
  let service;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
    };
    service = new UserService(mockRepository);
  });

  describe('createUser', () => {
    it('should create a user with valid data', async () => {
      const userData = { name: 'John', email: 'john@example.com' };
      mockRepository.save.mockResolvedValue({ id: '1', ...userData });

      const result = await service.createUser(userData);

      expect(result).toEqual({ id: '1', ...userData });
      expect(mockRepository.save).toHaveBeenCalledWith(userData);
    });

    it('should throw error for invalid data', async () => {
      const invalidData = { name: '' };

      await expect(service.createUser(invalidData))
        .rejects
        .toThrow('Name is required');
    });
  });
});
```

## Integration Testing

```javascript
// api.integration.test.js
import request from 'supertest';
import { app } from '../app.js';

describe('User API', () => {
  it('GET /api/users/:id returns user', async () => {
    const response = await request(app)
      .get('/api/users/1')
      .expect(200);

    expect(response.body).toHaveProperty('id', '1');
    expect(response.body).toHaveProperty('name');
  });

  it('POST /api/users creates user', async () => {
    const newUser = { name: 'Jane', email: 'jane@example.com' };

    const response = await request(app)
      .post('/api/users')
      .send(newUser)
      .expect(201);

    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe(newUser.name);
  });
});
```

## GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run build
```
