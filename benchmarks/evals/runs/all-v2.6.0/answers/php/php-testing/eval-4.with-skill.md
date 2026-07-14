Use a data provider to run the same test against multiple independent cases:

~~~php
/**
 * @dataProvider statusProvider
 */
public function testFormatsStatus(string $status, string $expected): void
{
    self::assertSame($expected, StatusFormatter::format($status));
}

public static function statusProvider(): array
{
    return [
        'pending' => ['pending', 'Waiting'],
        'paid' => ['paid', 'Complete'],
    ];
}
~~~

On PHPUnit 10+, prefer the equivalent DataProvider attribute and keep cases descriptive.

