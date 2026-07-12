Prefer injecting `ConfigService` or a typed configuration provider. Direct `process.env` access scatters configuration logic, bypasses validation and defaults, makes testing harder, and can produce inconsistent parsing.

```ts
@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  send() {
    const host = this.config.getOrThrow<string>('mail.host');
    // use host
  }
}
```

Define and validate the configuration once, normalize booleans/numbers there, and use `getOrThrow` for required values. Direct access is reasonable only in the bootstrap/configuration module that builds the typed configuration object; do not read secrets or environment values repeatedly in business services.

