---
name: angular-state-management
description: "Manage application state with Angular Signals, computed derivations, and NgRx Signal Store. Use when implementing reactive state with signal(), computed(), effect(), or @ngrx/signals in Angular. (triggers: **/*.store.ts, **/state/**, angular signals, signal store, computed, effect, linkedSignal)"
---

# State Management

## **Priority: P1 (HIGH)**

## 1. Use Signals for All State

- Keep internal signals private; expose publicly via `asReadonly()`.

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();

  private _loading = signal(false);
  readonly loading = this._loading.asReadonly();

  readonly displayName = computed(() => this._user()?.name ?? 'Guest');

  async loadUser(id: string) {
    this._loading.set(true);
    this._user.set(await this.api.getUser(id));
    this._loading.set(false);
  }
}
```

## 2. Derive State with computed()

- Use `computed()` for totals, filtered lists, and other derived values — it is pure and cached.
- Use `linkedSignal(() => source())` for dependent writable state that resets when source changes.
- Use `untracked()` to read a signal inside `computed()`/`effect()` without creating a dependency.

## 3. Scale with Signal Store

- For complex features, use `@ngrx/signals` (`signalStore`) with `withState`, `withComputed`, `withMethods`, and `withEntities()`.

## 4. Handle Side Effects

- Use `effect()` only for side effects (logging, localStorage sync, DOM manipulation).
- **Never update signals inside effect()** — causes circular dependencies.
- Treat signal values as immutable — update with `.set()` or `.update(v => ...)`.

## Anti-Patterns

- **No state logic in components**: Delegate to a Signal Store or Service.
- **No `BehaviorSubject` for state**: Use Signals; keep RxJS only for complex event streams.

## References

- [Signal Store Pattern](references/signal-store.md)
