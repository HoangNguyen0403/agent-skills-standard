# SYNTHETIC BENCHMARK SOURCE FIXTURE: Enterprise Auth and SSO Integration
# NOTICE: This document is an explicitly SYNTHETIC fixture created for offline evaluation benchmarking.
# It does NOT represent real customer data or actual vendor documentation.

## Synthetic Specification: CloudSAML Identity Gateway v3.1

### Supported Protocols
- SAML 2.0 with HTTP-POST and HTTP-Redirect bindings.
- OIDC Core 1.0 with PKCE authorization code flow.
- SCIM 2.0 user provisioning (supports `/Users` and `/Groups` endpoints).

### Rate Limits and Operational Thresholds
- Token endpoint: 50 requests per second per tenant.
- SCIM synchronization batch limit: 100 users per request, maximum 10 requests per minute.
- Concurrent active sessions per tenant: 5,000 active sessions on Standard Tier, 50,000 on Enterprise Tier.

### Known Gaps and Unsupported Features
- Does NOT support custom SAML attribute transformations without an enterprise middleware license.
- Token refresh tokens have a hard expiration limit of 24 hours and cannot be extended indefinitely.
- Local session revocation does not propagate via backchannel logout to downstream IdPs unless explicitly configured with SCIM.
