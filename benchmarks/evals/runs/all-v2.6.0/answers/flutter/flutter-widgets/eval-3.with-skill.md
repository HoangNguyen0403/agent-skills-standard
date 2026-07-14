```dart
import 'package:flutter/material.dart';

class OrdersEmptyState extends StatelessWidget {
  const OrdersEmptyState({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _EmptyStateIcon(color: theme.colorScheme.primary),
            const SizedBox(height: 12),
            Text(
              'No orders yet',
              style: theme.textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyStateIcon extends StatelessWidget {
  final Color color;

  const _EmptyStateIcon({required this.color});

  @override
  Widget build(BuildContext context) {
    return Icon(
      Icons.receipt_long_outlined,
      size: 48,
      color: color,
    );
  }
}
``` 

