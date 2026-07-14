Declare a data provider that returns iterable test cases, reference it with the DataProvider attribute, and type the test parameters. Each case should have a descriptive key where useful.

~~~php
final class CalculatorTest extends TestCase
{
    /**
     * @return iterable<string, array{int, int, int}>
     */
    public static function additionCases(): iterable
    {
        yield 'positive numbers' => [2, 3, 5];
        yield 'negative number' => [-2, 3, 1];
    }

    #[DataProvider('additionCases')]
    public function testAdds(int $left, int $right, int $expected): void
    {
        self::assertSame($expected, $left + $right);
    }
}
~~~

Use the attribute or the older annotation according to the PHPUnit version in the project.

