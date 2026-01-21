# NestJS Security Implementation Details

## Cryptography & Hashing

### Password Hashing (Argon2id)

Use **Argon2id** instead of Bcrypt (vulnerable to GPU/FPGA cracking).

```typescript
import * as argon2 from 'argon2';

// Hash
const hash = await argon2.hash(password);

// Verify
const isValid = await argon2.verify(hash, password);
```

### Encryption (AES-256-GCM)

Use **Authenticated Encryption** for data at rest.

```typescript
import { createCipheriv, randomBytes } from 'crypto';

const key = getKeyFromKMS(); // Never hardcode
const iv = randomBytes(16);
const cipher = createCipheriv('aes-256-gcm', key, iv);
```

**Key Management**:

- Never hardcode keys in source
- Rotate keys using KMS (AWS Secrets Manager, HashiCorp Vault)
- Use separate keys per environment

---

## CSRF Protection

**When Required**: Cookie-based sessions or Cookie-based JWTs.

```typescript
// main.ts
import * as csurf from 'csurf';
app.use(csurf({ cookie: true }));
```

**Token Requirements**:

- Cryptographically strong
- Verified on every state-changing request (POST/PUT/DELETE)

**Note**: If using `Authorization: Bearer` headers only, CSRF is less critical but `SameSite: Strict` cookies are still recommended.

---

## Hardening Configuration

### Helmet Setup

```typescript
// main.ts
import helmet from 'helmet';

app.use(
  helmet({
    hsts: { maxAge: 31536000, preload: true },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
  }),
);
```

### Rate Limiting (Distributed)

```typescript
// app.module.ts
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60, limit: 10 }],
      storage: new ThrottlerStorageRedisService(redisClient),
    }),
  ],
})
```

---

## Audit Logging Pattern

```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      this.logger.log({
        user: req.user?.id,
        action: req.method,
        resource: req.url,
        timestamp: new Date(),
      });
    }
    return next.handle();
  }
}
```

---

## Data Sanitization

### Response Serialization

```typescript
// main.ts
app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

// user.entity.ts
@Exclude()
password: string;
```

### Input Validation (Mass Assignment Prevention)

```typescript
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true, // Strips unknown properties
    forbidNonWhitelisted: true, // Throws on unknown
  }),
);
```
