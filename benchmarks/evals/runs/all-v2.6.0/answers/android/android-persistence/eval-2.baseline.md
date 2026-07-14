For a new Android app, prefer DataStore. Use SharedPreferences mainly when maintaining existing code or when a simple legacy integration specifically requires it.

Preferences DataStore is the closest replacement for SharedPreferences: it stores untyped key-value pairs, exposes reads as a `Flow<Preferences>`, and performs writes through a suspending `edit` transaction.

```kotlin
val Context.settingsDataStore by preferencesDataStore(name = "settings")

private val DARK_MODE = booleanPreferencesKey("dark_mode")
private val USERNAME = stringPreferencesKey("username")

class SettingsRepository(private val context: Context) {
    val settings: Flow<Settings> = context.settingsDataStore.data
        .map { preferences ->
            Settings(
                darkMode = preferences[DARK_MODE] ?: false,
                username = preferences[USERNAME].orEmpty()
            )
        }

    suspend fun setDarkMode(enabled: Boolean) {
        context.settingsDataStore.edit { preferences ->
            preferences[DARK_MODE] = enabled
        }
    }
}
```

Choose Proto DataStore instead when the settings have a defined schema, several related fields, or a need for generated typed objects and explicit schema evolution. It requires a `.proto` definition and serializer, but reduces key/type mistakes. Preferences DataStore is convenient for small settings such as theme, flags, and selected account IDs.

DataStore is asynchronous, coroutine-friendly, observable, and updates are transactional. It is not a database: it is a poor fit for large collections, relational queries, partial-record queries, or complex app data; use Room for those. DataStore also does not provide encryption by itself.

SharedPreferences has a simpler synchronous API and may still be adequate for tiny, non-critical legacy values. However, it is easy to accidentally read or write on the main thread, has weaker coroutine/Flow integration, and its update/observation behavior is less suitable for modern reactive architecture. It should not be treated as a secure secret store. For credentials or tokens, use an appropriate Keystore-backed design and minimize what is persisted.

If migrating an existing app, DataStore supports a `SharedPreferencesMigration`. Complete the migration before deleting the old preference usage, and ensure there is one consistently named DataStore instance rather than creating multiple instances for the same file.

