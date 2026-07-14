Do not trust the filename or the client-provided `Content-Type`. Set a Multer size limit and inspect the file's magic bytes with `file-type`/`mmmagic` before accepting it.

```ts
@Post()
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5_000_000 } }))
upload(@UploadedFile() file: Express.Multer.File) {
  const detected = await fileTypeFromBuffer(file.buffer);
  if (!detected || !['image/png', 'image/jpeg', 'application/pdf'].includes(detected.mime)) {
    throw new BadRequestException('Unsupported file type');
  }
  // store using a generated name, not the client filename
}
```

For large files, avoid `MemoryStorage`; stream to object storage or issue a signed URL and validate the object after upload.

