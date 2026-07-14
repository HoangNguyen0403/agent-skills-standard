Use a JUnit 5 parameterized test. `@ValueSource` is convenient when each case has one input value:

```java
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class MyCodeTest {

    @ParameterizedTest
    @ValueSource(ints = {1, 2, 3, 4, 5})
    void calculate_WithInput_ReturnsExpectedResult(int input) {
        int result = myCode.calculate(input);

        assertThat(result).isEqualTo(expectedResultFor(input));
    }
}
```

JUnit runs the same test once for each value, while keeping each invocation isolated. If each case needs multiple inputs or an explicit expected value, use `@CsvSource` instead:

```java
@ParameterizedTest
@CsvSource({
    "1, 10",
    "2, 20",
    "3, 30",
    "4, 40",
    "5, 50"
})
void calculate_WithInput_ReturnsExpectedResult(int input, int expected) {
    assertThat(myCode.calculate(input)).isEqualTo(expected);
}
```

