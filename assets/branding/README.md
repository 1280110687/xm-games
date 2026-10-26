# XM-Games pocket logo

The blue molded XM emblem follows the pocket launcher theme. The horizontal logo
and transparent icon master are the source artwork. Re-export the browser and
installed-app sizes with:

```sh
node scripts/generate-brand-icons.mjs
```

- `public/favicon.ico`: transparent 16, 32 and 48 pixel frames.
- `public/favicon-32.png`: transparent browser PNG fallback.
- `public/icons/xm-192.png` and `xm-512.png`: transparent standard PWA icons.
- `public/icons/xm-maskable-512.png`: opaque blue background; the white glyph fits
  inside the central 80% diameter safe circle.
- `public/icons/xm-apple-180.png`: opaque pale background for iOS home screens.

Generation mode: built-in ImageGen edit, using the horizontal logo as the reference.
Final icon prompt:

> Edit the supplied XM-Games logo into ONE standalone square app-icon master.
> The edit target is the left blue rounded-square XM emblem from the reference.
> Preserve its EXACT distinctive interlocking white X and M glyph geometry and
> their separate diagonal notch, the rounded terminals, royal-blue molded
> rounded-square body, controlled pale top highlight, and shallow darker blue
> lower bevel. Preserve the brand identity and silhouette. Remove the complete
> XM-Games wordmark and everything outside the emblem. Center the emblem on a
> square transparent canvas, frontal orthographic view, no perspective. Emblem
> occupies approximately 92% of the square with equal transparent margin on all
> four sides. High-resolution polished production asset with smooth clean
> antialiased edges, bold crisp white XM monogram readable at 16px, no extra
> objects, no captions, no watermark, no external cast shadow, no checkerboard
> drawn into the image. Transparent background with real alpha. This will be
> exported to browser favicon, 192/512 PWA, iOS home screen and maskable icon.
