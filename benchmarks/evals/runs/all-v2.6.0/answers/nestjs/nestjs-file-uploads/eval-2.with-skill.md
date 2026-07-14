Do not buffer large uploads in Multer `MemoryStorage`. For files over roughly 10 MB, have the API issue a short-lived signed S3/GCS URL and let the client upload directly, or stream through `busboy`/`multer-s3` with strict size limits.

The API should authenticate the upload request, constrain size and allowed types, generate object keys server-side, and avoid trusting MIME headers. If the API must proxy the stream, apply backpressure and never retain the complete file in the Node heap. Direct uploads remove the API process from the large-payload data path and scale better across pods.

