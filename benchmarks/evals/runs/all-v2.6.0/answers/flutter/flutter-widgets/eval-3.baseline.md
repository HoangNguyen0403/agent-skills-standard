```dart
if (orders.isEmpty) {
  return Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: const [
        Icon(Icons.inbox_outlined, size: 48, color: Colors.grey),
        SizedBox(height: 12),
        Text('No orders yet'),
      ],
    ),
  );
}
```

