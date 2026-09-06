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
is served by the Next.js application. Original textures, sounds, images, fonts
and cursors are maintained only in this application's `public/` directory;
Vite copies them into `dist/`. Neither output directory is committed.

Run `pnpm dev` at the repository root for same-origin development with live
Vite sources. Run `pnpm lint:experiences` for both 3D applications. This legacy
JavaScript application is checked with ESLint and Vite, not the host's `tsc`.
The host bridge is shared through `@xm-games/experience-bridge`; do not duplicate
its message names or weaken the parent/source/origin validation.

Unused upstream templates, the superseded corridor implementation and one-off
patch scripts have been removed. Their previous versions remain in Git history.
