# Mobile Security Reference

Detailed implementation patterns for OWASP Mobile compliance.

## References

- [**Network Security**](network-security.md) - SSL Pinning and Security Headers.
- [**Secure Storage**](secure-storage-impl.md) - PII and Token management.

## **CI/CD Security Flag**

```bash
# Obfuscation during build
flutter build apk --obfuscate --split-debug-info=./debug-info
```
