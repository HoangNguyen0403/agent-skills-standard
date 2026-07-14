This usually means the widget that owns the cart count state also wraps the whole page, so when the count changes Flutter rebuilds that full subtree, including the expensive product grid.

A good fix is to narrow the rebuild scope:

- Move the cart count into a smaller reactive widget in the header only.
- Keep the product grid in a separate widget so it does not depend on cart count state.
- Use tools like `ValueListenableBuilder`, `Selector`, `Consumer`, or `InheritedModel` so only the badge/count widget rebuilds.
- Mark stable subtrees `const` where possible.
- If the grid is very heavy, also preserve item widgets and avoid recomputing filtered/sorted lists during parent rebuilds.

Example idea:

```dart
Column(
  children: [
    HeaderCartCount(countListenable: cartCount),
    const Expanded(child: ProductGrid()),
  ],
)
```

That way cart updates repaint only the header count instead of the whole screen.

