# Classic Games Design QA

## References

- Tetris: https://chvin.github.io/react-tetris/
- 2048: https://mgarciaisaia.github.io/2048/
- Local production preview: `http://127.0.0.1:3900`

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
- Mobile re-audit evidence:
  `.design-qa-evidence/mobile-audit/`
- Mobile before/after comparisons:
  `18-tetris-before-after.png`, `19-bingo-before-after.png`,
  `20-bingo-cards-before-after.png`, `23-mobile-before-after-overview.png`
- Restored Bingo inline layout:
  `.design-qa-evidence/mobile-audit/25-bingo-restored-final-390x844.png`
- Bingo cards Theme 1, single-column mode, 390×844:
  `.design-qa-evidence/mobile-audit/30-bingo-cards-theme-one-single-390x844.png`
- Bingo cards Theme 1, two-column mode, 390×844:
  `.design-qa-evidence/mobile-audit/31-bingo-cards-theme-one-double-390x844.png`
- Bingo cards reference and final two-column comparison, normalized to
  375×855 CSS pixels:
  `.design-qa-evidence/mobile-audit/33-bingo-cards-reference-vs-double-375x855.png`
- Bingo cards Theme 2, 320×700:
  `.design-qa-evidence/mobile-audit/28-bingo-cards-theme-two-double-320x700.png`,
  `.design-qa-evidence/mobile-audit/29-bingo-cards-theme-two-single-320x700.png`
- Bingo cards reversible marks and completed-card treatment:
  `.design-qa-evidence/mobile-audit/37-bingo-cards-mark-undo-final-theme-one-390x844.png`,
  `.design-qa-evidence/mobile-audit/38-bingo-cards-mark-undo-final-theme-two-390x844.png`,
  `.design-qa-evidence/mobile-audit/39-bingo-cards-mark-undo-final-theme-two-320x700.png`
- Bingo cards mark/Bingo reference and final comparison:
  `.design-qa-evidence/mobile-audit/41-bingo-cards-mark-undo-reference-vs-final-375x855.png`

## Viewport and layout checks

| Surface | Viewport | Key measurements | Result |
| --- | --- | --- | --- |
| Tetris Theme 1 | 320×568 | Device 305.6×494.8; board 109.2×216.4 | Fills the available game viewport |
| Tetris Theme 1 | 390×844 | Device 375.6×770.8; board 189.2×376.4 | Fills the available game viewport |
| Tetris Theme 2 | 320×568 | Full viewport and controls remain visible | No overlap with tab bar |
| Tetris Theme 2 | 390×844 | Device 375.6×716.8; board 189.2×376.4; tab bar begins at y=772.8 | Full 10×20 board visible |
| 2048 Theme 1 | 320×568 | Board 276×276 | No overflow or clipping |
| 2048 Theme 2 | 320×568 | Board 240×240; tab bar begins at y=496.8 | Controls and board visible |
| 2048 Theme 2 | 390×844 | Board 320×320; tab bar begins at y=772.8 | Full page remains one screen |

All checked pages reported document dimensions equal to the viewport. Tetris
direction and utility controls measure at least 44×44 CSS pixels; 2048
direction controls measure 48×44 CSS pixels.

## Mobile layout re-audit

- The user-provided Tetris, Bingo draw and Bingo cards captures were retained
  alongside final screenshots in `.design-qa-evidence/mobile-audit/`.
- Tetris now stretches its handheld shell through the available mobile game
  viewport while preserving a complete 10×20 board on short screens.
- Bingo draw is forced into a single-column mobile flow. Bingo cards now uses
  the full content width and its empty state no longer expands into a tall
  blank panel.
- Theme 1 header controls use matching 44×44 circular targets. Compact language
  mode shows one globe icon without a redundant select chevron.
- All 14 game routes were checked at 320×568 and 390×844 in both themes.
  Theme 1 and Theme 2 reported viewport-matched document dimensions, no clipped
  focusable controls and no button-label overflow. Theme 2 fixed-play surfaces
  end above its bottom navigation.
