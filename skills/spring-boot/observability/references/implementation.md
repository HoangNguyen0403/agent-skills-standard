# Observability Implementation Examples

## Structured Logging (Logback XML)

```xml
<!-- logback-spring.xml -->
<!-- Requires dependency: net.logstash.logback:logstash-logback-encoder -->
<configuration>
    <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <!-- Include TraceID/SpanID from MDC -->
            <includeMdcKeyName>traceId</includeMdcKeyName>
            <includeMdcKeyName>spanId</includeMdcKeyName>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON_CONSOLE" />
    </root>
</configuration>
```

## Trace Propagation (Async)

```java
@Configuration
@EnableAsync
public class AsyncConfig {
    // Wrap Executor to propagate Trace Context to new threads
    @Bean
    public Executor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(10);
        executor.initialize();
        return new ContextAwareTaskExecutor(executor); // or Micrometer wrapper
    }
}
```
