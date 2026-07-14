If `CartBloc` keeps old state after leaving and returning, it usually means the bloc is being provided as a singleton or from a parent scope that is not getting disposed.

If you want a fresh cart every time that screen opens, make the bloc screen-scoped and create it with a factory, not a singleton.

A typical fix with `get_it`/`injectable` is:

```dart
@injectable
class CartBloc extends Bloc<CartEvent, CartState> {
  CartBloc(/* deps */) : super(CartInitial());
}
```

or explicitly:

```dart
@factoryMethod
CartBloc createCartBloc(/* deps */) => CartBloc(/* deps */);
```

Then provide it at the page level:

```dart
class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => getIt<CartBloc>(),
      child: const CartView(),
    );
  }
}
```

This works because:

- `BlocProvider(create: ...)` creates a new bloc when the page is pushed.
- When that widget is removed, the provider disposes the bloc.
- Entering the page again creates a brand new instance with initial state.

Things that usually cause the stale-state problem:

- Registering `CartBloc` as `@singleton` or `@lazySingleton`
- Putting the `BlocProvider` too high in the widget tree, such as above the navigator or app shell
- Reusing the same page/widget instance in a way that preserves the bloc

What to change:

- Register `CartBloc` as a factory/injectable transient dependency
- Move `BlocProvider` down to the route or page that owns the cart lifecycle
- Keep repositories/services as singletons if needed, but keep UI state objects like blocs short-lived unless persistence is intentional

If you intentionally need a singleton bloc in other places, but want reset behavior here, another option is to dispatch a reset event on page entry:

```dart
context.read<CartBloc>().add(CartResetRequested());
```

But that is usually a fallback. The cleaner fix is lifecycle scoping: create a new `CartBloc` per screen visit.

