Assumption: the app uses Next.js/TypeScript, PostgreSQL, Prisma, and server-side sessions.

Implement:

- `POST /api/auth/register`
  - Normalize email with `email.trim().toLowerCase()`.
  - Validate email and require a password of at least 8 characters.
  - Hash passwords with Argon2id.
  - Enforce a unique email constraint.
  - Create a session and set an HTTP-only cookie.

- `POST /api/auth/login`
  - Normalize and validate the email.
  - Verify the Argon2id hash.
  - Return the same `401 Invalid email or password` response for unknown emails and wrong passwords.
  - Set a secure session cookie on success.

- `POST /api/auth/logout`
  - Delete the server-side session and clear the cookie.

- `GET /api/auth/me`
  - Read and validate the session cookie.
  - Return the authenticated user or `401`.

Use cookies configured as:

```ts
{
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 30
}
```

Prisma models:

```prisma
model User {
  id           String    @id @default(cuid())
  email        String    @unique
  passwordHash String
  createdAt    DateTime  @default(now())
  sessions     Session[]
}

model Session {
  id        String   @id
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
}
```

Reject malformed input, never return password hashes, use generic authentication errors, and protect authenticated pages by requiring a valid session.
