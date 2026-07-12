Use match for value mapping because it uses strict comparison and is exhaustive:

~~~php
$statusLabel = match ($status) {
    'pending' => 'Waiting',
    'paid' => 'Complete',
    'failed' => 'Failed',
    default => throw new InvalidArgumentException("Unknown status: {$status}"),
};
~~~

Return the expression directly where possible and provide a deliberate default for unknown values.

