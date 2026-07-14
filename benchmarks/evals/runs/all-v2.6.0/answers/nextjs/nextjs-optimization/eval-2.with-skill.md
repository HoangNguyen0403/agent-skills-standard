Replace the Google Fonts `<link>` with `next/font`, preferably a self-hosted or package font, and apply the generated class from the layout. `next/font` handles loading and font-display behavior without a third-party head link, reducing layout shift and flashes of unstyled text. Verify CLS and font loading in the browser after the change.

