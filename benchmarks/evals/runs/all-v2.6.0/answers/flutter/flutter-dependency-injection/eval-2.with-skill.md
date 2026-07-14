This usually means `CartBloc` was registered with too long a lifetime. Per the skill, BLoCs should be factories, not singletons, so they start with fresh state every time the screen creates them.

The fix is:

1. Register `CartBloc` with `@injectable` so injectable treats it as a factory
2. Do not use `@Singleton()` or `@LazySingleton()` for a BLoC
3. Create the bloc at the page/route level so it is disposed when the page is removed

Example registration:

```dart
import 'package:injectable/injectable.dart';

@injectable
class CartBloc extends Bloc<CartEvent, CartState> {
  final ICartRepository _cartRepository;

  CartBloc(this._cartRepository) : super(const CartState.initial());
}
```

Then provide it like this:

```dart
class CartPage extends StatelessWidget {
  const CartPage({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider<CartBloc>(
      create: (_) => getIt<CartBloc>(),
      child: const CartView(),
    );
  }
}
```

Why this works:

- `getIt<CartBloc>()` returns a new instance each time because `@injectable` is factory-scoped
- `BlocProvider(create: ...)` owns that instance and closes it when the page is popped
- when you navigate back to the page, a brand new bloc is created with the initial state

What to avoid:

- `@Singleton()` on `CartBloc`
- `@LazySingleton()` on `CartBloc`
- putting the `BlocProvider` above the navigator, shell, or tab root if you want per-screen state
- calling `getIt<CartBloc>()` directly inside widgets without a provider-owned lifecycle

Good lifetime split from the skill:

- repositories/services/data sources: `@LazySingleton`
- BLoCs: `@injectable` factory

If you still need cart data to persist, persist it in the repository or local store, not by keeping the BLoC alive forever. The BLoC should represent screen state; the repository should represent durable app data.

