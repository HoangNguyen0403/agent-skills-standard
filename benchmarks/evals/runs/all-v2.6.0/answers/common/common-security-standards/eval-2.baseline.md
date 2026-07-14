Assuming your backend performs encryption and the database should not hold usable keys:

- Encrypt PII with authenticated encryption: `AES-256-GCM`.
- Generate a unique random 12-byte nonce for every value.
- Store only `{ciphertext, nonce, authTag, keyVersion}` in the database.
- Keep the encryption key in a KMS/HSM or secrets manager, never in the database or source code.
- Use envelope encryption: a KMS-managed KEK encrypts data-encryption keys (DEKs).
- Rotate keys by `keyVersion`; decrypt with the old key and re-encrypt during migration.
- For exact-match lookup, store a separate keyed `HMAC-SHA-256` blind index—not deterministic encryption.
- Hash passwords with `Argon2id`; do not encrypt them.

Also restrict decryption permissions, exclude plaintext PII from logs/errors, and ensure backups and replicas contain only encrypted values.