- Chinese and Thai locale checks included the narrow Go action row; its compact
  layout no longer overflows at 320 pixels.

## Bingo inline layout restoration

- Restored the last pre-dialog information structure from `eede7b5`: current
  draw, settings, automatic interval, recent draws and the full number board
  are all rendered directly in the page.
- Removed the mobile settings and number-board dialogs without changing the
  draw, speech, timer or reset state model.
- Bingo remains a single mobile column, but now uses an intentional internal
  page scroll instead of stretching an empty draw card to the viewport.
- Verified direct draw and automatic-mode interaction at 320×568 and 390×844
  in both themes. Chinese and Thai labels produced no horizontal overflow.
- Theme 2 retains a 71-pixel clear area between the number board and its fixed
  bottom navigation at the end of the scroll region.

## Bingo cards responsive layout QA

### Comparison target and normalization

- Source visual truth:
  `/var/folders/n3/hfzr5zl578v260_gjmv9br580000gn/T/codex-clipboard-8c30d1e5-bad5-4ce2-9557-df02df44ca5c.png`
  (750×1710 pixels, treated as a 375×855 CSS-pixel capture at 2× density).
- Final implementation:
  `.design-qa-evidence/mobile-audit/32-bingo-cards-theme-one-double-375x855.png`
  (375×855 pixels, 375×855 CSS viewport at 1× density).
- Full-view normalized comparison:
  `.design-qa-evidence/mobile-audit/33-bingo-cards-reference-vs-double-375x855.png`
  (source downsampled to 375×855 and placed beside the 1× implementation).
- State: Theme 1, Chinese, four generated cards, two-column `2×2` mode.
  Secondary captures cover single-column `1×1` mode and Theme 2 at 320 pixels.
- A separate focused crop was not needed: the normalized 375-pixel comparison
  keeps the complete toolbar, layout selector, card headings and all 5×5 cells
  legible. The 320-pixel Theme 2 captures provide the narrowest focused check.

### Findings and comparison history

- Initial reference finding (P1): the number input and four actions occupied one
  crowded row; the second card was clipped by an implicit horizontal carousel.
- Initial reference finding (P2): the controls card reserved excessive empty
  vertical space while offering no explicit layout choice.
- Fix: split input/confirmation, utility actions and summary/layout selection
  into three compact rows; removed inherited card padding; replaced the
  horizontal flow with persistent explicit `1×1` and `2×2` grid modes.
- Post-fix evidence: the normalized comparison shows both cards fully contained,
  balanced action spacing and materially reduced dead space. No actionable
  P0/P1/P2 finding remains.
- Required fidelity surfaces:
  - Typography keeps the existing XM-Games font hierarchy and remains legible
    in both layouts.
  - Spacing uses 44-pixel controls, consistent row gaps and centered single-card
    columns.
  - Theme 1 dark-neon and Theme 2 iOS-light tokens remain independent.
  - No raster imagery is present; existing icon-library glyphs remain sharp.
  - Chinese, English and Thai layout labels are complete; Thai replacement
    characters were removed.

### Responsive and interaction checks

| Theme / viewport | Mode | Measured result |
| --- | --- | --- |
| Theme 1, 390×844 | `1×1` | One 375.6-pixel card column; no document overflow |
| Theme 1, 390×844 | `2×2` | Two 183.8-pixel columns; 44-pixel layout controls |
| Theme 1, 768×900 | `1×1` / `2×2` | Centered 672-pixel single column / two 360-pixel columns |
| Theme 2, 320×700 | `1×1` | One 305.6-pixel column; internal list scroll remains above tab bar |
| Theme 2, 320×700 | `2×2` | Two 148.8-pixel columns; list bottom equals tab-bar top |
| Theme 2, 768×900 | `1×1` / `2×2` | Centered 672-pixel single column / two 361.2-pixel columns |

