# Classic Games Design QA

## References

- Tetris: https://chvin.github.io/react-tetris/
- 2048: https://mgarciaisaia.github.io/2048/
- Local production preview: `http://127.0.0.1:3100`

The implementation reproduces the references' core visual language and
interactions inside the existing XM-Games navigation, locale, theme and offline
constraints. No remote assets are hot-linked.

## Evidence

- Tetris source, mobile: `.design-qa-evidence/tetris-source-mobile.png`
- Tetris Theme 1, 320×568:
  `.design-qa-evidence/tetris-local-theme1-320x568.png`
- Tetris Theme 2, 320×568:
  `.design-qa-evidence/tetris-local-theme2-320x568.png`
- Tetris Theme 2, 390×844:
  `.design-qa-evidence/tetris-local-theme2-390x844.png`
- Tetris side-by-side comparison:
  `.design-qa-evidence/tetris-reference-vs-local-390x844.png`
- 2048 source, mobile: `.design-qa-evidence/2048-source-mobile.png`
- 2048 Theme 1, 320×568:
  `.design-qa-evidence/2048-local-theme1-320x568.png`
- 2048 Theme 2, 320×568:
  `.design-qa-evidence/2048-local-theme2-320x568.png`
- 2048 Theme 2, 390×844:
  `.design-qa-evidence/2048-local-theme2-390x844.png`
- 2048 side-by-side comparison:
  `.design-qa-evidence/2048-reference-vs-local-390x844.png`

## Viewport and layout checks

| Surface | Viewport | Key measurements | Result |
| --- | --- | --- | --- |
| Tetris Theme 1 | 320×568 | Device 305.6×398.7; board 109.2×216.4 | No overflow or clipping |
| Tetris Theme 2 | 320×568 | Device 305.6×390.9; board 107.5×213.1; tab bar begins at y=496.8 | No overlap with tab bar |
| Tetris Theme 2 | 390×844 | Device 375.6×502.8; board 149.2×296.4 | Full 10×20 board visible |
| 2048 Theme 1 | 320×568 | Board 276×276 | No overflow or clipping |
| 2048 Theme 2 | 320×568 | Board 240×240; tab bar begins at y=496.8 | Controls and board visible |
| 2048 Theme 2 | 390×844 | Board 320×320; tab bar begins at y=772.8 | Full page remains one screen |

All checked pages reported document dimensions equal to the viewport. Tetris
direction and utility controls measure at least 44×44 CSS pixels; 2048
direction controls measure 48×44 CSS pixels.

## Fidelity comparison

- Tetris uses the reference's yellow handheld body, monochrome LCD, 10×20
  matrix, next-piece panel, green/red utility keys, blue drop key and circular
  direction controls. XM-Games keeps its own header and Theme 2 tab bar.
- 2048 uses the reference's `#faf8ef` page, `#bbada0` board, warm numbered-tile
  palette, compact score blocks, square corners and original heading hierarchy.
- Theme 1 is a separate dark arcade composition. Theme 2 uses the bright
  handheld/original-2048 composition rather than recoloring the same card
  layout.
- The first comparison pass found undersized Tetris controls and a small
  390-pixel LCD. The final pass increased the LCD and normalized every mobile
  control target to at least 44 CSS pixels.
- The 2048 title tracking and short-height board scale were adjusted after the
  first comparison to retain the source hierarchy without colliding with the
  XM-Games tab bar.

## Interaction and state checks

- Tetris: start, falling state, rotate, left/right/down, hard drop, pause,
  resume, restart, sound toggle, disabled idle controls and next-piece updates.
- 2048: keyboard movement, pointer swipe, new-tile generation, restart, score
  display, best-score compatibility, win overlay, continue and game-over
  overlay.
- A real horizontal swipe on the mobile board changed the 2048 state from two
  tiles to three tiles.
- Theme switching was exercised from both the game header and `/settings`.
- Final browser console checks for both routes returned no warnings or errors.

## Automated checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 16 files, 97 tests
- `pnpm build` — all 18 application routes statically generated

## Result

passed
