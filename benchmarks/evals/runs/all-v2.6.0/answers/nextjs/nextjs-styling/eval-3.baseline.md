Add explicit dimensions so the browser can reserve space before the image loads:

```html
<img
  src="/images/hero.jpg"
  alt="Hero"
  width="1200"
  height="675"
  style="width: 100%; height: auto;"
>
```

For responsive containers, preserve the aspect ratio with CSS:

```css
.image-container {
  aspect-ratio: 1200 / 675;
  overflow: hidden;
}

.image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

If using a framework image component, provide its equivalent `width` and `height` props, or use a documented `fill`/responsive mode with a positioned parent that has an explicit aspect ratio or height.
