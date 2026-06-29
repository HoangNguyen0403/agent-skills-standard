# Async Boundaries

## Default rule

- Async orchestration should call async-native adapters.
- If a library is sync-only, isolate it behind one `asyncio.to_thread` wrapper.

## Review checklist

- Does `async def` call `subprocess.run`, sync DB, or sync HTTP directly?
- Are timeout and cancellation surfaced, logged, or tested?
- Does the loop have cleanup and stop ownership?