- Exercised adding four cards and switching both layouts without recreating
  card or marked-number state.
- Reload retained the selected layout through the versioned local preference.
- Chinese and Thai narrow-width checks produced no label or document overflow.
- Final browser console inspection returned no warnings or errors.

## Bingo cards mark undo and completion QA

### Comparison target and normalization

- Source visual truth:
  `/var/folders/n3/hfzr5zl578v260_gjmv9br580000gn/T/codex-clipboard-ba0176e8-60a5-455f-a3e6-e0477ab2e090.png`
  (750×1710 pixels, treated as 375×855 CSS pixels at 2× density).
- Final Theme 1 implementation:
  `.design-qa-evidence/mobile-audit/40-bingo-cards-mark-undo-final-theme-one-375x855.png`
  (375×855 pixels, 375×855 CSS viewport at 1× density).
- Full-view normalized comparison:
  `.design-qa-evidence/mobile-audit/41-bingo-cards-mark-undo-reference-vs-final-375x855.png`.
- State: Chinese, Theme 1, four cards, two-column mode, five marked
  numbers and one completed Bingo card. Random card contents differ between the
  source and implementation, so comparison focuses on equivalent marked and
  completed states rather than matching number values.
- The direct 390×844 Theme 1 and Theme 2 captures serve as focused evidence:
  the 27.4-pixel circular markers, badge, inset border and undo buttons are all
  readable at 1× density. A separate crop was not required.

### Findings and comparison history

- Initial reference finding (P1): marked numbers had no individual undo path;
  correcting one mistake required clearing every mark.
- Initial reference finding (P2): a full green cell background made marked
  numbers visually heavy and did not match the requested red circular marker.
- Initial reference finding (P2): the completed-card ring and offset were drawn
  outside the card, so the scroll container clipped the top and side edges.
- Fix: marked-list entries and marked card cells are now localized buttons that
  remove only their number. Card cells retain their neutral square surface and
  render a solid red circular number marker. Completed cards use a semantic
  `data-bingo` state with a two-pixel border inset by one pixel, plus a separate
  non-truncating Bingo badge.
- Post-fix evidence: every edge of the completed card is visible in Theme 1 and
  Theme 2 at 320, 375 and 390 pixels. No actionable P0/P1/P2 finding remains.
- Required fidelity surfaces:
  - Typography keeps the existing hierarchy; compact Bingo badges remain
    legible without reducing the 44-pixel delete target.
  - Spacing preserves the 1×1/2×2 grids and keeps the completion border inside
    each card.
  - Theme 1 uses red arcade markers and an illuminated amber inset; Theme 2
    uses iOS red and iOS orange with a lighter shadow treatment.
  - No new raster assets were required; all icons remain from the existing
    icon library.
  - Chinese, English and Thai undo labels are available to assistive
    technologies.

### Responsive and interaction checks

| Theme / viewport | Measured result |
| --- | --- |
| Theme 1, 390×844 | Red marker 27.4×27.4 with 50% radius; 2px inset Bingo border; no document overflow |
| Theme 2, 390×844 | iOS red marker 27.4×27.4; all five 44–47px undo pills visible |
| Theme 2, 320×700 | Red marker 20.4×20.4; 44×44 delete controls; list bottom equals tab-bar top |
| Theme 2, 768×900 | Two 361.2px card columns; 30.4×30.4 red markers; no overflow |

- Clicking a marked-number undo pill removed that number from every card,
  changed the count from five to four and removed the affected Bingo state.
- Clicking the red marker inside the card produced the same global, idempotent
  undo behavior.
- Re-entering the withdrawn number restored the mark and Bingo state.
- Pure tests cover immutable single-number removal, repeated removal, final
  number removal and Bingo loss after withdrawing a completed-row number.
- Final browser console inspection returned no warnings or errors.

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
- `pnpm test` — 17 files, 103 tests
- `pnpm build` — all 19 application routes statically generated

## Theme 3: obsidian glass workspace

### Source and implementation evidence

