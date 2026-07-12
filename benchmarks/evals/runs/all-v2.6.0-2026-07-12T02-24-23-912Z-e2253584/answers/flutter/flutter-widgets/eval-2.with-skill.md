Break it into small `const` widgets and let the screen become mostly composition.

Good target split:

- `OrdersScreen` keeps scaffold, app bar, and top-level layout only
- `_OrdersHeader`
- `_OrderSummaryCard`
- `_OrderList`
- `_OrderTile`
- `_OrderActions`

Rules I’d use:

- Prefer `StatelessWidget` unless you truly need local controller or ephemeral UI state
- If the file is 350 lines, it is already past the extraction threshold
- Replace private `_buildX()` helpers with private widget classes
- Use `Theme.of(context)` for text styles, spacing conventions, and colors
- Use `ListView.builder` for orders instead of manually repeating children
- Use `SizedBox` or `Gap` for spacing instead of deeply nesting extra containers
- If there are interactive buttons, give them stable keys from `widget_keys.dart`

Example direction:

```dart
class OrdersScreen extends StatelessWidget {
  const OrdersScreen({super.key, required this.orders});

  final List<Order> orders;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: Column(
        children: [
          const _OrdersHeader(),
          Expanded(
            child: _OrderList(orders: orders),
          ),
        ],
      ),
    );
  }
}

class _OrderList extends StatelessWidget {
  const _OrderList({required this.orders});

  final List<Order> orders;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: orders.length,
      itemBuilder: (context, index) {
        return _OrderTile(order: orders[index]);
      },
    );
  }
}
```

That structure gives you:

- smaller files and easier review
- more reusable pieces
- better testability
- less nesting per widget

Practical refactor order:

1. Keep the existing UI behavior unchanged
2. Extract repeated sections into private `const StatelessWidget` classes
3. Move repeated order rows/cards into a data-driven `ListView.builder`
4. Replace hardcoded styles with theme usage
5. Only keep state in the screen if it is truly local UI state

If you want, paste the current `OrdersScreen` and I can propose an exact widget split.

