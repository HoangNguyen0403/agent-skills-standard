React compares effect dependencies with Object.is. An object created during every render therefore has a new identity even when its fields are unchanged, so the effect runs again and can loop if it sets state.

Prefer primitive dependencies:

~~~jsx
useEffect(() => {
  loadUser(user.id, user.region);
}, [user.id, user.region]);
~~~

If the object is required, create it inside the effect from primitive dependencies, or use useMemo only when stable identity is genuinely needed. Do not disable the dependency lint rule; also check whether the work belongs in render or an event handler.
