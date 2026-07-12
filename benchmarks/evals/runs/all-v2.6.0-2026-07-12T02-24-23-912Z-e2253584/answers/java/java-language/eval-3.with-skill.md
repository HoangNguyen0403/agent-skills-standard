Use a sealed interface to make the allowed variants compiler-checked:

```java
public sealed interface Payment
        permits Card, Cash, Voucher {
}

public record Card(String last4) implements Payment {
}

public record Cash() implements Payment {
}

public record Voucher(String code) implements Payment {
}
```

Java 21 can then use an exhaustive pattern-matching switch:

```java
static String describe(Payment payment) {
    return switch (payment) {
        case Card card -> "Card ending in " + card.last4();
        case Cash cash -> "Cash";
        case Voucher voucher -> "Voucher " + voucher.code();
    };
}
```

Because `Payment` is sealed, no other implementation can be passed as a `Payment`, and the compiler verifies that the switch handles every permitted variant. If the variants are only labels with no data or behavior, an `enum Payment { CARD, CASH, VOUCHER }` is the simpler choice.

