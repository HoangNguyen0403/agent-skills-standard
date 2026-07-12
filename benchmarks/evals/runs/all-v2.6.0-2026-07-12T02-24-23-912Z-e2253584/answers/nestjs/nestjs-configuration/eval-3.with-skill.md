Avoid direct `process.env` access in services. Load and validate variables once through `ConfigModule.forRoot`, then inject `ConfigService` or a typed configuration object:

```ts
@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  send() {
    const host = this.config.getOrThrow<string>('MAIL_HOST');
    // use host...
  }
}
```

This centralizes validation, avoids magic strings, supports typed getters, and makes dependencies testable. Required values should be rejected at startup, and secrets should be supplied by the runtime rather than committed `.env` files.

