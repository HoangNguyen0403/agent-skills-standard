Use synchronization instead of unsafely sharing state—typically guard the counter with a `sync.Mutex`, or better yet have one goroutine own the counter and send increments over a channel.