- Source visual truth:
  `.design-qa-evidence/theme-three/source-reference-landscape.jpg`
  (2291×1440 pixels).
- Final desktop implementation:
  `.design-qa-evidence/theme-three/theme-three-home-desktop-final.png`
  (1440×900 CSS pixels at 1× density).
- Normalized full-view comparison:
  `.design-qa-evidence/theme-three/theme-three-comparison.png`
  (reference and implementation, each normalized to 1440×900).
- Focused metrics, workbench and stacked-card comparison:
  `.design-qa-evidence/theme-three/theme-three-comparison-focused.png`.
- Responsive evidence:
  `.design-qa-evidence/theme-three/theme-three-home-tablet-1024.png`,
  `.design-qa-evidence/theme-three/theme-three-home-mobile-final.png`,
  `.design-qa-evidence/theme-three/theme-three-home-mobile-320-final.png`.
- Game cockpit evidence includes final 390×844 captures for Bingo, Tetris,
  Neon Breaker, Memory Match, Sudoku and Snake in the same directory.
- State: Theme 3, Chinese locale, initial local game state and empty tracker.
  The reference and implementation contain different product data, so the
  comparison evaluates the requested visual system, hierarchy and composition.

### Comparison history and fixes

- First pass matched the black canvas, silver-edged glass, restrained neon
  green, permanent sidebar, dense metrics and central stacked-card focal point.
- P1 responsive finding: Bingo and Neon Breaker extended beneath the mobile
  dock, while Memory Match, Snake, Minesweeper and Sudoku were close to or over
  the viewport boundary. Fix: each game now has an independent compact cockpit;
  the complete Bingo number board scrolls inside its visible panel.
- P1 layout finding: the desktop dashboard was 39 pixels taller than the
  reference viewport. Fix: reduced the workbench and card-stack height while
  keeping the same information density. Final document size is exactly
  1440×900.
- P1 first-paint finding: a saved Theme 3 preference could initially mount the
  Theme 1 home DOM before hydration. Fix: both home compositions remain stable
  in the tree and CSS selects the correct shell from the bootstrapped root
  theme; refresh shows Theme 3 immediately without duplicate IDs.
- P2 accessibility finding: the library region lacked its referenced heading,
  game-detail navigation announced the library as the current page, several
  tiny labels were low contrast and stacked links lacked consistent focus
  rings. All were corrected; game routes now use
  `aria-current="location"`.
- P2 content finding: static online and cache percentages implied unavailable
  live telemetry. They were replaced with accurate local-runtime and ready
  labels. The visible Command/Control+K search shortcut is implemented.
- Final full and focused comparisons retain the source's composition: one
  black-green workspace, luminous metallic card edges, restrained green status
  color, low-radius dense panels and a clear sidebar/workbench/inspector
  hierarchy. No actionable P0/P1/P2 mismatch remains.

### Required fidelity surfaces

- Typography uses bundled Geist plus system Chinese/Thai fallbacks, with compact
  mono metadata and higher-contrast functional labels.
- Layout is independently authored for Theme 3: fixed desktop sidebar,
  responsive two/three-column workbench, mobile glass dock, settings console,
  tracker library and per-game cockpit layouts.
- Colors use an obsidian `#030504` canvas, translucent `#101412` glass,
  silver-white borders and one semantic `#00d65a` accent.
- Icons come from the existing Lucide family; no emoji, remote font, hot-linked
  image or placeholder asset was introduced.
- Focus rings, keyboard navigation, 44-pixel game controls, reduced-motion and
  reduced-transparency fallbacks are covered.

### Responsive and interaction checks

| Surface | Viewport | Measured result |
| --- | --- | --- |
| Theme 3 home | 1440×900 | Document 1440×900; fixed sidebar and full timeline visible |
| Theme 3 home | 1024×768 | No horizontal overflow; two-column workbench and sidebar |
| Theme 3 home | 390×844 | No horizontal overflow; two-column metrics and floating dock |
| Theme 3 home | 320×700 | Document width 320; dock width 304 with 8-pixel side insets |
| All 14 game routes | 390×844 | Every document is 390×844; content ends above dock |

