# Signal Store Pattern

Using `@ngrx/signals`.

```typescript
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';

type TodoState = {
  items: Todo[];
  filter: 'all' | 'pending' | 'done';
};

export const TodoStore = signalStore(
  { providedIn: 'root' },
  withState<TodoState>({ items: [], filter: 'all' }),
  withComputed(({ items, filter }) => ({
    filteredItems: computed(() => {
      // filter logic derived from state
    }),
  })),
  withMethods((store) => ({
    addTodo(title: string) {
      patchState(store, (state) => ({
        items: [...state.items, { id: Date.now(), title, done: false }],
      }));
    },
    // Async method
    async loadTodos() {
      const todos = await inject(TodoService).getAll();
      patchState(store, { items: todos });
    },
  })),
);
```

## Signal-Based Service

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
