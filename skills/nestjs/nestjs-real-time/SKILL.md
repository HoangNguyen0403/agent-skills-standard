---
name: nestjs-real-time
description: Implement WebSocket gateways with Socket.io and Server-Sent Events endpoints in NestJS. Use when building chat features, live feeds, or choosing between WebSocket and SSE for real-time communication.
metadata:
  triggers:
    files:
    - '**/*.gateway.ts'
    - '**/*.controller.ts'
    - 'Socket.io'
    keywords:
    - WebSocketGateway
    - SubscribeMessage
    - Sse
---
# Real-Time & WebSockets

## **Priority: P1 (OPERATIONAL)**


## Workflow: Add Real-Time Feature

1. **Choose protocol** — WebSocket for bi-directional (chat, collab); SSE for uni-directional (feeds, notifications).
2. **Implement gateway or SSE** — Create `@WebSocketGateway()` or `@Sse()` controller.
3. **Add auth** — Validate JWT in `handleConnection()` for WebSocket; use standard guards for SSE.
4. **Scale** — Add `@socket.io/redis-adapter` for multi-pod WebSocket; use HTTP/2 for SSE.
5. **Test connections** — Verify WebSocket handshake auth rejects invalid tokens; confirm SSE streams data.

## SSE Endpoint Example

See [implementation examples](references/example.md)

## WebSocket Gateway with Auth Example

See [implementation examples](references/example.md)

## Protocol Selection

- **WebSockets (Bi-directional)**: Use for Chat, Multiplayer Games, Collaborative Editing.
 - _High Complexity_: Requires custom scaling (Redis Adapter) and sticky sessions (sometimes).
- **Server-Sent Events (SSE) (Uni-directional)**: Use for Notifications, Live Feeds, Tickers, CI Log streaming.
 - _Low Complexity_: Standard HTTP. Works with standard Load Balancers. Easy to secure.
 - _NestJS_: Use `@Sse('route')` returning `Observable<MessageEvent>`.
- **Long Polling**: Use **only** as fallback or for extremely low-frequency updates (e.g., job status check every 10m).
 - _Impact_: High header overhead. Blocks threads if not handled carefully.

## WebSockets Implementation

- **Socket.io**: Default choice. Features "Rooms", "Namespaces", and automatic reconnection. Heavy protocol.
- **Fastify/WS**: Use `ws` adapter if performance critical (e.g., high-frequency trading updates) and you don't need "Rooms" logic.

## Scaling (Critical)

- **WebSockets**: In K8s, client connects to Pod . If Pod B emits event, client won't receive it.
 - **Solution**: **Redis Adapter** (`@socket.io/redis-adapter`). Every pod publishes to Redis; Redis distributes to all other pods.
- **SSE**: Stateless. No special adapter needed, but aware of **Connection Limits** (6 concurrent connections per domain in HTTP/1.1; virtually unlimited in HTTP/2).
 - **Rule**: Must use **HTTP/2** for SSE at scale.

## Security

- **Handshake Auth**: Standard HTTP Guards don't trigger on Ws connection efficiently.
 - **Pattern**: Validate JWT during `handleConnection()` lifecycle method. Disconnect immediately if invalid.
- **Rate Limiting**: Sockets expensive. Apply strict throttling on "Message" events to prevent flooding.

## Architecture

- **Gateway != Service**: `WebSocketGateway` should **only** handle client comms (Join Room, Ack message).
 - **Rule**: Delegate business logic to Service or Command Bus.
- **Events**: Use `AsyncApi` or `SocketApi` decorators (from community packages) to document WS events similarly to OpenAPI.


## Anti-Patterns

- **No HTTP guards for WebSocket auth**: Validate JWT in `handleConnection()`; HTTP guards don't trigger on WS.
- **No WebSocket at scale without Redis adapter**: Without `@socket.io/redis-adapter`, cross-pod events lost.
- **No SSE over HTTP/1.1 at scale**: Use HTTP/2 to avoid 6-connection-per-domain browser limit.