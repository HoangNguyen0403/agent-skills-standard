---
name: laravel-background-processing
description: Build scalable asynchronous workflows using Queues, Jobs, and Events in Laravel. Use when implementing queued jobs, event-driven workflows, or async processing in Laravel.
metadata:
  triggers:
    files:
    - 'app/Jobs/**/*.php'
    - 'app/Events/**/*.php'
    - 'app/Listeners/**/*.php'
    keywords:
    - ShouldQueue
    - dispatch
    - batch
    - chain
    - listener
---
# Laravel Background Processing

## **Priority: P1 (HIGH)**

## Structure

```text
app/
├── Jobs/               # Asynchronous tasks
├── Events/             # Communication flags
└── Listeners/          # Task reactions
```

## Implementation Guidelines

### Queued Jobs

- **Job Creation**: Use **`php artisan make:job ProcessOrder`**. Classes must implement **`ShouldQueue`**.
- **Execution**: Implement logic inside **`handle()`** method. Pass only **model IDs** to constructor, not full Eloquent model.
- **Dispatching**: Trigger via **`ProcessOrder::dispatch($orderId)`**.

### Advanced Workflow Patterns

- **Job Chaining**: Use **`Bus::chain([new ProcessPayment($order), new SendReceipt($order)])->dispatch()`** for sequential dependencies. Handle failures with **`->catch(fn => ...)`**.
- **Job Batching**: Use **`Bus::batch([new ImportRow(1), ...])->then(...)->catch(...)->dispatch()`**. Use **`$this->batch()->cancel()`** to abort and track via **`$batch->progress()`**.

### Events & Listeners

- **Scaffolding**: Run **`php artisan make:event OrderPlaced`** and **`php artisan make:listener SendConfirmation --event=OrderPlaced`**.
- **Async Execution**: Add **`ShouldQueue`** to listeners to process them asynchronously.
- **Activation**: Trigger with **`Event::dispatch(new OrderPlaced($order))`**.

### Reliability & Monitoring

- **Error Handling**: Implement **`public function failed(Throwable $exception)`** in your job class. Use **`public int $tries = 3`** and **`public int $backoff = 60`** for retries.
- **Setup**: Run **`queue:failed-table`** migration to track dead jobs.
- **Monitoring**: Use **Laravel Horizon** (run **`php artisan horizon`**) for real-time observability; **never use `queue:work` in production**.

## Anti-Patterns

- **No heavy logic in request path**: Defer tasks >100ms to Queues.
- **No full model in job payload**: Pass IDs; Eloquent fetches on run.
- **No deep event listener chains**: Keep listener depth shallow.
- **No unmonitored queues**: Configure retries and Horizon alerts.

## References

- [Job Chaining & Event Patterns](references/implementation.md)