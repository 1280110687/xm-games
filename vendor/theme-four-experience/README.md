# Theme Four WebGL Experience

This isolated Vite module preserves the React Three Fiber entrance, corridor,
camera and room interactions from `ITomPoland/portfolio-itom` for XM-Games
Theme Four. The host Next.js application owns theme selection, localization and
game routing; the iframe owns only the WebGL scene.

The upstream code is MIT-licensed; its copyright notice is retained in
`LICENSE`. Upstream personal images, textures and copy remain subject to the
additional reuse restriction in the upstream README. Confirm permission before
publishing those assets outside local review.

Build the module from the repository root with `pnpm run build:theme-four`.
The generated bundle is synchronized into `public/theme-four-experience/` and
is served by the Next.js application beside the copied scene assets.
