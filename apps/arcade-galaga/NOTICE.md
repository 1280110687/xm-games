# XM Games · Galaga / 星阵突击

Adapted from C0deWiz4rd010/retro-pocket-games (MIT), commit
`db390f29ee21eef87d3ece2fa32811aea4f29e7c`, retrieved 2026-10-28.
The original Galaga game module, seeded RNG and math helpers are retained in
`upstream/`. The collection shell and its remote fonts are not bundled.

XM Games modifications: isolated full-viewport entry, responsive touch controls,
localized HUD, synthesized sound, theme-owned colors, pause/disposal lifecycle
and a read-only diagnostic snapshot. Portrait reaction space retains the original
600 logical pixel height; a short spawn/hit grace period avoids consecutive mobile
collisions consuming every life. The formation/diving enemies, collisions,
waves, power-ups, score and particles are the upstream gameplay.

All artwork is drawn using Pixi Graphics. No external imagery or recorded audio
is included. PixiJS retains its own MIT license (THIRD_PARTY_LICENSES.txt).
Runtime dependency notices are collected from the actual bundle inputs. The
@pixi/colord npm archive omits its license file; its upstream Colord MIT license
is retained in upstream/LICENSE-colord.txt (license blob
e437003733acd123c76c2a9df0c13a6f3b02b51e).
