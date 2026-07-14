Make the request only persist the upload and enqueue a `FileUploadedEvent`; do not resize or transcode inside the HTTP handler.

```ts
await files.saveMetadata(fileId, objectKey);
try {
  await queue.add(FILE_UPLOADED, { fileId, objectKey }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
} catch (error) {
  await files.markProcessingEnqueueFailed(fileId, error);
}
return { fileId, status: 'queued' };
```

A BullMQ worker downloads the object, processes it, validates the result, and re-uploads it. Keep upload limits and magic-byte validation at the boundary, and make the worker idempotent.

