Pest is a concise PHP testing framework built on PHPUnit. Install it with Composer, initialize it, write a test closure, and run the Pest binary.

~~~sh
composer require --dev pestphp/pest
./vendor/bin/pest
~~~

~~~php
it('adds two numbers', function (): void {
    expect(2 + 3)->toBe(5);
});
~~~

Use describe blocks and datasets for organization, and keep the test suite compatible with the project's supported PHP and PHPUnit versions.

