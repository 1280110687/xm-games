# XM-Games controller logo

The approved mark combines the XM letterforms with a charcoal game controller
and electric-blue controls. `xm-logo-horizontal.png` is the selected full logo;
`xm-mark-master.png` is the transparent standalone source. Re-export with:

```sh
node scripts/generate-brand-icons.mjs
```

- `public/icons/xm-controller.ico`: 16, 32 and 48 pixel favicon frames, each with
  a rounded light backing so the charcoal mark works on dark browser tabs.
- `public/favicon.ico`: identical conventional fallback.
- `public/icons/xm-controller-32.png`: browser PNG fallback.
- `public/icons/xm-controller-192.png` and `xm-controller-512.png`: standard PWA
  icons with an opaque `#f8fafc` background.
- `public/icons/xm-controller-maskable-512.png`: opaque maskable icon; the entire
  controller stays inside the central 80% diameter safe circle, with extra margin.
- `public/icons/xm-controller-apple-180.png`: opaque iOS home-screen icon.
- `public/images/brand/xm-controller-mark.png`: tightly cropped transparent
  256 × 119 mark for theme headers and the 3D clubhouse entrance sign.

The wide controller keeps its aspect ratio. Standard PWA and Apple exports use
84% width coverage; the maskable scale is derived from the actual silhouette.
The exported images match the approved icon preview byte for byte. At 16 pixels,
the blue controls become pixel accents rather than individually readable buttons.

Generation mode: built-in ImageGen edit of the selected horizontal logo, followed
by deterministic size export. Final transparent-extraction prompt:

> STRICT FAITHFUL EXTRACTION, NO DESIGN CHANGES. Extract only the left black-and-blue XM controller emblem from the supplied image, remove the complete right-side "XM-Games" text, and remove all ivory background including the inner triangular cutout. The original selected emblem is about 600 units wide by 285 units high: preserve that EXACT approximately 2.105:1 ratio and all relative dimensions. Do not make the emblem wider, flatter, taller, more symmetrical, more abstract, or more like a conventional controller. Preserve the original shared X and M contour point-for-point, the top notches and shoulders, the left diagonal and rounded left grip, the M counter and rounded right grip, the left blue cross, and exactly two blue round buttons on the right in their original sizes and locations. Match the original charcoal black and electric blue. Preserve the crisp flat graphic appearance. No effects, no gloss, no texture, no background, no wordmark, no frame, no new content.
>
> OUTPUT COMPOSITION IS SQUARE, for example 1024 by 1024 pixels, NOT landscape. In this square output the preserved wide emblem is centered with width about 940 pixels and height about 446 pixels, leaving about 289 completely transparent pixels ABOVE it and 289 completely transparent pixels BELOW it. Keep all that empty alpha space so the output canvas is SQUARE. Maintain the original emblem ratio rather than stretching it to fill the canvas. Both the exterior background and the original ivory internal negative spaces must be genuinely alpha transparent. This is an exact transparent master extraction for brand consistency, not an alternate version.
