Test the service through its public behavior and inject its dependencies so they can be replaced with test doubles. Arrange the inputs and mocks, call the service, assert the result and important collaborator interactions, and keep each test independent.

~~~php
final class PriceServiceTest extends TestCase
{
    public function testReturnsPriceFromCatalog(): void
    {
        $catalog = $this->createMock(Catalog::class);
        $catalog->expects(self::once())
            ->method('priceFor')
            ->with('sku-1')
            ->willReturn(1250);

        $service = new PriceService($catalog);

        self::assertSame(1250, $service->priceFor('sku-1'));
    }
}
~~~

Use a real implementation for simple value objects and reserve mocks for meaningful boundaries.

