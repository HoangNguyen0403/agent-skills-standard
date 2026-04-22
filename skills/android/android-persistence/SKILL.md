---
name: android-persistence
description: Implement Room database schemas and DataStore preferences with proper async patterns in Android. Use when defining Room entities, DAOs, migrations, or replacing SharedPreferences with DataStore.
metadata:
  triggers:
    files:
    - '**/*Dao.kt'
    - '**/*Database.kt'
    - '**/*Entity.kt'
    keywords:
    - "@Dao"
    - "@Entity"
    - RoomDatabase
---
# Android Persistence Standards

## **Priority: P0**

## 1. Configure Room Database

- Return `Flow<List<T>>` for queries, use `suspend` for Write/Insert.
- Keep `@Entity` data classes simple. Map to Domain models in Repository.
- Use `@Transaction` for multi-table queries (Relations).

See [DAO templates](references/implementation.md) for Room DAO patterns.

## 2. Migrate to DataStore

- Replace `SharedPreferences` with `ProtoDataStore` (type-safe) or `PreferencesDataStore`.
- Inject singleton DataStore instance via Hilt.

See [DAO templates](references/implementation.md) for DataStore migration patterns.

## Anti-Patterns

- **No IO on Main Thread**: Room handles dispatchers, but verify Flow collected off-main.
- **No @Entity in UI Layer**: Map to Domain or UI models in Repository.

## References

- [DAO Templates](references/implementation.md)