- Search input filtered the task board to the single matching Tetris entry and
  cleared without remounting the page.
- Theme 3 → Theme 2 → Theme 3 switching was exercised in Settings; reload
  retained Theme 3, dark chrome and the matching browser color scheme.
- Anime Tracker opened and closed the add-title dialog without the previous
  pointer-capture error.
- Browser console inspection after navigation and dialogs returned no warnings
  or errors.

### Theme 3 automated checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 17 files, 103 tests
- `pnpm build` — all 19 application routes statically generated
- `git diff --check`

### Theme 3 glow refinement

- Final desktop glow pass:
  `.design-qa-evidence/theme-three/theme-three-home-desktop-glow-final.png`
  at 1440×900 CSS pixels.
- Full and focused comparisons:
  `.design-qa-evidence/theme-three/theme-three-glow-comparison.png` and
  `.design-qa-evidence/theme-three/theme-three-glow-comparison-focused.png`.
- The central active card now carries the reference-style localized emerald
  energy field, layered outer bloom, bright rim and darker lower reflection.
  Adjacent silver cards received stronger metallic edge light without adding
  animated effects or text glow.
- Sidebar, metric cards and primary workspace panels now use brighter specular
  borders, deeper shadows and narrower reflections. The green treatment remains
  limited to active and ready states instead of tinting the full interface.
- At 390×844 the expensive deck bloom is disabled. Home has no horizontal
  overflow, and Bingo remains exactly 390×844 with all primary panels visible.
- Final browser console inspection returned no warnings or errors. Lint,
  typecheck, 103 tests, the 19-route production build and `git diff --check`
  all pass after the glow refinement.

## Bingo-first catalog and offline utility QA

- Theme 1, Theme 2 and Theme 3 all render the Bingo category first on the
  homepage. On Theme 3 H5 the Bingo-first task board stays ahead of the
  experience deck; the deck and timeline keep their existing internal sequence.
- The utility catalog now contains Anime Tracker, Text Encryption and Text QR
  Code. Theme 3's tool metric is derived from the catalog instead of a fixed
  value.
- Text Encryption uses a versioned `XMG1` payload, AES-256-GCM and
  PBKDF2-HMAC-SHA-256. No text, password or history is persisted.
- Text QR Code generates PNG images locally with 256, 512 and 1024-pixel
  exports, four error-correction levels and a fixed four-module quiet zone.
- The utility pages reuse one semantic DOM but have independently authored
  Theme 1 workstation, Theme 2 grouped-sheet and Theme 3 console compositions.

### Responsive and interaction checks

| Theme / surface | Viewport | Measured result |
| --- | --- | --- |
| Theme 1 utilities | 390×844 | Document width 390; no horizontal overflow; stacked input-first flow |
| Theme 1 utilities | 1440×900 | Two-column crypto workspace and split QR editor/preview composition |
| Theme 2 utilities | 390×844 | Document width 390; no horizontal overflow; compact title bar clears all content |
| Theme 2 utilities | 1440×900 | Fixed iOS-style sidebar; crypto uses two sheets and QR preview leads the workspace |
| Theme 3 utilities | 390×844 | Document width 390; console panels collapse to one scrollable column above the dock |
| Theme 3 utilities | 1440×900 | Crypto uses two equal panels; QR uses separate editor, preview and export columns |

- Exercised an encrypt/decrypt round trip containing Chinese, Thai, Emoji and
  a URL; the decrypted text matched the original exactly.
- Generated a mixed-language QR code at 512 pixels, then generated a
  1024×1024 PNG with high error correction. Changing an export option cleared
  the stale preview until regeneration.
- The Theme 2 utility header initially inherited a one-row game header and
  clipped its duplicated description. The final mobile-specific rule hides
  that duplicate description while retaining the full title and intro copy.
