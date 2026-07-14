Profile: hybrid

Assumption: you’re adding a `Payments` module to a standard NestJS TypeScript application.

In NestJS, a Laravel service provider is usually split into:

- `@Injectable()` service: the actual application logic
- `@Module()` class: registers and exposes dependencies
- lifecycle hooks such as `OnModuleInit`: equivalent to provider boot-time setup

Create `payments.service.ts`:

```ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  charge(amount: number): string {
    return `Charging ${amount}`;
  }
}
```

Create `payments.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Module({
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
```

Register the module in `app.module.ts`:

```ts
import { Module } from '@nestjs/common';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [PaymentsModule],
})
export class AppModule {}
```

Consume it from another provider:

```ts
import { Injectable } from '@nestjs/common';
import { PaymentsService } from './payments/payments.service';

@Injectable()
export class OrdersService {
  constructor(private readonly paymentsService: PaymentsService) {}

  payOrder(): string {
    return this.paymentsService.charge(100);
  }
}
```

The Laravel equivalents are:

| Laravel | NestJS |
|---|---|
| Service provider | Module |
| `singleton()` binding | Provider in `providers` |
| `bind()` interface implementation | Token provider using `provide` and `useClass` |
| Provider `boot()` | `OnModuleInit` |
| Container visibility | `exports` and `imports` |

For boot-time setup:

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';

@Injectable()
export class PaymentsService implements OnModuleInit {
  onModuleInit() {
    // Equivalent to provider boot-time initialization
  }
}
```

By default, NestJS providers are singleton-scoped, similar to Laravel’s `singleton()`.
