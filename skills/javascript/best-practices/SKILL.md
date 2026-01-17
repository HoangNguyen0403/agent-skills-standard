---
name: JavaScript Best Practices
description: Idiomatic JavaScript patterns and conventions for maintainable code.
metadata:
  labels: [javascript, best-practices, conventions, code-quality]
  triggers:
    files: ['**/*.js', '**/*.mjs']
    keywords: [module, import, export, error, validation]
---

# JavaScript Best Practices

## **Priority: P1 (OPERATIONAL)**

Conventions and patterns for writing maintainable JavaScript.

## Implementation Guidelines

- **Naming Conventions**:
  - camelCase for variables, functions, and methods
  - PascalCase for classes and constructors
  - UPPER_SNAKE_CASE for constants
  - Descriptive names over abbreviations
- **Error Handling**:
  - Always handle errors in async functions
  - Throw Error objects, not strings
  - Use custom error classes for specific error types
- **Comments**:
  - Write self-documenting code
  - Use JSDoc for functions and classes
  - Explain "why", not "what"
- **File Organization**:
  - One component/class per file
  - Group related files in directories
  - Use index.js for public API exports
- **Modules**:
  - Prefer named exports over default exports
  - Import in order: external -> internal -> relative
  - Keep modules small and focused (Single Responsibility)

## Anti-Patterns

- **No Global Variables**: Avoid polluting global scope
- **No Magic Numbers**: Use named constants
- **No Deep Nesting**: Extract nested logic into functions
- **No Long Functions**: Keep functions under 50 lines
- **No Side Effects**: Functions should be predictable

## Code

```javascript
// Named constants
const HTTP_STATUS = {
  OK: 200,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

// Custom error classes
class ValidationError extends Error {
  constructor(message, field) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// JSDoc documentation
/**
 * Fetches user data from the API
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} User object
 * @throws {ValidationError} If userId is invalid
 */
async function getUser(userId) {
  if (!userId) {
    throw new ValidationError('User ID is required', 'userId');
  }
  
  try {
    const response = await fetch(`/api/users/${userId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw error;
  }
}

// Module organization
export class UserService {
  constructor(apiClient) {
    this.apiClient = apiClient;
  }

  async findById(id) {
    return this.apiClient.get(`/users/${id}`);
  }
}

// Named exports
export { getUser, UserService };
```

## Reference & Examples

For module patterns and project structure:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

language | tooling
