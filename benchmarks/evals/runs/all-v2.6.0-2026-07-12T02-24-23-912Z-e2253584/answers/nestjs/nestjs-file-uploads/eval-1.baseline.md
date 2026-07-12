Use Multer’s file validation at the controller boundary, but treat MIME type as an untrusted hint. `ParseFilePipe` can combine `MaxFileSizeValidator` and `FileTypeValidator`:

```ts
@Post('avatar')
upload(@UploadedFile(new ParseFilePipe({ validators: [
  new MaxFileSizeValidator({ maxSize: 5_000_000 }),
  new FileTypeValidator({ fileType: /^image\/(png|jpeg)$/ }),
]})) file: Express.Multer.File) {
  return this.service.store(file);
}
```

Set a Multer `limits.fileSize`, restrict accepted fields/counts, and validate the file signature/magic bytes after upload rather than trusting only the extension or client-provided `Content-Type`. Generate the stored name, keep uploads outside executable/public paths, scan when required, and reject dangerous archives/polyglots. Prefer streaming to object storage for large files and enforce request/body timeouts.

