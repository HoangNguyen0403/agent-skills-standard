Use named arguments when they make optional or reordered parameters clearer:

~~~php
$result = paginate(
    items: $items,
    page: 2,
    perPage: 25,
);
~~~

Use the exact parameter names from the function signature and avoid unnecessary naming for obvious positional calls.

