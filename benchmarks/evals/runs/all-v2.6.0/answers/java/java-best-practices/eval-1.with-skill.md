Refactor it to a Builder.

A constructor with 6 parameters is a strong signal that the call site is carrying too much positional meaning. It is hard to scan, easy to misorder, and usually gets worse over time.

In Java, a good default is:

- use a builder when an object has 4+ parameters
- keep fields private and final where possible
- validate required inputs up front
- make the built object immutable

Example:

```java
public final class ReportJob {
    private final String name;
    private final Path input;
    private final Path output;
    private final int retryCount;
    private final Duration timeout;
    private final boolean compress;

    private ReportJob(Builder builder) {
        this.name = Objects.requireNonNull(builder.name, "name");
        this.input = Objects.requireNonNull(builder.input, "input");
        this.output = Objects.requireNonNull(builder.output, "output");
        this.retryCount = builder.retryCount;
        this.timeout = Objects.requireNonNull(builder.timeout, "timeout");
        this.compress = builder.compress;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static final class Builder {
        private String name;
        private Path input;
        private Path output;
        private int retryCount = 3;
        private Duration timeout = Duration.ofSeconds(30);
        private boolean compress;

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder input(Path input) {
            this.input = input;
            return this;
        }

        public Builder output(Path output) {
            this.output = output;
            return this;
        }

        public Builder retryCount(int retryCount) {
            this.retryCount = retryCount;
            return this;
        }

        public Builder timeout(Duration timeout) {
            this.timeout = timeout;
            return this;
        }

        public Builder compress(boolean compress) {
            this.compress = compress;
            return this;
        }

        public ReportJob build() {
            return new ReportJob(this);
        }
    }
}
```

Call site becomes much clearer:

```java
ReportJob job = ReportJob.builder()
    .name("daily-report")
    .input(inputPath)
    .output(outputPath)
    .retryCount(5)
    .timeout(Duration.ofMinutes(2))
    .compress(true)
    .build();
```

Why this is better:

- argument names are visible at the call site
- optional values can have defaults
- required values can be validated in one place
- the resulting object can stay immutable

If some of the 6 parameters always travel together, another good refactor is to extract a small value object as well. But if your main pain is readability at construction time, builder is the cleanest first step.

