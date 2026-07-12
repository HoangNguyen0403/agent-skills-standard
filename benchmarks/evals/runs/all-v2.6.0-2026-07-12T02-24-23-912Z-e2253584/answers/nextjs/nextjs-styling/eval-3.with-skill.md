Use `next/image` and reserve space with `width`/`height` or `fill` in a container with a known position and aspect ratio. The intrinsic dimensions let the browser allocate layout space before the image loads, preventing CLS. Avoid a plain `<img>` without dimensions; also provide an accurate `sizes` value for responsive images.

