# Next.js Self-Hosting Standard

Optimization and configuration for hosting Next.js outside of Vercel (Docker/Nodes).

## **1. Standalone Output**

Mandatory for production containers.

```js
// next.config.js
module.exports = { output: 'standalone' };
```

- **Copy**: You must manually copy `public/` and `.next/static/` into the `standalone/` directory's respective folders for them to be served correctly.

## **2. Distributed Caching (ISR)**

Filesystem cache breaks in multi-instance deployments. Use a shared Cache Handler.

```js
// next.config.js
module.exports = {
  cacheHandler: require.resolve('./cache-handler.js'),
  cacheMaxMemorySize: 0, // Disable local instance memory cache
};
```

**Storage Options**:

- **Redis**: Recommended for most apps.
- **S3**: Good for high-volume static assets.

## **3. Environment Variables**

- **NEXT*PUBLIC***: Baked into the JS bundle at **Build Time**.
- **Server-only**: Loaded at **Runtime** from the environment.

## **4. Image Optimization**

- **Built-in**: Works in Docker but requires `sharp`.
- **External Loader**: Recommended for scale (Cloudinary, Imgix, or Akamai).
  ```js
  // next.config.js
  module.exports = { images: { loader: 'custom' } };
  ```