- Final browser console inspection returned no errors.

### Utility automated checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 20 files, 111 tests
- `pnpm build` — all 21 application routes statically generated
- `git diff --check`

## Expanded offline utility toolkit QA

- Added three fully client-side tools: lossless JSON formatting/minification
  and validation, UTF-8 Base64 encoding/decoding, and text cleanup with live
  character, non-whitespace, word and line statistics.
- JSON processing validates through the platform parser but formats from the
  original token stream. Browser and pure tests confirm that duplicate keys,
  integer literals beyond JavaScript's safe range, escapes and numeric literal
  spelling are not rewritten.
- Base64 round-trip testing used Chinese, English, Thai and Emoji. Invalid
  padding, non-canonical input and bytes that are not valid UTF-8 are rejected.
- Text cleanup preserves first-seen order while trimming line edges,
  compressing consecutive blank lines and removing exact duplicate lines.
- All tools keep input and output in component state only; no tool content is
  uploaded or persisted. Base64 is described as encoding rather than
  encryption.

### Expanded utility responsive and interaction checks

| Theme / surface | Viewport | Measured result |
| --- | --- | --- |
| Theme 1 JSON | 390×844 | Single-column input → commands → output flow; four 168×44 controls; document width 390 |
| Theme 1 JSON | 1440×900 | 584px editor and output columns; command bay sits below editor; no overflow |
| Theme 2 Base64 | 390×844 | Centered grouped sheets with persistent four-item dock; document width 390 |
| Theme 2 Base64 | 1440×900 | Independent centered 768px single-column iOS composition; no overflow |
| Theme 3 JSON/Text | 390×844 | Single-column console; Thai controls are at least 44px high and do not clip or overflow |
| Theme 3 Text | 1440×900 | Distinct 433px input, 268px command and 391px output console columns |

- Exercised lossless JSON formatting and a localized line/column syntax error
  in the browser.
- Exercised the Base64 “use as next input” path and confirmed the decoded
  multilingual result exactly matched the original value.
- Exercised live text statistics and combined cleanup; the cleaned result kept
  the expected Thai and Emoji content.
- Chinese and Thai mobile layouts produced no horizontal document overflow.
  Final browser console inspection returned no warnings or errors.

### Expanded utility automated checks

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 21 files, 123 tests
- `pnpm build` — all 24 static pages generated
- `git diff --check`

## Bingo marked-number strip and Theme 2 tools H5 QA

### Reference and final evidence

- Theme 1 Bingo marked-number source:
  `/tmp/codex-remote-attachments/019f78c3-d747-71b2-a9ad-11bd2824f6bd/545a21aa-f041-4852-80b5-3365cd2bb01e/1-Photo-1.jpg`
- Theme 1 collapsed state, four cards and `2×2` layout:
  `.design-qa-evidence/mobile-audit/48-bingo-cards-theme-one-marked-collapsed-double-390x844.png`
- Theme 1 expanded state:
  `.design-qa-evidence/mobile-audit/43-bingo-cards-theme-one-marked-expanded-390x844.png`
- Theme 1 normalized source/final comparison:
  `.design-qa-evidence/mobile-audit/46-bingo-marked-reference-vs-final-390x844.png`
- Theme 2 tools source:
  `/tmp/codex-remote-attachments/019f78c3-d747-71b2-a9ad-11bd2824f6bd/545a21aa-f041-4852-80b5-3365cd2bb01e/2-Photo-2.jpg`
- Theme 2 tools final at 390×844 and 320×700:
  `.design-qa-evidence/mobile-audit/44-theme-two-tools-390x844.png`,
  `.design-qa-evidence/mobile-audit/45-theme-two-tools-320x700.png`
- Theme 2 normalized source/final comparison:
  `.design-qa-evidence/mobile-audit/47-theme-two-tools-reference-vs-final-390x844.png`

### Findings and fixes

