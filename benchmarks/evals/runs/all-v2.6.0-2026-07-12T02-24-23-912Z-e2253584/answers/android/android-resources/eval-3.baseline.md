Prefer XML vector drawables for simple icons and PNG or other raster assets when the artwork is inherently bitmap-based.

Use a vector drawable (`res/drawable/ic_*.xml`) when the icon is made from paths and needs to scale across screen densities. It gives one density-independent asset, usually stays crisp, can often be tinted, and is easier to theme. Android Studio can import SVG artwork and convert it to a vector drawable, but the SVG must use features supported by Android's vector format. Test the result on the minimum supported API level and on the devices you target.

Use PNGs in density-specific directories such as `drawable-mdpi`, `drawable-xhdpi`, and so on when the asset contains photographic detail, texture, complex effects, or animation frames that do not translate well to vector paths. Supply appropriately sized density variants so Android does not have to scale a low-resolution bitmap, and consider WebP for supported opaque or alpha-enabled raster artwork when file size matters.

Do not choose solely by file extension: compare rendered quality, APK size, startup/rendering cost, API compatibility, and maintainability. For launcher icons and adaptive icons, follow Android's dedicated `mipmap`/adaptive-icon conventions rather than treating them as ordinary in-app drawables.

