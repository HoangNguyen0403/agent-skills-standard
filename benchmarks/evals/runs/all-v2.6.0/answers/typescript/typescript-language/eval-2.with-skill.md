Model the event catalog as a map from event names to payloads, then derive both the event name and payload types from that map. A discriminant or distinct key prevents mismatched payloads:

```ts
type EventMap = {
  userCreated: { readonly userId: string };
  invoicePaid: { readonly invoiceId: string; readonly amountCents: number };
};

type EventName = keyof EventMap;
type Listener<K extends EventName> = (payload: EventMap[K]) => void;

export class EventBus {
  private readonly listeners: {
    [K in EventName]?: Set<Listener<K>>;
  } = {};

  public on<K extends EventName>(
    event: K,
    listener: Listener<K>,
  ): () => void {
    const listeners = this.listeners[event] ?? new Set<Listener<K>>();
    this.listeners[event] = listeners;
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  public emit<K extends EventName>(event: K, payload: EventMap[K]): void {
    this.listeners[event]?.forEach((listener) => listener(payload));
  }
}

const bus = new EventBus();
bus.on("invoicePaid", ({ amountCents }) => console.log(amountCents));
bus.emit("invoicePaid", { invoiceId: "inv-1", amountCents: 2500 });
```

`emit("invoicePaid", { userId: "u-1" })` is rejected at compile time. Keep the catalog and callbacks free of `any`; use explicit parameters/returns and readonly payloads.
