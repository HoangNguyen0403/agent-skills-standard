# Authentication microservice README

## Mission

The authentication microservice authenticates users and issues, validates, and revokes service credentials for authorized clients.

## Prerequisites

- Docker and Docker Compose
- Access to the development secret store
- A configured database instance
- `curl` (or an equivalent HTTP client)

## Installation

```bash
git clone <repository-url>
cd auth-service
cp .env.example .env
# Fill required values from the development secret store.
docker compose up --build
```

The service listens on `<host>:<port>`; confirm the configured port in `.env` and wait for the health check before sending requests.

## Usage

Register or provision a client according to the deployment policy, then request a token:

```bash
curl -X POST http://localhost:<port>/oauth/token \
  -H 'Content-Type: application/json' \
  -d '{"client_id":"example","client_secret":"<secret>"}'
```

Use the returned access token as `Authorization: Bearer <token>`. Document every endpoint’s authentication requirements, request/response schema, status codes, expiry behavior, and copy-pasteable example in the API contract (OpenAPI preferred). Never commit real credentials or place secrets in README examples.

## Maintenance

- **Inputs:** credential requests, token validation requests, revocation requests, and configured identity-provider/database settings.
- **Outputs:** access/refresh tokens, validation results, revocation state, and structured audit events.
- **Known quirks:** clock skew can cause tokens near expiry to be rejected; keep service clocks synchronized. Rotation and revocation behavior must match the deployment configuration.
- **Troubleshooting:** check the health endpoint, service logs, database connectivity, issuer/audience configuration, and clock synchronization in that order. Record durable fixes here when discovered.

## Documentation synchronization

Update this README and the OpenAPI contract in the same change as any authentication-flow, configuration, endpoint, or operational change. Review examples during release verification so they remain runnable.
