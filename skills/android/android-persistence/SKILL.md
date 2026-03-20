---
name: android-persistence
description: "Standards for Room Database and DataStore. Use when implementing Room database schemas or DataStore preferences in Android. (triggers: **/*Dao.kt, **/*Database.kt, **/*Entity.kt, @Dao, @Entity, RoomDatabase)"
---

# Android Persistence Standards

## **Priority: P0**

## Implementation Guidelines

### Room

- **Async**: Return `Flow<List<T>>` for queries, use `suspend` for Write/Insert.
- **Entities**: Keep simple `@Entity` data classes. Map to Domain models in Repository.
- **Transactions**: Use `@Transaction` for multi-table queries (Relations).

### DataStore

- **Usage**: Replace `SharedPreferences` with `ProtoDataStore` (Type-safe) or `PreferencesDataStore`.
- **Scope**: Inject singleton instance via Hilt.

## Anti-Patterns

- **No IO on Main Thread**: Room handles dispatchers, but verify Flow is collected off-main.
- **No @Entity in UI Layer**: Map to Domain or UI models in Repository.

## References

- [DAO Templates](references/implementation.md)
