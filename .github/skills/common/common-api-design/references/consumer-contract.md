# API Consumer Contract

## Representation Boundary

- Map store rows explicitly to a response representation; never expose persistence records by default.
- Allow-list accepted input fields and emitted output fields. Declare one casing convention in the API spec and use it consistently.
- Prefer flat resources with identifiers over deep nesting; link related resources by id.

## Method Semantics

- `GET` is safe; `PUT` and `DELETE` are idempotent by HTTP semantics.
- `PATCH` and `POST` are not inherently idempotent. Promise idempotence only when the API contract defines and enforces it.

## Retry-Safe Writes

- Require `Idempotency-Key` for side-effecting non-idempotent requests that clients may retry.
- The header is currently specified by an active IETF Internet-Draft, not an RFC: [Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/).
- Follow the [canonical idempotency contract](../../../system-design/system-design-principles/references/idempotency-contract.md) for key scope, payload mismatch, concurrent duplicates, and retention; do not duplicate those rules here.

## Conditional Requests

- Return an `ETag`; support `If-None-Match` on reads and return `304 Not Modified` when the representation matches.
- Require a strong `If-Match` validator on update and delete when lost updates must be rejected. Return `412 Precondition Failed` for a mismatch and `428 Precondition Required` when the required precondition is absent. `If-Match` uses strong comparison ([RFC 9110](https://www.rfc-editor.org/rfc/rfc9110#section-13.1.1)).
- Make the write check atomic with the write at its authoritative owner; see [Concurrent Writers](../../../system-design/system-design-principles/references/distributed-systems.md#concurrent-writers).

## Pagination

- Encode an opaque cursor over a total order: sort key plus a unique tie-breaker. Continue with a seek predicate over that order, not an offset that can shift under concurrent inserts.
- Return an explicit client error for an invalid or expired cursor; do not silently restart from the beginning.

## Compatible Evolution

- Additive fields are non-breaking when existing consumers can ignore them; do not deprecate them automatically.
- For a field rename, use expand-contract: add the new field while retaining the old one, migrate consumers, measure old-field usage, then announce removal with `Deprecation` ([RFC 9745](https://www.rfc-editor.org/rfc/rfc9745)) and a planned `Sunset` date ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594)). Remove only the old field, and only when the compatibility/version contract permits it.
- Introduce a new API version only for an unavoidable breaking change.

## Authorization

- `401 Unauthorized` means unauthenticated; `403 Forbidden` means authenticated but not permitted.
- Check object-level authorization for every resource id and action, enforced in the data-access predicate. See [common-owasp](../../common-owasp/SKILL.md).

## Rate Limits

- Apply limits per identity and cost class. Return `429 Too Many Requests` with `Retry-After`.
- Select and bound the mechanism using the [rate-limiting reference](../../../system-design/system-design-building-blocks/references/building-blocks.md#rate-limiting).
