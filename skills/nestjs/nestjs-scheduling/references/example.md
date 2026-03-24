# References

Move large code blocks here.

## Inline Examples

### Cron Decorator Pattern

```typescript
@Cron(CronExpression.EVERY_MINUTE)
@DistributedLock({ key: 'send_emails', ttl: 5000 })
async handleCron() {
  // Only runs if lock acquired
}
```

### Cron-to-Queue Offload

```typescript
// reports.service.ts
@Injectable()
export class ReportsService {
  constructor(@InjectQueue('reports') private reportsQueue: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  @DistributedLock({ key: 'daily_report', ttl: 60000 })
  async scheduleDailyReport() {
    try {
      await this.reportsQueue.add('generate', { date: new Date().toISOString() });
    } catch (err) {
      this.logger.error('Failed to schedule report', err);
    }
  }
}
```
