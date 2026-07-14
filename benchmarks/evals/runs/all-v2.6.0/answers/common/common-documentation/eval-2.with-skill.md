# Authentication Microservice

A REST service for registering users, authenticating credentials, and issuing JWT access and refresh tokens.

> Assumption: this README targets Node.js 20+, TypeScript, PostgreSQL, and Docker. Adjust commands and configuration names if the implementation uses another stack.

## Architecture

```mermaid
flowchart LR
    Client --> AuthAPI["Authentication API"]
    AuthAPI --> DB[(PostgreSQL)]
    AuthAPI --> TokenStore[(Refresh-token store)]
    AuthAPI --> Services["Email / User services"]
```

## Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL 15+, or Docker
- OpenSSL for generating secrets

## Installation

```bash
git clone <repository-url>
cd auth-service
npm install
cp .env.example .env
npm run db:migrate
```

Configure `.env`:

```dotenv
PORT=3000
DATABASE_URL=postgresql://auth:auth@localhost:5432/auth
JWT_ACCESS_SECRET=replace-with-a-long-random-secret
JWT_REFRESH_SECRET=replace-with-a-different-long-random-secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=30d
BCRYPT_ROUNDS=12
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Start the service:

```bash
npm run dev
```

The service is available at:

```text
http://localhost:3000
```

## Usage

### Register

```bash
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sam@example.com",
    "password": "correct-horse-battery-staple"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sam@example.com",
    "password": "correct-horse-battery-staple"
  }'
```

Example response:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<opaque-or-jwt-refresh-token>",
  "expiresIn": 900
}
```

### Get the current user

```bash
curl http://localhost:3000/v1/auth/me \
  -H "Authorization: Bearer <access-token>"
```

### Refresh an access token

```bash
curl -X POST http://localhost:3000/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-token>"
  }'
```

### Logout

```bash
curl -X POST http://localhost:3000/v1/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-token>"
  }'
```

### Health check

```bash
curl http://localhost:3000/health
```

## API Documentation

The REST contract is defined with Swagger/OpenAPI:

```text
GET /docs
GET /openapi.json
```

Keep the OpenAPI contract synchronized with endpoint behavior before implementation changes are merged.

## Inputs and outputs

| Operation | Input | Output |
|---|---|---|
| Register | Email and password | User identifier and token pair |
| Login | Email and password | JWT access token and refresh token |
| Refresh | Valid refresh token | New access token |
| Logout | Refresh token | `204 No Content` |
| Me | Bearer access token | Authenticated user profile |
| Health | No input | Service status |

Passwords are never returned or stored in plaintext. Passwords are hashed with bcrypt using 12 rounds. Access tokens expire after 15 minutes; refresh tokens expire after 30 days.

## Error responses

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}
```

Common status codes:

- `201 Created` — registration succeeded
- `200 OK` — authentication or token refresh succeeded
- `204 No Content` — logout succeeded
- `400 Bad Request` — malformed input
- `401 Unauthorized` — missing or invalid credentials
- `409 Conflict` — email already registered
- `500 Internal Server Error` — unexpected failure

## Development

```bash
npm run dev
npm test
npm run lint
npm run build
```

Use JSDoc for public functions and include `Args`, `Returns`, and a `Usage` example where applicable:

```ts
/**
 * Exchanges valid credentials for an access and refresh token pair.
 *
 * @param email User email address.
 * @param password Plaintext password supplied during login.
 * @returns Token pair and access-token expiry.
 *
 * @example
 * Usage:
 * login("sam@example.com", "correct-horse-battery-staple");
 */
```

## Maintenance

- Rotate JWT secrets through the deployment secret manager.
- Apply database migrations before starting a new version.
- Revoke refresh tokens on logout and suspected account compromise.
- Add an owner and ticket to every TODO, using `TODO(username): description`.
- Document architectural decisions in `docs/adr/`.
- Explain why non-obvious logic exists; avoid comments that merely restate what the code does.
- Add jitter to retry backoff where retries are introduced, because jitter prevents a thundering herd.
- Known quirk: access tokens remain valid until their short expiry unless the consuming service performs token introspection or maintains a revocation strategy.

## Documentation synchronization

Update this README, the Swagger/OpenAPI contract, migration notes, and relevant ADRs in the same change as any authentication feature or API change. Verify examples with a running local service before release.
