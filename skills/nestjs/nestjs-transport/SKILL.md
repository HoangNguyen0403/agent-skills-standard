---
name: nestjs-transport
description: "Configure gRPC, RabbitMQ, and monorepo contract patterns for NestJS microservices. Use when setting up gRPC service-to-service calls, RabbitMQ event-driven messaging, shared contract libraries, or microservice exception handling in NestJS. (triggers: main.ts, **/*.controller.ts, Transport.GRPC, Transport.RMQ, MicroserviceOptions)"
---

# Microservices & Transport Standards

## **Priority: P0 (FOUNDATIONAL)**

Microservices communication patterns and transport layer standards.

- **Synchronous (RPC)**: Use **gRPC** for low-latency, internal service-to-service calls (10x faster than REST/JSON).
- **Asynchronous (Events)**: Use **RabbitMQ** or **Kafka** for decoupling domains via fire-and-forget (`emit()`).

## gRPC Setup

See [implementation examples](references/example.md)

## RabbitMQ Setup

See [implementation examples](references/example.md)

## Monorepo Contracts

- Store all DTOs, `.proto` files, and Interfaces in `libs/contracts`.
- Services never import from sibling services — only from `contracts`.
- Semantic versioning of messages is mandatory. Never change a field type; add a new field.

## Exception Handling

Standard `HttpException` is lost over RPC/TCP. Use `RpcException` with global filters:

See [implementation examples](references/example.md)

## Serialization

- Apply `useGlobalPipes(new ValidationPipe({ transform: true }))` in `MicroserviceOptions` setup, not just HTTP.

## Anti-Patterns

- **No cross-service imports**: Services must import only from `libs/contracts`, never from sibling services.
- **No HttpException in RPC**: Use `RpcException` with a global `RpcExceptionFilter` for microservice errors.
- **No unversioned message schema**: Add new fields; never change existing field types — consumers will break.
