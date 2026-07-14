Assumption: TypeScript API with a global exception handler.

Move the Postgres boundary into the infrastructure layer, replace sensitive details, and let the API layer map the safe error globally.

```ts
// infrastructure/orders-repository.ts
export class DatabaseOperationError extends Error {
  readonly code = 'DATABASE_OPERATION_FAILED';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'DatabaseOperationError';
  }
}

async function saveOrder(order: Order): Promise<void> {
  try {
    await db.query(/* ... */);
  } catch (error) {
    logger.error({ err: error }, 'Failed to save order'); // retain diagnostics internally

    throw new DatabaseOperationError(
      'The database operation could not be completed.',
      { cause: error },
    );
  }
}
```

Remove the controller’s raw error response:

```ts
// controller
try {
  return await service.createOrder(input);
} catch (error) {
  throw error; // or omit the catch entirely
}
```

Map errors at the API boundary:

```ts
// global exception filter / middleware
function handleError(error: unknown, res: Response): void {
  if (error instanceof ValidationError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_FAILED',
        message: error.message,
      },
    });
    return;
  }

  if (error instanceof DatabaseOperationError) {
    res.status(500).json({
      error: {
        code: error.code,
        message: 'An internal error occurred.',
      },
    });
    return;
  }

  logger.error({ err: error }, 'Unhandled API error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred.',
    },
  });
}
```

Keep domain errors pure business errors—never attach HTTP status codes there. Do not expose Postgres messages, SQL, connection details, or stack traces. Do not swallow errors: every `catch` must log, wrap, rethrow, or deliberately map the failure.
