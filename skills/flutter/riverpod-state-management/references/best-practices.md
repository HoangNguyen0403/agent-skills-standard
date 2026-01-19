# Best Practices & DCM Rules

## Code Generation (`riverpod_generator`)

Always use code generation. It prevents syntax errors and handles "family" parameters automatically.

**❌ Bad (Legacy)**

```dart
final myProvider = Provider<String>((ref) => 'Hello'); // Manual typing, error prone
```

**✅ Good (Generated)**

```dart
@riverpod
String my(MyRef ref) => 'Hello'; // Type-safe, auto-disposal by default
```

## Immutability & State Updates

Riverpod relies on strict object equality (`==`) to detect changes.

**❌ Bad (Mutation)**

```dart
state.add(newItem); // Same reference, listeners won't fire
state = state;
```

**✅ Good (New Reference)**

```dart
state = [...state, newItem]; // New list, new reference
```

## DCM & Linter Rules (`riverpod_lint`)

Enable strict rules in `analysis_options.yaml` via `custom_lint`.

### 1. `avoid-ref-read-inside-build`

**Rule**: Never use `ref.read` inside the `build()` method. It causes bugs where widgets don't update on change.
**Correct**: Use `ref.watch`.

### 2. `avoid-calling-notifier-members-inside-build`

**Rule**: Do not trigger side effects (API calls, internal mutations) inside `build`.
**Correct**: Use `build()` purely for initialization. Trigger actions via user interaction (onPressed) or `useEffect` (flutter_hooks).

### 3. `dispose-provided-instances`

**Rule**: If a provider creates a `ChangeNotifier` or stream controller, make sure it is disposed.
**Correct**:

```dart
@riverpod
StreamController myController(Ref ref) {
  final controller = StreamController();
  ref.onDispose(controller.close); // ✅ Register disposal
  return controller;
}
```

### 4. `use-ref-and-state-synchronously`

**Rule**: Don't use `ref` or setter `state` after an `await` without checking if the provider is still active.
**Context**: If a provider is disposed (e.g. user leaves screen) while an async task is running, setting state will throw.

**✅ Good**:

```dart
final result = await repo.fetch();
if (ref.context.mounted) { // Or simply rely on `AsyncValue.guard` which handles this somewhat safely
   state = AsyncData(result);
}
```

## `keepAlive` Strategy

By default, auto-generated providers are `autoDispose`. This is good for memory but bad for caching.

- **Use `keepAlive: true`** for global data (User Session, App Config).
- **Use Default (`keepAlive: false`)** for screen-specific data (Product Details), so it clears to save memory when the screen is popped.

```dart
@Riverpod(keepAlive: true)
class UserSession extends _$UserSession { ... }
```