- Initial Bingo finding (P2): the marked-number row sorted numerically and
  exposed an always-wrapping list, so recent corrections were not immediately
  visible. The final strip keeps one 44-pixel row by default, orders the
  insertion history newest-first and exposes a localized, accessible
  `aria-expanded` control. Expanded content wraps below the label and caps its
  height before switching to internal vertical scrolling.
- Initial Theme 2 tools finding (P1): a `col-span-2` featured card was placed in
  a one-column H5 grid, creating an implicit second column and a large clipped
  blank region. The final mobile category uses a vertical flow: the first item
  remains a 128-pixel featured card while the other five tools become compact
  iOS-style rows. The second featured item is deliberately normalized to a row
  only on Theme 2 H5; desktop and the other themes keep their existing layouts.
- The normalized comparisons show equivalent content density and state. The
  Bingo comparison uses four cards, nine marks and `2×2`; the tools comparison
  keeps all six tools in their source order.

### Responsive and interaction checks

| Surface | Viewport | Measured result |
| --- | --- | --- |
| Theme 1 Bingo | 390×844 | Collapsed list 44px high; newest sequence starts `10, 9, 8, 7`; expanded list wraps to two rows; no document overflow |
| Theme 1 Bingo | 320×700 | Collapsed list 44px high; expanded list wraps; 39-mark stress state caps at 192px with internal scrolling; card library remains visible |
| Theme 2 tools, Chinese | 390×844 | Six items; 332px featured card plus five 356px rows; final item scrolls 35.6px clear of the tab bar; no overflow |
| Theme 2 tools, Chinese | 320×700 | Six items remain continuous at 262/286px widths; final item scrolls 35.2px clear of the tab bar; no overflow |
| Theme 2 tools, Thai | 320×700 | Six items, no title or description overflow; no document overflow |
| Theme 2 tools | 430×932 | Six items; 128px featured card and five 76px rows; no overflow |
| Theme 2 tools | 1440×900 | Two-column desktop grid retained; both featured cards span the complete 1062px grid |

- Removing one marked number changed the count from nine to eight; re-entering
  it restored the count and moved that number to the front without changing the
  expanded state.
- Browser console inspection returned no warnings or errors.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (21 files, 125 tests),
  `pnpm build` (24 static pages) and `git diff --check` all passed.

final result: passed

## Schulte Grid focus test QA

### Reference, scope and evidence

- Source visual truth:
  `.design-qa-evidence/schulte-grid/reference.jpg` (591×1280 pixels).
  Only the irregular circular number field is treated as a visual reference;
  the timer, controls, navigation and records retain each XM-Games theme's own
  design language.
- Normalized running-state comparison:
  `.design-qa-evidence/schulte-grid/reference-vs-theme-two-390x844.png`.
  The reference and the running Theme 2 implementation are both normalized to
  390×844 CSS pixels in one 790×844 comparison image.
- Final 390×844 evidence:
  `.design-qa-evidence/schulte-grid/theme-one-390x844.png`,
  `.design-qa-evidence/schulte-grid/theme-two-390x844.png`,
  `.design-qa-evidence/schulte-grid/theme-two-playing-390x844.png`, and
  `.design-qa-evidence/schulte-grid/theme-three-390x844.png`.
- The final 320×568 density pass was remeasured in the live browser after the
  screenshots above: history remains persisted but is hidden only on this
  extreme short-screen breakpoint so the playable 49-cell board receives the
  available space.

### Findings and fix history

- Initial browser finding (P1): unrounded Voronoi center coordinates differed
  at sub-pixel floating-point precision between server and browser, producing a
  React hydration warning. SVG center and font coordinates are now rounded to
  the same three-decimal precision used by the generated paths; a fresh reload
  no longer emits the warning.
- Initial mobile finding (P1): Theme 1 clipped the lower progress area at
  320×568. Its final short-screen cockpit uses a 291.1-pixel playable board and
  a one-row difficulty/action console; the locally persisted history strip is
  hidden only at the 320×568-class breakpoint.
