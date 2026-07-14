Use Socket.IO's Redis adapter so every pod publishes events through Redis and clients connected to another pod receive them. Without it, a broadcast emitted on pod A is invisible to a client connected to pod B.

Create shared Redis pub/sub clients, configure `@socket.io/redis-adapter`, and authenticate the handshake in `handleConnection()` before joining rooms. Configure the load balancer for WebSocket upgrades and use sticky sessions if the chosen transport/session design requires them. Test cross-pod emits, reconnects, and Redis failure explicitly.

