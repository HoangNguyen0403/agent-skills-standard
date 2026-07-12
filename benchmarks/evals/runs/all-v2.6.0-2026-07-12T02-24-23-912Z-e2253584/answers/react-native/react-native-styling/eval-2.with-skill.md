Use Flexbox as the default layout, with flex and percentage-based dimensions instead of fixed widths. Read the current size with useWindowDimensions when a breakpoint or calculation is necessary, and recompute when the window changes; Dimensions can be used when a one-time measurement is sufficient.

Centralize spacing and typography in theme constants, use Platform.select for platform differences, and avoid absolute positioning unless it is essential. Test narrow, wide, rotated, and accessibility text-size layouts rather than relying on one device size.



