# Auth tokens in `SharedPreferences`

Regular `SharedPreferences` is not appropriate for an auth token. It is app-private in normal operation, but it is not encrypted at rest; a compromised, rooted, debug, or backup-related environment may expose its contents. Do not put the token in source code or log it.

Store the token with `EncryptedSharedPreferences`, backed by an Android Keystore-protected `MasterKey`:

```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
    .build()

val securePrefs = EncryptedSharedPreferences.create(
    context,
    "secret_shared_prefs",
    masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)

securePrefs.edit()
    .putString("auth_token", token)
    .apply()
```

Read and remove the token through that same encrypted store, clear it on logout or revocation, and transmit it only over HTTPS. This protects local storage; it does not replace secure session expiry, revocation, or TLS.

