Assumption: your application receives PII through APIs, processes it in an application service, and must later decrypt it for authorized use.

Implement this flow:

1. Validate and sanitize PII at every trust boundary: API, UI, CSV, and webhook.
2. Encrypt PII in the application before persistence using authenticated AES-256 encryption, preferably AES-256-GCM.
3. Store encryption keys only in a secret manager or environment-backed key-management system—never hardcode or commit them.
4. Use TLS 1.3 for data in transit.
5. Store only the minimum PII required, and never log raw emails, phone numbers, or names.
6. Persist through an ORM or parameterized queries; never construct raw SQL such as `WHERE id = ${userId}`.
7. Enforce least privilege for application and database accounts. Restrict decryption to services and roles that require it.
8. Return generic error codes to clients; log detailed errors server-side without PII.
9. Add audit logging for sensitive operations such as viewing, decrypting, updating, and deleting PII.
10. Run SAST/DAST and dependency checks such as `npm audit` or `pip audit` in CI.

Example pseudocode:

```ts
const encrypted = aes256GcmEncrypt(
  Buffer.from(user.email, "utf8"),
  keyFromSecretManager(),
);

await db.users.create({
  data: {
    emailCiphertext: encrypted.ciphertext,
    emailIv: encrypted.iv,
    emailAuthTag: encrypted.authTag,
    keyVersion: encrypted.keyVersion,
  },
});
```

Use a versioned key-encryption scheme so keys can be rotated without losing access to existing records. If a PII field must be searchable, store a separately protected deterministic lookup value, such as a keyed HMAC, rather than weakening the encryption.

For passwords, do not use reversible encryption; use Argon2id. If this feature includes authentication, also require MFA, secure session management, rate limiting, and `HttpOnly Secure` cookies.
