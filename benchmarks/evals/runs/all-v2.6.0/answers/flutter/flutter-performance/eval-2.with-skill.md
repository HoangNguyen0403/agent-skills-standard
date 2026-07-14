The issue is that the cart count change is coupled to the whole page state, so the expensive product grid rebuilds too.

Fix it by isolating the header update from the grid:

- Do not call `setState()` at the page/root level for cart count changes.
- Put the cart badge/header in its own `BlocBuilder` with `buildWhen`, or use `context.select()` / `BlocSelector` so only the count widget rebuilds.
- Keep the product grid as a separate widget with stable inputs; make static children `const` where possible.
- If the grid is visually heavy, wrap it in `RepaintBoundary` so header changes do not trigger unnecessary repaints.
- Make sure any sorting/filtering work is outside `build()`.

Example:

```dart
class ShopPage extends StatelessWidget {
  const ShopPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: const [
        _CartHeader(),
        Expanded(child: RepaintBoundary(child: ProductGrid())),
      ],
    );
  }
}

class _CartHeader extends StatelessWidget {
  const _CartHeader();

  @override
  Widget build(BuildContext context) {
    final itemCount = context.select((CartBloc bloc) => bloc.state.itemCount);
    return HeaderCartBadge(count: itemCount);
  }
}
```

If using `BlocBuilder`, make it granular:

```dart
BlocBuilder<CartBloc, CartState>(
  buildWhen: (prev, next) => prev.itemCount != next.itemCount,
  builder: (context, state) => HeaderCartBadge(count: state.itemCount),
)
```

Main takeaway: rebuild only the cart-count widget, not the whole screen or product grid.

