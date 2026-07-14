Install Horizon, publish its configuration, and use Redis as the queue connection. Configure supervisors in `config/horizon.php` with queue names, process counts, balancing, retry count, and timeouts appropriate to each workload.

Run Horizon with `php artisan horizon`; in production keep it alive with Supervisor/systemd or a process manager. Define the Horizon authorization gate for the dashboard, expose `/horizon` only to trusted operators, and protect it with authentication. Deploy safely by using `php artisan horizon:terminate` so workers finish their current job and are restarted with new code. Monitor throughput, wait time, failures, memory, and long-running jobs rather than treating the dashboard as a substitute for alerting.

