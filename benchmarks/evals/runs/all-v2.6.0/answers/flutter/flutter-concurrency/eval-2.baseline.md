Use them based on the kind of work you are doing and how much control you need.

`async` / `await`

Use this by default for normal asynchronous programming:

- HTTP requests
- reading files
- database calls
- timers
- chaining Futures in readable code

This is best for I/O-bound work. It does not create a new isolate and does not make CPU-heavy work run off the UI isolate. If you `await` a slow JSON decode or a tight loop, the UI can still stutter because the computation is still happening on the same isolate.

`Isolate.run`

Use this when you have a one-off CPU-heavy task that should not block the main isolate:

- parsing large JSON
- image/data processing
- expensive sorting/filtering
- generating reports

This is the simplest way to offload work. Think of it as: “run this computation elsewhere and give me the result back.” It is easier than manual isolate management and is a good fit when you just need a single request/response job.

`Isolate.spawn`

Use this when you need a long-lived worker isolate or more advanced communication:

- repeated background jobs
- producer/consumer pipelines
- custom message passing with `SendPort` / `ReceivePort`
- isolate lifecycle control
- multiple messages over time rather than one result

This gives you the most power, but also the most complexity. You must manage ports, startup, shutdown, error propagation, and protocol design yourself.

A practical rule of thumb:

- Start with `async` / `await` for I/O.
- Use `Isolate.run` for occasional heavy computation.
- Use `Isolate.spawn` when you need a dedicated worker that stays alive or handles multiple tasks.

Short comparison:

- `async` / `await`: simplest; same isolate; great for I/O; not enough for CPU-heavy work.
- `Isolate.run`: simple background computation; one task in, one result out.
- `Isolate.spawn`: manual and flexible; best for long-lived or interactive background workers.

If you are building a Flutter UI, the main concern is keeping frames smooth. So whenever the problem is “this computation makes the app janky,” that is the strongest signal to consider `Isolate.run` or, for more advanced cases, `Isolate.spawn`.

