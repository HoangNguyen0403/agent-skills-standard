Install Horizon, configure Redis queues and supervisors in `config/horizon.php`, then run:

```bash
php artisan horizon
```

Protect the `/horizon` dashboard with its authorization gate and network/authentication controls. In production run Horizon under Supervisor, systemd, or a container orchestrator; do not rely on a terminal session. Set worker balancing, memory, timeout, tries, and queue priorities deliberately. On deploy, run `php artisan horizon:terminate` so the process manager starts workers with the new release. Monitor wait time, throughput, failures, retries, and process memory.

