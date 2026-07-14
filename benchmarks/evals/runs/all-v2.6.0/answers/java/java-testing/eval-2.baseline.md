Use a parameterized test. With JUnit 5, pass the five values to one test method:

```java
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CalculatorTest {
    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5})
    void calculatesExpectedResult(int input) {
        assertEquals(input * 2, Calculator.calculate(input));
    }
}
```

JUnit runs the method once for each value. Use `@CsvSource` for multiple arguments or `@MethodSource` when the inputs are more complex.

