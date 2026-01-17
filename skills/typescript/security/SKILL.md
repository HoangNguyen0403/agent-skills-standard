---
name: TypeScript Security
description: Secure coding practices for building safe TypeScript applications.
metadata:
  labels: [security, typescript, validation, sanitization]
  triggers:
    files: ['**/*.ts', '**/*.tsx']
    keywords: [validate, sanitize, xss, injection, auth, password, secret, token]
---

# TypeScript Security

## **Priority: P0 (CRITICAL)**

Security standards for TypeScript applications based on OWASP guidelines.

## Implementation Guidelines

- **Input Validation**: Validate all external input using libraries like `zod`, `joi`, or `class-validator`.
- **Sanitization**: Sanitize user input to prevent XSS. Use libraries like `DOMPurify` for HTML.
- **Secrets Management**: Never hardcode secrets. Use environment variables or secret managers.
- **SQL Injection**: Use parameterized queries or ORMs (TypeORM, Prisma) to prevent SQL injection.
- **Authentication**: Use secure password hashing (bcrypt, argon2). Implement proper session management.
- **Authorization**: Implement role-based access control (RBAC). Validate permissions on every request.
- **HTTPS Only**: Always use HTTPS in production. Set secure cookies (`httpOnly`, `secure`, `sameSite`).
- **Rate Limiting**: Implement rate limiting to prevent brute force and DDoS attacks.
- **Dependency Security**: Regularly audit dependencies with `npm audit` or `yarn audit`.
- **Type Safety**: Leverage TypeScript's type system to prevent runtime errors and vulnerabilities.

## Anti-Patterns

- **No `eval()`**: Never use `eval()` or `Function()` constructor with user input.
- **No Plaintext Secrets**: Do not commit secrets to version control.
- **No Client-Side Validation Only**: Always validate on the server side.
- **No Trust User Input**: Treat all user input as untrusted.

## Code

```typescript
import { z } from 'zod';
import bcrypt from 'bcrypt';

// Input validation with Zod
const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  age: z.number().int().positive().max(150),
});

type UserInput = z.infer<typeof UserSchema>;

async function createUser(input: unknown): Promise<void> {
  // Validate input
  const validatedInput = UserSchema.parse(input);
  
  // Hash password
  const hashedPassword = await bcrypt.hash(validatedInput.password, 10);
  
  // Use parameterized query (example with Prisma)
  await prisma.user.create({
    data: {
      email: validatedInput.email,
      password: hashedPassword,
      age: validatedInput.age,
    },
  });
}

// Secure cookie configuration
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

// Rate limiting (example with express-rate-limit)
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
```

## Reference & Examples

For authentication patterns and security headers:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | language
