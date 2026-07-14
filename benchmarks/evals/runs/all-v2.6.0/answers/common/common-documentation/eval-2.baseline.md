# Authentication Microservice

Centralized authentication and authorization service for issuing, validating, refreshing, and revoking user credentials.

> Assumption: this service exposes a JSON-over-HTTP API, uses JWT access tokens, and stores users and refresh tokens in a relational database. Update endpoint names and configuration values to match the implementation.

## Features

- User registration and login
- JWT access-token issuance
- Refresh-token rotation
- Logout and token revocation
- Password hashing and password reset
- Token validation for downstream services
- Role- and permission-based authorization
- Health and readiness checks

## Requirements

- Node.js 20+
- PostgreSQL 15+
- npm 10+

## Getting Started

```bash
git clone <repository-url>
cd <repository-directory>
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

The service runs at:

```text
http://localhost:3000
```

## Configuration

| Variable | Example | Description |
|---|---|---|
| `PORT` | `3000` | HTTP server port |
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/auth` | Database connection string |
| `JWT_ACCESS_SECRET` | `replace-me` | Secret used to sign access tokens |
| `JWT_REFRESH_SECRET` | `replace-me` | Secret used to sign refresh tokens |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Access-token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | `30d` | Refresh-token lifetime |
| `PASSWORD_RESET_URL` | `https://example.com/reset-password` | Frontend password-reset URL |
| `CORS_ORIGINS` | `http://localhost:3001` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` | Application log level |

Use strong, unique secrets in every environment. Do not commit `.env` files or credentials.

## API

All request and response bodies use `application/json`.

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "correct-horse-battery-staple",
  "name": "Example User"
}
```

Response:

```json
{
  "user": {
    "id": "usr_123",
    "email": "user@example.com",
    "name": "Example User"
  },
  "accessToken": "<jwt>",
  "refreshToken": "<refresh-token>"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "user@example.com",
  "password": "correct-horse-battery-staple"
}
```

### Refresh Tokens

```http
POST /api/v1/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "<refresh-token>"
}
```

A successful request returns a new access token and refresh token. The previous refresh token is revoked.

### Logout

```http
POST /api/v1/auth/logout
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "refreshToken": "<refresh-token>"
}
```

### Get Current User

```http
GET /api/v1/auth/me
Authorization: Bearer <access-token>
```

### Validate a Token

```http
POST /api/v1/auth/introspect
Content-Type: application/json
```

```json
{
  "token": "<jwt>"
}
```

Response:

```json
{
  "active": true,
  "sub": "usr_123",
  "email": "user@example.com",
  "roles": ["user"],
  "exp": 1760000000
}
```

### Health Checks

```http
GET /health
GET /ready
```

`/health` confirms that the process is running. `/ready` confirms that required dependencies, such as PostgreSQL, are available.

## Authentication Flow

1. The client registers or logs in.
2. The service returns a short-lived JWT access token and a refresh token.
3. The client sends the access token using the `Authorization: Bearer <token>` header.
4. When the access token expires, the client calls `/api/v1/auth/refresh`.
5. Refresh-token rotation invalidates the previous refresh token.
6. Logging out revokes the active refresh-token session.

Access tokens should be kept short-lived. Browser clients should store refresh tokens in `HttpOnly`, `Secure`, `SameSite` cookies where possible.

## Error Responses

Errors use a consistent structure:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "requestId": "req_123"
  }
}
```

Common status codes:

- `400 Bad Request` — malformed or invalid input
- `401 Unauthorized` — missing or invalid credentials
- `403 Forbidden` — authenticated but not authorized
- `404 Not Found` — resource does not exist
- `409 Conflict` — email or resource already exists
- `429 Too Many Requests` — rate limit exceeded
- `500 Internal Server Error` — unexpected server error

## Development Commands

```bash
npm run dev       # Start the development server
npm run build     # Compile the service
npm start         # Start the production server
npm test          # Run tests
npm run lint      # Run lint checks
npm run format    # Format source files
npm run db:migrate # Apply database migrations
```

## Security Requirements

- Passwords must be hashed with Argon2id or bcrypt; never store plaintext passwords.
- Enforce password strength and login rate limits.
- Use HTTPS outside local development.
- Rotate JWT signing secrets through a managed secret store.
- Validate and normalize all user input.
- Do not reveal whether an email exists during password-reset requests.
- Revoke refresh tokens on logout, password change, and suspected compromise.
- Record security-relevant events without logging passwords or tokens.
- Restrict CORS origins explicitly.
- Keep dependencies and database migrations up to date.

## Production Deployment

Before deployment:

1. Configure production secrets and `DATABASE_URL`.
2. Run database migrations.
3. Configure HTTPS and trusted proxy settings.
4. Set `NODE_ENV=production`.
5. Configure centralized logs and metrics.
6. Verify `/health` and `/ready`.
7. Confirm refresh-token revocation and rate limiting.
8. Test rollback procedures.

## License

This project is licensed under the terms defined by the repository.