- Initial mobile finding (P1): Theme 2 allowed its two-line description to push
  the title above the 390×844 viewport and let the short-screen history strip
  collide with the tab bar. Mobile now keeps the centered title only; 320×568
  uses a 279.6-pixel board, keeps the control dock above the tab bar and hides
  only the persisted history strip at that extreme breakpoint.
- Initial mobile finding (P1): Theme 3 rendered its board beyond the available
  short-screen stage. The final 285.6-pixel board remains fully inside its
  290.5-pixel stage at 320×568, with telemetry ending above navigation.
- Initial interaction finding (P2): desktop hover styling could make the last
  clicked cell appear changed. Persistent and hover cell styling are now
  identical; only keyboard `focus-visible` remains as an accessibility aid.
- The final combined comparison retains the source's circular organic search
  field while presenting three materially different applications: Theme 1 is
  a violet arcade console, Theme 2 an iOS-style light focus card, and Theme 3
  an obsidian-green telemetry workstation. No actionable P0/P1/P2 finding
  remains.

### Responsive checks

| Theme / viewport | Measured result |
| --- | --- |
| Theme 1, 320×568 | 291.1×291.1 board; progress and notice end at y=548.3; history hidden at this extreme breakpoint; no clipped button or overflow |
| Theme 1, 390×844 | 374×374 board; history ends at y=786.3; document 390×844; no clipped button |
| Theme 1, 375×667 | 320×320 board; history ends at y=626.2; no clipped button or overflow |
| Theme 2, 320×568 | 279.6×279.6 board; dock ends at y=452.9; tab bar starts at y=496.8; history hidden only at this breakpoint |
| Theme 2, 390×844 | 352×352 board; history ends at y=645.3; tab bar starts at y=772.8 |
| Theme 2, 375×667 | 343×343 board; history ends at y=556.3; tab bar starts at y=595.8 |
| Theme 2, 375×855 | 343×343 board; history ends at y=636.3; tab bar starts at y=783.8 |
| Theme 3, 320×568 | 285.6×285.6 board inside a 290.5-pixel stage; telemetry ends at y=465.6 before navigation at y=494.8; no clipping or overflow |
| Theme 3, 390×844 | 366×366 board; history ends at y=746.4 above navigation; document 390×844 |
| Theme 3, 375×667 | 336×336 board; history ends at y=569.4; no clipped button or overflow |

- The 1–49 expert layout remains a deliberate density exception required by
  the one-screen brief: after the final short-screen optimization its exact,
  non-overlapping Voronoi hit cells measure roughly 29.7–32.6 CSS pixels at the
  narrowest edge across the three themes. Numbers remain legible, but 44-pixel
  targets cannot coexist with 49 independent cells in a 320-pixel circular
  board without overlapping adjacent targets.

### Interaction and persistence checks

- Start changes both the number permutation and dynamically deformed shape
  paths while randomly selecting one of three calibrated topology families.
- A wrong selection kept the target at 1, displayed `点错 +1 秒`, and added
  exactly one second. The next correct selection advanced target 1→2 and
  progress 0/25→1/25.
- Paths, numbers, fills and strokes were byte-for-byte unchanged before and
  after the correct tap, proving the board leaves no visual click history.
- Stop immediately froze a visible incomplete result and inserted it at the
  front of recent history. Restart reset target/progress and changed both shape
  paths and number order.
- A complete 1→25 browser run ended automatically at 25/25, rendered the ✓
  target and updated the best result. Switching to 1–49 showed an independent
  empty record set; returning to 1–25 restored its best and three recent runs.
- Keyboard Enter/Space support and `focus-visible` remain available on every
  active SVG cell. Idle and completed cells are exposed as disabled.

### Automated checks

- `pnpm test` — 54 files, 375 tests
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` — `/schulte-grid` statically generated with all 26 application
  pages and existing LAN API routes
- `git diff --check`

final result: passed
