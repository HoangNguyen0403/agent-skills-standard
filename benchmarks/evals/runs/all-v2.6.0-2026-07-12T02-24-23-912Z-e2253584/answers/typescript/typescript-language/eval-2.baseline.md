Model the relationship between event names and payloads with an event map, then make each operation generic over the event key:

```ts
type Events = {
  userCreated: { id: string; email: string };
  orderPaid: { orderId: string; amount: number };
};

type Handler<T> = (payload: T) => void;

class EventBus<E extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof E, Set<Handler<unknown>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set<Handler<unknown>>();
    set.add(handler as Handler<unknown>);
    this.handlers.set(event, set);
    return () => set.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    for (const handler of this.handlers.get(event) ?? []) {
      (handler as Handler<E[K]>)(payload);
    }
  }
}

const bus = new EventBus<Events>();
bus.on("userCreated", (payload) => console.log(payload.email));
bus.emit("orderPaid", { orderId: "o-1", amount: 25 });
```

Now an event name selects its payload type, so mismatched names and payloads fail at compile time. The casts are confined to the event bus implementation; callers remain type-safe. For a production bus, also decide how to handle handler errors, async handlers, duplicate subscriptions, and cleanup.
