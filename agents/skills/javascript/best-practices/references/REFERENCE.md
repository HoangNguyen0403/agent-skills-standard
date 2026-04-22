# JavaScript Best Practices Reference

Module patterns and project organization.

## References

- [**Module Patterns**](module-patterns.md) - ES6 modules and organization.
- [**Project Structure**](project-structure.md) - Directory organization.

## Module Patterns

```javascript
// Public API with index.js
// src/users/index.js
export { UserService } from './user-service.js';
export { UserRepository } from './user-repository.js';
export { createUser, updateUser } from './user-operations.js';

// Private implementation
// src/users/user-service.js
import { UserRepository } from './user-repository.js';
import { validateUser } from './validators.js';

export class UserService {
  constructor(repository = new UserRepository()) {
    this.repository = repository;
  }

  async createUser(data) {
    validateUser(data);
    return this.repository.save(data);
  }
}

// Singleton pattern
// src/utils/logger.js
class Logger {
  #instance;

  constructor() {
    if (Logger.#instance) {
      return Logger.#instance;
    }
    Logger.#instance = this;
  }

  log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

export const logger = new Logger();
```

## Project Structure

```
src/
├── domain/           # Business logic
│   └── user/
│       ├── user.js
│       └── user-repository.js
├── services/         # Application services
│   └── user-service.js
├── utils/            # Utilities
│   ├── logger.js
│   └── validation.js
├── config/           # Configuration
│   └── database.js
└── index.js          # Entry point
```

## Configuration Management

```javascript
// config/index.js
const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    logLevel: 'debug',
  },
  production: {
    apiUrl: process.env.API_URL,
    logLevel: 'error',
  },
};

const env = process.env.NODE_ENV || 'development';

export default config[env];
```
