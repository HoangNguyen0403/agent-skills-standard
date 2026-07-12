Break it into smaller widgets.

Start by identifying natural sections in `OrdersScreen`, like:

- header
- filters/search
- order summary cards
- order list item
- empty/loading/error states
- footer/actions

Then extract each section into its own `StatelessWidget` or small builder method. Prefer widgets when the chunk is reusable or has its own styling/logic.

Example structure:

```dart
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Orders')),
      body: Column(
        children: const [
          OrdersHeader(),
          OrdersFilterBar(),
          Expanded(child: OrdersList()),
        ],
      ),
    );
  }
}
```

And then:

```dart
class OrdersHeader extends StatelessWidget {
  const OrdersHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: const [
          Text('My Orders'),
          Icon(Icons.receipt_long),
        ],
      ),
    );
  }
}
```

A good refactor approach:

1. Extract repeated UI patterns first.
2. Move big nested blocks into named widgets.
3. Replace unnecessary `Container` widgets with `Padding`, `SizedBox`, `DecoratedBox`, or `Align` when that is all you need.
4. Use `ListView.builder` for long order lists instead of a large `Column`.
5. Keep `build()` focused on layout, not detailed styling logic.

If parts of the screen manage state, split stateful sections out so the whole screen does not rebuild unnecessarily.

As a rule of thumb, if you need to scroll a lot to understand one widget, it should probably be split up.

