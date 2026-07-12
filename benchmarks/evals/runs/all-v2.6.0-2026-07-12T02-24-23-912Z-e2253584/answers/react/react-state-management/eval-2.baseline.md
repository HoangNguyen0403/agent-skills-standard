Do not mutate the object or array in place. React relies on a new reference, so user.name = name followed by setUser(user) may not trigger the expected render.

Use immutable updates and a functional setter when the next value depends on the previous one:

~~~jsx
setUser((previous) => ({ ...previous, name: nextName }));
setItems((previous) => previous.map((item) =>
  item.id === id ? { ...item, done: true } : item
));
~~~

Also avoid duplicating remote data in useState without a reason. Use a query/cache layer or update/invalidate its cache after a mutation, and check for stale closures, missing dependencies, or helper functions that mutate objects.
