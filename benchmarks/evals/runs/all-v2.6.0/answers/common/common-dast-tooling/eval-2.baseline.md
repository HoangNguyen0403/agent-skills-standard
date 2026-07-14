You can still test effectively with standard HTTP tooling and a small repeatable test harness. The important properties are authorization, controlled inputs, coverage, evidence, and manual confirmation—not a particular scanner.

Start by importing the API’s OpenAPI document, route list, or contract into a test script. Use `curl`, HTTPie, Python `requests`, Node `fetch`, or an existing API client to send requests with controlled rate limits and timeouts. Maintain two isolated test users and test accounts with deliberately different roles.

Cover at least:

- Authentication: missing, malformed, expired, replayed, and wrong-issuer tokens; login/session fixation; password-reset and verification flows; token leakage in URLs, logs, or responses.
- Authorization: access another user’s object by changing IDs; invoke admin actions as a normal user; test tenant/organization boundaries; try each HTTP method and alternate content type.
- Input handling: unexpected types, nulls, empty and oversized values, Unicode, boundary numbers, duplicate parameters, malformed JSON, and nested objects. Use harmless canaries to identify SQL/NoSQL, command, template, and expression injection rather than destructive payloads.
- Server-side behaviors: redirect validation, SSRF defenses using an approved internal canary, file upload/download path handling, archive extraction, webhook validation, CORS, cache behavior, and rate limits.
- Error and configuration exposure: stack traces, debug routes, directory listings, API documentation, secrets, sensitive headers, version disclosures, and excessive response data.

Make each check assert expected status codes, response shape, authorization outcome, and absence of sensitive data. Run negative tests before positive tests, preserve request/response pairs with secrets redacted, and correlate anomalies with server logs. Add regression tests for every confirmed issue.

For broader coverage, use a proxy or browser developer tools to capture real authenticated requests, then replay and mutate them. A generic fuzzer can exercise parameter and route variations, but keep payloads bounded, rate-limited, and restricted to staging. Stop immediately if testing reaches an unintended system or risks data loss. Manually validate every suspected vulnerability and prioritize by exploitability, affected privilege/data, exposure, and business impact.

