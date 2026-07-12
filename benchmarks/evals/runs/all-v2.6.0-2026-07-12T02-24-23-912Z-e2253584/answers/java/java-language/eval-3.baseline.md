Use a sealed interface when each payment kind may have different data:

```java
public sealed interface Payment
        permits Payment.Card, Payment.Cash, Payment.Voucher {

    record Card(String cardNumber) implements Payment {}

    record Cash() implements Payment {}

    record Voucher(String code) implements Payment {}
}
```

The compiler now permits only those three implementations. Java 21 can also exhaustively pattern-match them:

```java
static String describe(Payment payment) {
    return switch (payment) {
        case Payment.Card card -> "Card ending in " + card.cardNumber();
        case Payment.Cash cash -> "Cash";
        case Payment.Voucher voucher -> "Voucher " + voucher.code();
    };
}
```

If the variants need no data or behavior, an enum is simpler:

```java
public enum Payment {
    CARD, CASH, VOUCHER
}
```

