# Answer

Prefer DataStore for new settings. `SharedPreferences` is synchronous, weakly typed, and does not provide a reactive `Flow` API; it can also encourage disk work from application code on the main thread. DataStore provides asynchronous reads, observable updates, and atomic edits.

Choose the DataStore variant based on the settings contract:

- Use `PreferencesDataStore` for a small set of simple, dynamically keyed primitives.
- Use `ProtoDataStore` when settings have a stable schema and type safety, defaults, and explicit evolution matter. It is the stronger default for a larger or long-lived settings model.

For a small preferences-based settings store, define one application-scoped instance and inject it as a singleton:

```kotlin
// Top-level declaration: the delegate creates/reuses one store per Context/name.
val Context.settingsDataStore by preferencesDataStore(name = "settings")

@Module
@InstallIn(SingletonComponent::class)
object DataStoreModule {
    @Provides
    @Singleton
    fun provideSettingsDataStore(
        @ApplicationContext context: Context,
    ): DataStore<Preferences> = context.settingsDataStore
}

class SettingsRepository @Inject constructor(
    private val dataStore: DataStore<Preferences>,
) {
    private val darkModeKey = booleanPreferencesKey("dark_mode")

    val darkMode: Flow<Boolean> = dataStore.data
        .map { preferences -> preferences[darkModeKey] ?: false }

    suspend fun setDarkMode(enabled: Boolean) {
        dataStore.edit { preferences ->
            preferences[darkModeKey] = enabled
        }
    }
}
```

If the app already uses `SharedPreferences`, configure a `SharedPreferencesMigration` when creating the DataStore and then remove the old reads/writes after migration is verified. Do not create a new DataStore instance per call, block on `.get()`/`.commit()`, or use SharedPreferences for new reactive settings.

