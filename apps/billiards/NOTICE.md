# Billiards — XM Games integration

Based on https://github.com/tailuge/billiards, fixed upstream commit
`2815ced943680f019bbd29f3b6f1c8997583d615` (2026-10-28 checkout).
Copyright the upstream billiards contributors. Distributed under GNU GPL v3;
the full license is in LICENSE. The physics, rules, cues, touch input and local
opponent are upstream code, maintained in `upstream/src/`.

XM Games changes (2026-10-28): independent offline entry and touch controls;
theme/locale/visibility bridge; procedural table materials; lifecycle pause;
local score handling; online lobby, uploads and sharing disabled.
Safari follow-up: viewport aspect is applied before camera pose fitting; narrow
iframes retain two control rows; power inputs stay stable through shot feedback
and retain their selected value without changing the original break physics.
Computer-match follow-up: preserve local shot controls across opponent turns,
deduplicate placement confirmation, retain ordered relay events through pauses,
and align turn/8-ball foul decisions for both players. Localized score labels
and foul explanations are rendered by the integration.
`src/` contains the integration source, `build.mjs` the build command.

Build: install the dependencies declared in package.json, then `pnpm build`.
The host runs `node scripts/build-billiards.mjs` to publish `dist/` and create
`source.tar.gz`, containing this modified corresponding source and build files.
The download is linked from the Billiards page together with LICENSE.txt.

Dependencies retain their own licenses: three (MIT), interactjs (MIT),
fflate (MIT), JSONCrush (MIT). esbuild is a build-only MIT dependency.
The game uses upstream procedural geometry and canvas ball textures. No
upstream model files, photographs, fonts, recorded audio or remote assets ship.
