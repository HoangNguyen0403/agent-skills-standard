Use `joinSub` when joining to an aggregated/derived query and `whereExists` when only existence matters:

```php
$latest = DB::table('orders')->select('user_id', DB::raw('MAX(created_at) AS last_order_at'))
    ->groupBy('user_id');

$users = User::query()->joinSub($latest, 'latest_orders', function ($join) {
    $join->on('users.id', '=', 'latest_orders.user_id');
})->get(['users.*', 'latest_orders.last_order_at']);

$active = User::whereExists(fn ($q) => $q->from('orders')->whereColumn('orders.user_id', 'users.id')
    ->where('orders.status', 'open'))->get();
```

Use bindings through the builder, inspect the generated plan, and index join/filter columns. Choose `whereExists` over a join when duplicate parent rows would otherwise require `distinct`.

