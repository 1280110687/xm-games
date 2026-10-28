# Pinball Schminball attribution

Source: https://github.com/igorski/pinball-schminball
Pinned source commit: 9dbf8a612f9b5d3bf4e3c27768ff0e2cebe77399
Copyright Igor Zinken 2021–2024. MIT source license reproduced in LICENSE and source headers.

XM retains the Matter/zCanvas engine, actor system, flipper constraints, poppers, scoring, trigger groups, underworld, multiball and two table mechanism definitions. The Vue site shell is replaced with an embedded responsive shell. The upstream bitmap backgrounds, sprites, SVG collision assets, fonts, sound effects and streamed music are not distributed or requested. XM supplies original procedural table artwork, ball/flipper sprites, synthesized effects and programmatic rail geometry. Consequently table boundaries differ from the original art. Launcher direction and force are adjusted for the new open rail layouts to prevent trapping in an absent original launcher lane. The MIT TypeScript mechanism placements are retained.

Runtime dependencies have their own licenses: Matter.js MIT, matter-attractors MIT, zCanvas MIT. Dependency license notices are retained by esbuild legal comments.

Integration fixes include circular actor alignment, finite anchored flipper travel, pausable game timers and single pending round settlement so nudging a drained ball cannot charge a second ball.
