Assuming React + TypeScript:

```tsx
import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string;
  status: string;
};

export function OrdersList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/orders");

      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }

      setOrders(await response.json());
    } catch {
      setError("Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (loading) {
    return <div role="status">Loading orders…</div>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>
        <button onClick={fetchOrders}>Retry</button>
      </div>
    );
  }

  return (
    <ul>
      {orders.map((order) => (
        <li key={order.id}>
          Order {order.id} — {order.status}
        </li>
      ))}
    </ul>
  );
}
```
