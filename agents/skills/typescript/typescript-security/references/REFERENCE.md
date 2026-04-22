# TypeScript Security Reference

Authentication, authorization, and security patterns.

## References

- [**Authentication**](authentication.md) - JWT and session management.
- [**Security Headers**](security-headers.md) - HTTP security headers configuration.

## Input Validation (Zod)

```typescript
const UserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
type User = z.infer<typeof UserSchema>;

// Validate at boundary
const result = UserSchema.safeParse(req.body);
if (!result.success) return res.status(400).json(result.error);
```

## Secure Cookie Options

```typescript
// In many Node deployments, production mode uses NODE_ENV === 'production';
// verify your environment's convention (e.g., 'prod' vs 'production').
const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 60 * 60 * 1000, // 1 hour
};
```

## JWT Authentication Pattern

```typescript
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  role: string;
}

export class AuthService {
  private readonly secret: string;

  constructor() {
    this.secret = process.env.JWT_SECRET!;
    if (!this.secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
  }

  generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: '1h',
      issuer: 'your-app',
      audience: 'your-api',
    });
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secret) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}
```

## Security Headers (Express)

```typescript
import helmet from 'helmet';
import express from 'express';

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }),
);

// CORS configuration
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
    credentials: true,
  }),
);
```

## Role-Based Access Control

```typescript
enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

type Permission = 'read' | 'write' | 'delete';

const rolePermissions: Record<Role, Permission[]> = {
  [Role.ADMIN]: ['read', 'write', 'delete'],
  [Role.USER]: ['read', 'write'],
  [Role.GUEST]: ['read'],
};

function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role].includes(permission);
}

// Middleware
function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // Assume user is set by auth middleware

    if (!user || !hasPermission(user.role, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
```

## Zod Input Validation (Route Handler)

```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  role: z.enum(['user', 'admin']),
});

// In route handler
app.post('/users', (req, res) => {
  const result = CreateUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten().fieldErrors });
  }
  // result.data is fully typed and validated
  return userService.create(result.data);
});
```
