Use guard clauses to reject invalid or exceptional cases early and keep the main path at the lowest indentation level.

~~~php
function total(?Order $order): int
{
    if ($order === null) {
        return 0;
    }

    if (!$order->isPaid()) {
        return 0;
    }

    return $order->totalInCents();
}
~~~

For cases that should not silently return, throw a domain-specific exception instead. Avoid guard clauses that obscure required side effects or duplicate conditions.

