# Optimized Docker image

Use a reproducible multi-stage build or Spring Boot layered-jar support. Build in a JDK image, copy dependency layers before application layers for cache reuse, and run in a smaller JRE or distroless image. Spring Boot `layertools`, buildpacks, or Jib can provide this without fragile hand-written extraction.

Run as a non-root user with only required runtime files, set a clear entrypoint, use container-aware JVM/resource settings, emit logs to stdout/stderr, and support graceful shutdown. Pin and regularly update base images, scan the result, and never bake secrets into image layers. Test startup, signal handling, health behavior, architecture, and memory limits in CI.



