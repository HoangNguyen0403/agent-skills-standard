Common iOS persistence anti-patterns include:

- Storing sensitive data in `UserDefaults` instead of Keychain
- Using Core Data objects across threads/queues unsafely
- Treating persistence as a UI concern instead of isolating it behind a data layer
- Saving too frequently on the main thread, causing jank
- Not handling schema migrations for Core Data or local databases
- Using ad hoc file paths and formats without versioning
- Loading entire datasets into memory instead of paging or fetching selectively
- Ignoring data corruption, partial writes, and recovery paths
- Mixing network DTOs directly with persisted models
- Failing to define a single source of truth, leading to cache inconsistency
- Relying on singleton storage managers that become hard to test
- Not testing persistence behavior, especially migrations and app restart scenarios

