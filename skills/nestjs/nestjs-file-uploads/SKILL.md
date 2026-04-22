---
name: nestjs-file-uploads
description: Validate and stream file uploads securely with Validation and S3 streaming in NestJS. Use when implementing secure file uploads, validation, or S3 streaming in NestJS.
metadata:
  triggers:
    files:
    - '**/*.controller.ts'
    keywords:
    - FileInterceptor
    - Multer
    - S3
    - UploadedFile
---
# File Upload Patterns

## **Priority: P0 (FOUNDATIONAL)**

- **Magic Bytes**: NEVER trust `content-type` header or file extension.
 - **Tool**: Use `file-type` or `mmmagic` to verify actual buffer signature.
- **Limits**: Set strict `limits: { fileSize: 5000000 }` (5MB) in Multer config to prevent DoS.

## Streaming (Scalability)

- **Memory Warning**: Default Multer `MemoryStorage` crashes servers with large files.
- **Pattern**: Use **Streaming** for any file > 10MB.
 - **Library**: `multer-s3` (direct upload to bucket) or `busboy` (raw stream processing).
 - **Architecture**:
 1. Client requests Signed URL from API.
 2. Client uploads directly to S3/GCS (Bypassing API server completely).
 3. **Pro Tip**: Only approach to scale file uploads infinitely.

## Processing

- **Async**: Don't process images/videos in HTTP Request.
- **Flow**:
 1. Upload file.
 2. Push `FileUploadedEvent` to Queue (BullMQ).
 3. Worker downloads, resizes/converts, and re-uploads.

## Anti-Patterns

- **No content-type trust**: Always verify file magic bytes; MIME header can spoofed.
- **No MemoryStorage for large files**: Use streaming or signed URL pattern for files > 10MB.
- **No synchronous file processing**: Offload image/video work to BullMQ workers via FileUploadedEvent.

## References