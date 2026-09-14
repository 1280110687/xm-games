# Theme Three — Night Gallery implementation QA

## Commit readiness verification

2026-09-14: after the user requested commit/sync, reran `pnpm verify` on the complete change set including the icon alignment fix. Lint, experience lint, TypeScript and production build passed; 574 tests passed, two existing tests skipped. Staged diff whitespace check passed. The upstream branch was fetched and was aligned before this commit. Only Theme Three implementation, shared dispatch/config hooks, local production WebP assets, offline manifest coverage and this QA record are included; generated screenshots and build output remain ignored. Earlier statements below describe their original validation stage.

## Follow-up: language icon alignment

2026-09-14: user screenshot exposed the language glyph sitting 9.5 CSS px left of center. The grid trigger retained SelectTrigger's `justify-content: space-between`; `place-items: center` alone did not center its grid track. Explicit `justify-content: center` and zero internal gap now apply to both Theme Three header controls. No shared language logic or other theme styling changed.

Browser checks on the game-library view and `/text-tool`: both buttons 44 × 44 px, both icons 23 × 23 px, X/Y center offsets exactly zero. Language menu opens and closes normally. Regression test reproduced the missing alignment declarations before the CSS fix; focused suite now 45 passed, targeted ESLint and `git diff --check` passed. Full application build was not rerun for this CSS-only follow-up. Prior validation below belongs to the initial rollout.

Date: 2026-09-14. Local preview: http://localhost:4412/.

## Comparison target and evidence

- Selected source: `/Users/mimi/Documents/Improvement/xm-games/output/theme-three-review-2026-09-14/option-1.png` (Option 1, selected by the user).
- Final implementation: `/Users/mimi/Documents/Improvement/xm-games/output/theme-three-implementation/home-final.png`.
- Combined, side-by-side comparison: `/Users/mimi/Documents/Improvement/xm-games/output/theme-three-implementation/comparison-final.png` (source left, implementation right).
- Source raster 853 × 1844 normalized to 390 × 844 CSS pixels. Implementation captured at 390 × 844, screenshot 390 × 844, effective capture density 1 pixel per CSS pixel. No browser/device frame included. Final combined image 780 × 844.
- State: `/`, Theme Three, Chinese, empty search, Home selected, no menu open, scroll top. Read and compared the actual combined image, not source paths alone.
- Full-view content, icon edges and small copy are readable at this size; focused crops were not necessary. Narrow-layout screenshots were also inspected at their native 320 px width.
- Source does not specify desktop, secondary screens, search, filters, menus or reduced-transparency states. These are deliberate responsive/product extensions, not pixel-match claims.

## Findings and comparison history

1. Initial comparison (`comparison-v2.png`): P2 excessive panel edging, hard art backdrop, excessive vertical spacing and scenery detail. Softened edge/shadow tokens, adjusted feature copy/handy section rhythm, blended the generated assets and softened the background. Revised evidence: `comparison-v3.png`.
2. Navigation testing: P2 legacy anchors scrolled the newly separate library/tools views under the sticky header. Removed legacy destination IDs from the actual list element, retained hash compatibility and disabled automatic anchor scrolling. Repeated Tools click and reload: title visible, `scrollY: 0`, six tool entries. Added regression assertions.
3. Secondary review: P2 Tetris help squeezed into a narrow column alongside the handheld; changed the containing flex direction to column. P2 Neon controls appeared after a long dashboard; placed actions first on mobile and supplied missing panel radii. Evidence: initial `route-tetris.png` / `route-neon-breaker.png` and revised `tetris-320-final.png` / `neon-320-final.png`.
4. Small-screen review: P2 featured art overlapped English/Thai description at 320 px. Reduced and shifted the art at the narrow breakpoint, faded supporting-art edges. Evidence: `home-en-320-viewport.png`, `home-th-320.png`, revised `home-en-320-final.png`, `home-th-320-final.png`. Added a radial edge mask to remove the remaining dark rectangular artwork edge; inspected the final 390 px combined comparison.
5. Desktop review: P2 uneven category heights left a large grid hole. Used two flowing columns without splitting category groups; final evidence `library-desktop-final.png`.
6. Final comparison: no remaining actionable P0/P1/P2 differences in the inspected states. The final image retains the selected hierarchy, scenery, glass material, three illustrated game destinations, handy tools row, icon-only controls and floating three-item dock.

## Required fidelity surfaces

- Typography: existing Geist with system Chinese/Thai fallback; optical hierarchy checked at 390, 320 and 1280 CSS widths. The source family is not supplied, so exact font identity is not claimed. Existing [Geist](https://vercel.com/font) and [Lucide Gamepad2](https://lucide.dev/icons/gamepad-2) references were inspected. Equal 23 px header icons in 44 px controls; functional text and labels remain live text, not rasterized.
- Layout: source feature ~246 px tall retained on standard mobile; compact header/search/feature/two supporting cards/tools/dock rhythm preserved. Desktop feature-plus-stacked-shortcuts arrangement and two-column workspaces are intentional responsive adaptations. Long screens scroll with bottom clearance. No fixed-height clipping was introduced.
- Colors/materials: navy `#0c1827`, silver-blue ink `#edf5ff`, accents `#bcdcff`; outer-only glass and readable opaque editors/results. Secondary scenic backdrop dimmed for help/control contrast. Semantic board/piece colors intentionally retained. Not claiming a full automated WCAG contrast audit.
- Image quality: all four new images are real generated raster assets, optimized to local WebP; inspected for crop/clarity/compression and baked-checkerboard defects. The failed checkerboard attempt was replaced through ImageGen. Current four assets total 198,760 bytes. No new WebGL or image-rendering dependency. Final imagery is a faithful art-direction recreation, not the exact raster from the mock.
- Copy/content: approved Chinese headline, supporting text, featured 2048, Gomoku/Snake and two handy tools kept; English and Thai localized, no fake metrics/status bars. Library contains 16 real games; Tools contains six real destinations. No settings entry added to navigation.

## Browser coverage

Evidence directory: `/Users/mimi/Documents/Improvement/xm-games/output/theme-three-implementation/`.

- All 22 secondary destinations opened directly at 390 × 844; first-screen captures inspected in `routes-sheet-1.png` through `routes-sheet-4.png`. Each page reported viewport width = document width = 390; raw measurements in `routes.json`.
- Routes: `/bingo`, `/bingo-cards`, `/chinese-chess`, `/chess`, `/go`, `/gomoku`, `/reversi`, `/schulte-grid`, `/alternating-trail`, `/minesweeper`, `/2048`, `/sudoku`, `/memory-match`, `/tetris`, `/snake`, `/neon-breaker`, `/anime-tracker`, `/text-crypto`, `/qr-code`, `/json-tool`, `/base64-tool`, `/text-tool`.
- 320 × 690: Chinese/English/Thai Home, scroll to last content, sticky header, Tetris, Neon and game-rules dialog. Short screens intentionally scroll; fixed dock does not make final content inaccessible. Rules dialog visual evidence `rules-320.png`; Escape-close completion was not independently established, so no keyboard-dismissal pass is claimed.
- 1280 × 900: Home, Library, Tools and text-cleanup workspace. Evidence `home-desktop.png`, `library-desktop-final.png`, `tools-desktop.png`, `text-desktop.png`.
- Interactions: search no-results state; clear search; category filter; three primary destinations; Tools hash reload; secondary tool return to Tools. Text cleanup synthetic input produced `alpha\n\nbeta`, then input/output were cleared. No saved anime/game data was cleared; no transfer or network room was created.
- Theme One and Two switched successfully and inspected via `theme-one-regression.png` and `theme-two-regression.png`; their source layouts/assets were not edited.
- Emulated reduced-transparency and reduced-motion: actual outer panels computed `backdrop-filter: none` and background `rgb(23, 40, 59)`. Evidence `reduced-transparency.png`. Emulation restored afterward.
- Browser console errors: none observed in the reviewed route/interaction session.

## Code verification and boundaries

- `pnpm verify`: passed lint, experience lint, TypeScript, production build, 573 tests; two tests skipped by existing suites (78 files passed, one skipped). Repeated after primary QA fixes.
- Focused Theme Three suite: 44 tests passed. CSS parsing/scoping, route-lazy game CSS, navigation, catalog coverage, fallback materials, asset budget and offline manifest assertions included.
- `git diff --check`: passed.
- Existing Theme Four build warnings remain: large Vite chunks and a texture URL resolved at runtime. They did not fail the build and are outside this theme redesign.
- Retired `styles/themes/theme-three/foundation.css` removed from source/imports; recoverable in Git. Shared game/tool engines, saved data, Redis transfer, API endpoints and Theme Four source unchanged.
- Four new local URLs included in the generated offline asset list. No claim of iOS/Android installed-PWA cold-start or real-device GPU performance validation; those still require device testing. Unsupported-backdrop fallback covered structurally, not an actual legacy-engine run.
- No commit, push or deployment performed. QA images/source prompts remain local ignored artifacts.

## Asset provenance

All assets generated with built-in ImageGen using the selected Option 1 reference, then mechanically resized/encoded with Sharp. No third-party source code/artwork copied into the implementation.

| Production file | Dimensions | Bytes | Saved generation prompt |
| --- | --- | --- | --- |
| `public/images/theme-three/night-lake.webp` | 780 × 1688 | 139200 | `output/theme-three-assets/night-lake-prompt.md` |
| `public/images/theme-three/crystal-2048.webp` | 600 × 600 | 46576 | `output/theme-three-assets/crystal-2048-prompt.md` |
| `public/images/theme-three/gomoku.webp` | 320 × 260 | 4804 | `output/theme-three-assets/gomoku-prompt.md` |
| `public/images/theme-three/snake.webp` | 320 × 260 | 8180 | `output/theme-three-assets/snake-prompt.md` |

Source PNGs are alongside these prompts. Asset subagents were limited to raster generation; application implementation remained in the main task.

## Follow-up polish / open questions

- P3: generated scenery has different cloud/ridge detail; rendered glass is slightly darker, and selected-dock lighting is more restrained than the concept. Intentional readability/asset differences, not exact-raster claims.
- P3: small helper text can be increased further if the user prefers readability over concept density.
- Real installed PWA / Safari touch-device validation remains a release check, not completed evidence.

## Implementation checklist

- [x] Selected Option 1 implemented in the existing app.
- [x] Home, Library, Tools and secondary shell integrated.
- [x] Local assets / offline manifest / performance fallbacks supplied.
- [x] Source-versus-render comparison repeated after fixes.
- [x] Responsive, language, routing and theme-isolation checks completed within the stated coverage.
- [x] Validation and residual device-test limitations recorded.

final result: passed

---

## Prior theme QA records (preserved)

The following historical records predate the current Night Gallery implementation.

# Theme One — Secondary Page Rollout (latest)

2026-09-14. User approved extending the selected arcade design to secondary
pages and removing the Settings Center destination from this theme's bottom
navigation. This section supersedes the two-page preview boundary below.

## Scope and design decisions

- All 22 catalog destinations now retain `theme-arcade`, including direct
  refresh. No route-level fallback to Theme Three remains.
- Home / Library / Tools are the only bottom destinations. Headers expose
  language and appearance directly; the old `/settings` URL remains compatible.
- Preserve the selected mock's off-white canvas, black rules, bold headings,
  coral actions, yellow/mint accents and crisp outlined controls. Tool pages
  use open numbered work sections; desktop editor/result columns replace
  nested cards. The anime toolbar combines add/transfer actions and the list
  uses rule-separated records. Focus exercises receive their own layout view.
- No new assets, dependencies, game engines, storage schemas or API changes.
  Original local illustrations are reused. Interactive SVG/game grids remain
  real controls; the neon game's dark canvas stays legible inside arcade chrome.
- Theme styles are separated into shared/tools/games/anime modules. Classic
  and focus CSS stays route-scoped. Shared focus slots are theme-neutral types.

## Visual evidence and findings

Evidence: `output/theme-arcade-secondary-2026-09-14/` (ignored local artifacts).
Chinese baseline 390×844; short/narrow 320×568; desktop 1280×900.
The selected 1296×1213 two-screen raster was shown alongside the final 390px
text-tool screenshot in the same inspection. This is an extension of its design
language, not a claim that previously undesigned game pages are pixel replicas.
Three-item navigation and the additional language control intentionally differ
from the original mock per the user's current requirements.

- **Fixed P1:** Secondary routes switched theme on navigation/refresh. Removed
  both bootstrap and provider preview fallbacks; route tests and browser checks
  now keep the selected identity.
- **Fixed P2:** White chess pieces lacked contrast. Added crisp outlines while
  preserving selected-square and last-move markers. Sudoku errors retain red
  instead of being hidden by the selected-cell accent.
- **Fixed P2:** Anime intro appeared twice, with an isolated add button row.
  Moved add/transfer into a shared toolbar only for arcade, retaining all handlers.
- **Fixed P2:** Thai crypto heading and mode labels competed for a narrow row.
  Modes now wrap onto their own full-width row on small screens.
- **Fixed P2:** AI setup selected choices had no visible marker. Corrected the
  selector to the existing `aria-pressed` contract and compacted the popup.
- **Fixed P2:** Neon controls were pushed far below its tall playfield. The
  mobile playfield scales with available height; score/actions precede help.
- All 22 entries were visited at 390px and 320px. No document-level horizontal
  overflow; game/tool navigation classification and three destinations verified.
  Longer tools and short-height views remain intentionally scrollable; fixed
  navigation has bottom content clearance, not an artificial single-screen crop.
- Visual families checked: five board games, Bingo and cards, 2048, Tetris,
  Sudoku, Minesweeper, Snake, Memory, Neon, both focus exercises, all six tools,
  and the compatibility settings route. Desktop editor/results, Tetris side
  controls, focus side controls and anime index were also inspected.
- Theme Three Base64 and Theme Four focus screenshots confirm their separate
  material/layout systems remain in place. No Theme Four engine edits.

Primary comparison: `text-final-390.png`. Representative family evidence:
`2048-390.png`, `tetris-390.png`, `memory-match-390.png`,
`base64-result-390.png`, `qr-generated-390.png`, `anime-tracker-desktop.png`.
Use viewport captures for geometry: the in-app browser's full-page export
occasionally includes surplus whitespace at 320px, so those long PNGs are not
evidence of exact physical viewport dimensions.

## Functional and build verification

- Bootstrap/route/style tests first failed on the old preview implementation;
  implementation made them pass. Catalog classification includes every current
  destination plus trailing-slash and unknown-route cases.
- Text sample: 47 characters, 35 non-space, 9 words, 4 lines. Clean all retains
  the existing blank-line behavior and enables copy/reuse controls.
- Base64 `Hello XM-Games` → `SGVsbG8gWE0tR2FtZXM=`; JSON format and local QR
  generation work in the new layout.
- Focus Start → click 1 yields progress 1/25 and next target 2. Navigated away
  without completing/stopping the exercise, so no test result was saved.
- Tetris Start → Pause displays paused state; direction controls disabled.
- English text tool and Thai crypto checked at 320px; restored Chinese.
- `pnpm verify`: lint, TypeScript and both 3D + Next production builds passed;
  **77 test files passed, 1 skipped; 560 tests passed, 2 skipped**.
- Redis external integration remains skipped without its environment. Existing
  3D chunk-size / runtime texture-path warnings are unchanged.
- SW cache version v21 retains user-confirmed update behavior; no forced
  activation or business-data clearing. No true installed iOS/Android offline
  cold-start or device safe-area/performance acceptance was performed this turn.
- This is the pre-commit verification snapshot. The user authorized commit and
  push on 2026-09-14; revision and synchronization status are recorded by Git.
  No separate deployment is invoked. Preview remains on localhost:4412.

---

# Theme One Rebuild — Arcade Editorial QA (earlier representative-page phase)

2026-09-14. Scope: the selected third mock, implemented in the existing Next.js
application at `/` and `/text-tool`. The historical reports below remain intact;
they are not evidence that the retired themes are still available.

## Visual truth and evidence

- Selected visual truth: `/Users/mimi/.codex/generated_images/019feb77-4fc5-7a12-9663-08490176993a/exec-9df62f15-109c-4600-aac0-984e2af2323e.png`.
- Implementation: `http://localhost:4412/` and `http://localhost:4412/text-tool`.
- Evidence directory: `output/theme-arcade-2026-09-14/`.
- Final mobile: `home-final-390x844.png`, `text-final-390x844.png`.
- Final desktop: `home-desktop-final.png`, `text-desktop-final.png`.
- Narrow screens: `home-zh-320-final.png`, `home-th-320-final.png`.
- Retained-theme regressions: `theme-three-text-regression.png`, `theme-four-text-regression.png`.

The source is a composed two-screen raster board (1296×1213), not a literal
browser capture with density metadata. Each panel is approximately 640px wide.
Compare each panel at the implementation's 390 CSS-pixel width; do not stretch
its typography to fill 844px vertically. The board normalizes to approximately
390×735 per panel. Primary mobile captures are 390×844, DPR 1; an additional
390×736 short-height inspection confirmed scrollable content and the fixed
navigation. Desktop inspection is 1280×900; narrow inspection is 320×740.
The taller runtime viewport intentionally leaves more space above the footer.

The exact source and both final mobile screenshots were opened together in one
comparison input after fixes. Header, feature artwork, stats, command buttons,
output and bottom-navigation regions were readable at full resolution in that
same input; no independent crop was needed to judge those regions. Desktop and
Thai captures were inspected separately for responsiveness, not passed off as
source-fidelity comparisons.

State: Chinese, selected arcade preview, home Featured shelf; text sample
`  Hello XM-Games  \n\nReady to play\nReady to play`, input tab, after Clean all.
Actual counts are 47 characters / 35 non-whitespace / 9 words / 4 lines.
Output retains one blank line per the existing algorithm. The mock's two-line
output is not a license to change that behavior.

## Comparison history and findings

1. **P2 — illustration colors became muddy.** `home-v1.png` showed multiplied
   colored backdrops, notably darkening the balls and snake. Removed multiply
   blending and aligned surfaces with sampled image backdrops. Final captures
   show white eyes/ball faces, yellow and mint accents without the dark overlay.
2. **P2 — undersized headline and tile illustration.** First home capture did not
   have the source's headline emphasis. Increased display type and tile-art
   footprint; checked wrapping in Chinese and English.
3. **P2 — longer copy could collide with artwork.** English Bingo description
   overlapped the cage, and Thai 2048 copy reached the arrow at 320px. The Bingo
   artwork now occupies remaining layout space; text/art columns are separated
   on desktop, and the Thai summary is concise. Final Thai capture shows the
   arrow separated from copy. The 2048 caption width prevents text/art overlap.
4. **P2 — same-home navigation retained the previous filter.** Reset filters on
   home-navigation events, including repeated taps. Browser verification:
   Board → Home returns Featured (`aria-pressed=true`).
5. Final comparison: no remaining actionable P0/P1/P2 issues within this
   representative-page scope.

## Required fidelity surfaces

- **Fonts / typography:** bold black editorial hierarchy, large home headline,
  condensed-looking game headings and monospace editor/result. Existing Geist
  and system CJK/Thai fallbacks avoid added font requests. The raster's exact
  display-face contours are not claimed as a pixel-identical font match.
- **Spacing / layout:** unequal game composition, tall Bingo plus two compact
  entries, rule-separated secondary links and four-item navigation preserved.
  Desktop adapts the same hierarchy; narrow pages scroll with bottom padding.
  Header controls are 44px; primary actions have visible keyboard focus.
- **Colors / tokens:** off-white, near-black, coral, yellow and mint; no glass
  surface or gradients added. Active text is a darker coral for readability.
- **Images:** five actual generated WebP assets, approximately 61 KB total,
  same-origin and included in the full offline manifest. No CSS or handcrafted
  SVG illustration substitutes. Tiny generated backdrop variations remain P3.
- **Copy / content:** three locales; all 22 real catalog destinations reachable.
  Preserved non-whitespace statistics, copy status, empty-input errors, result
  invalidation and reuse-as-input. Replaced decorative palette swatches with
  the existing functional, labeled theme picker rather than dead controls.

## Interaction and regression verification

- Categories, Home/Library/Tools navigation, settings, text input, Clean all,
  result tab, clipboard equality, reuse-as-input and empty input were exercised.
- Saved arcade preview → 2048 / settings uses the complete glass interface;
  2048 reload remains styled, and returning home restores arcade automatically.
- Theme Three processed a real test input with the shared controller; Theme
  Four's text-tool layout remained complete after switching.
- No console errors or warnings were recorded in the verification tab.
- `pnpm verify` passed: lint, TypeScript, production build, 77 test files /
  556 tests passed; 1 file / 2 tests skipped. The existing 3D bundle/path warnings remain.
- Actual installed iOS/Android PWA, offline cold starts and real Redis integration
  were not tested. Local screenshots do not stand in for those checks.

## Follow-up polish / implementation checklist

- P3: a separately licensed condensed display font could tighten Latin-heading
  fidelity later; current typography is consistent and readable.
- [x] Resolve all P0/P1/P2 findings in the representative pages.
- [x] Preserve original game/tool behavior and retired preference migration.
- [x] Keep preview theme boundaries explicit; no unfinished unstyled routes.
- [ ] User visual acceptance before extending the theme to other page families.

Asset provenance, final paths and generation prompts: [theme-arcade-assets.md](docs/theme-arcade-assets.md).

final result: passed

---

# Historical Classic Games Design QA

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

---

# Theme Four original 3D room restoration QA (2026-08-09)

**Source and implementation**

- Source truth: `/Users/mimi/Documents/Improvement/portfolio-itom/src/components/canvas/rooms/`
- Restored implementation: `/Users/mimi/Documents/Improvement/xm-games/apps/theme-four-world/src/components/canvas/rooms/`
- Room switch restored in `apps/theme-four-world/src/components/canvas/corridor/RoomInterior.jsx`.
- Visual comparison viewport: 1280 × 720 CSS pixels for both source and implementation.

**Same-input comparison evidence**

- Gallery: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/theme4-room-3d-rework/compare-gallery.png`
- Studio: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/theme4-room-3d-rework/compare-studio.png`
- About: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/theme4-room-3d-rework/compare-about.png`
- Contact: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/theme4-room-3d-rework/compare-contact.png`

Each comparison places the reference room on the left and the restored XM-Games room on the right. The original room geometry, camera framing, source textures, clouds, depth, and animated structures remain visibly aligned. Only the portfolio author's content layer is replaced.

**Room fidelity and content replacement**

- Gallery retains the hand-drawn skyline, balcony, railing, curved clothesline, drifting clouds, horizontal movement, and physical card-flip interaction. Its cards now show Bingo, Chinese Chess, Schulte Grid, Sudoku, and Neon Breaker and route through the same-origin XM-Games bridge.
- Studio retains the auto-rotating, vertically falling TV/monitor/phone tower and pointer-drag physics. Generic source device shells now carry XM-Games labels such as Bingo LAN, Gomoku, and 2048; the author's videos and social posts are no longer used.
- About retains the infinite cloud chunks, paper airplane, wheel/touch momentum, camera banking, and repeating fly-through narrative. Personal avatar, awards, school, and skills content were replaced with four XM-Games milestones.
- Contact retains the animated sea layers, clouds, lighthouse, moving ship, dock, and floating barrel motion. Social/message barrels are now TEXT, QR, JSON, CRYPTO, and ANIME tool routes.
- The room overlay is collapsed by default into a compact paper control at the lower-right and expands only on request, so it no longer hides the 3D room. Its mobile breakpoint constrains the collapsed panel to 10.5rem and the expanded catalog to 52dvh.
- The localized Back to corridor control remains visible above every room and completed the actual exit transition in Gallery, Studio, About, and Contact.

**Interaction evidence**

- Entered the 3D front door, moved through the real corridor, and opened all four room doors.
- Gallery card wall and horizontal scene, Studio screen tower, About wheel-flight state, and Contact animated sea were exercised in the in-app browser.
- Clicked the visible QR barrel; the parent application navigated to `http://127.0.0.1:3020/qr-code` and rendered `文字二维码 - XM-Games`.
- Returned from each tested room using the visible top-left control.

**Comparison history**

1. Generic room shell — P1. The previous implementation replaced all four source room components with a tiled box and large DOM catalog. Fixed by restoring the original Gallery, Studio, About, and Contact component switch in `RoomInterior`.
2. Author content remained inside restored scenes — P1. Fixed at the 3D object seams: project cards, device screens, flight milestones, and sea barrels now use XM-Games content and whitelisted internal routes.
3. Catalog covered the 3D scene — P1. Fixed with a collapsed-by-default lower-right paper control and an explicit expandable catalog.
4. Production preview initially rendered white after asset hashes changed — P1. The already-running Next production server had not registered the newly generated static asset names. Restarting the exact preview process restored 200 responses for the new Vite chunks and the real WebGL entrance. The final production preview was restarted again after the full build.

**Validation**

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 58 files, 397 tests
- `pnpm build` — Vite Theme Four build plus all 27 Next.js pages and LAN API routes
- `git diff --check`
- Vite's remaining large-entry-chunk message is advisory and unchanged in kind; the room experience remains lazy-loaded.

No actionable P0, P1, or P2 visual or interaction findings remain.

final result: passed

# Theme Four WebGL replacement design QA (2026-08-09)

This report supersedes the earlier Theme Four 2.5D raster-scene QA above. The
rejected raster implementation has been replaced by an isolated build of the
reference project's real React Three Fiber scene.

**Source visual truth**

- Local reference source: `/Users/mimi/Documents/Improvement/portfolio-itom`
- Desktop entry, 1280 × 720: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/reference-entry-1280x720.png`
- Desktop corridor, 1280 × 720: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/reference-corridor-1280x720.png`
- Mobile entry, 390 × 844: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-audit/08-mobile-entry-390x844.png`

**Rendered implementation evidence**

- Production desktop entry, 1280 × 720: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/target-production-entry-1280x720.png`
- Production desktop corridor, 1280 × 720: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/target-production-corridor-1280x720.png`
- Mobile entry and walked corridor, 390 × 844: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/target-ready-390x844.png`, `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/target-walk-390x844.png`
- Short-screen entry and game map, 320 × 568: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/target-entry-320x568.png`, `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/target-map-320x568.png`

**Viewport and normalization**

- Desktop source and implementation: 1280 × 720 pixels and CSS pixels,
  device scale factor 1; no density normalization required.
- Mobile source and implementation: 390 × 844 pixels and CSS pixels,
  device scale factor 1; no density normalization required.
- Implementation-only regression viewport: 320 × 568 CSS pixels.
- States: fully loaded entry, post-door camera flight, corridor scroll advance,
  map open/scrolled, Theme One reload, Theme Four reload.

**Full-view comparison evidence**

- Desktop entry side by side (source left, implementation right): `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/desktop-entry-comparison.png`
- Desktop corridor side by side (source left, implementation right): `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/desktop-corridor-comparison.png`
- Mobile entry side by side (source left, implementation right): `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/mobile-entry-comparison.png`

**Focused-region comparison evidence**

- No additional crop was required: the source scene and embedded scene use the
  same R3F geometry, textures, shaders, fonts, camera settings and responsive
  crop. The full-view desktop and mobile comparisons keep the entrance door,
  sign, path, paper hint, wall texture and corridor avatar readable at 1:1.
- The XM-Games game map is an intentional host-layer extension rather than a
  reference-fidelity surface. It was checked separately at 320 × 568: all 22
  route links are present, the lower tools are reachable by internal scrolling,
  and the close action remains visible.

**Required fidelity surfaces**

- Fonts and typography: the iframe loads the reference Cabin Sketch, Frederika
  the Great and Rubik Scribble assets and the original CSS. The entry hint,
  labels and corridor text therefore match source family, weight, scale, line
  height and letter spacing. Host controls use the existing XM-Games mono/serif
  hierarchy and remain legible in Chinese, English and Thai.
- Spacing and layout rhythm: entrance geometry, camera framing, path crop,
  corridor perspective, door placement and mobile crop are the reference
  implementation itself. The only visible addition is a compact host toolbar;
  320 × 568 metrics were `scrollWidth = clientWidth = 320` for both host and
  iframe, so no horizontal overflow or control collision remains.
- Colors and visual tokens: the WebGL scene uses the reference textures,
  material colors, fog and monochrome/reveal behavior without approximation.
  The host map continues the existing Theme Four paper, ink and teal tokens.
- Image quality and asset fidelity: source WebP textures and animation frames
  are copied at their original dimensions. No screenshot background, generated
  replacement, CSS drawing, inline SVG illustration or stretched sprite is
  used for the 3D scene.
- Copy and content: reference-world labels and tutorial copy remain unchanged
  inside the isolated scene to meet the exact-display request. XM-Games-specific
  copy lives in the host toolbar and map, which exposes six real categories and
  all 22 existing routes.
- Icons and affordances: source WebGL hotspots, source paper UI and source
  navigation remain functional. Host map/theme/language/settings controls use
  the existing Lucide family, semantic labels and focus behavior.
- Accessibility and motion: the iframe has a descriptive title and retains the
  reference screen-reader navigation. The host map is a labelled dialog with
  semantic links and close controls. Mobile targets, 320/390 responsive layout
  and reduced-motion loading fallback were checked; the requested 3D scene
  intentionally retains its spatial animation.

**Comparison history**

1. 2.5D scene substitution — P1. The prior implementation used static raster
   scenes and CSS parallax, so it could not reproduce camera depth, door motion,
   looping corridor segments or room transitions. Fixed by replacing it with an
   isolated build of the reference R3F source. Post-fix evidence:
   `desktop-entry-comparison.png`, `desktop-corridor-comparison.png` and
   `mobile-entry-comparison.png`.
2. Reference service leakage — P1 integration risk. The original source
   initialized PostHog, automatically requested Sanity and synchronized its own
   room paths. Fixed in the embedded fork by disabling those integrations and
   keeping all fallback room content local. Production interaction logs contain
   no warnings or errors.
3. Theme-wide WebGL cost — P2. Mounting the iframe with the other themes would
   load the 3D bundle and consume a WebGL context while hidden. Fixed by gating
   the iframe with `themeLoadsWebglExperience`; a Theme One reload produced
   `iframeCount = 0`, while Theme Four produced `iframeCount = 1`.

**Primary interactions tested**

- Select Theme Four through the real theme menu.
- Click/tap a door and complete the door rotation plus camera flight.
- Scroll through the corridor on desktop and 390px mobile until side-room doors
  enter the viewport.
- Open, scroll and close the XM-Games map at 1280 and 320 widths; all 22 links
  are available.
- Switch to Theme One, reload and confirm the 3D iframe is absent; switch back
  and confirm it mounts again.
- Production preview console checked after the full interaction run: no warnings
  or errors.

**Automated checks**

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 58 files, 397 tests
- `pnpm build` — Theme Four Vite bundle plus all Next.js routes generated
- Theme Four bundle: 692 modules; entry bundle 1.212 MB / 347 KB gzip and lazy
  experience chunk 335 KB / 104 KB gzip

**Findings**

- No actionable P0, P1 or P2 visual or interaction findings remain.
- Intentional deviation: the XM-Games host toolbar and game map sit above the
  exact reference canvas so users can switch themes and enter real game routes.
- Publication boundary: the upstream MIT code notice is retained, but the
  upstream README separately restricts reuse of personal textures, images and
  copy. Permission must be confirmed before deploying these exact assets.

**Follow-up polish**

- P3: replace the reference portfolio labels and personal room content only
  after equivalent licensed/original textures exist; doing so now would reduce
  the requested visual fidelity.

final result: passed

## Alternating number-letter trail QA

### Scope and architecture

- The new `/alternating-trail` focus exercise follows the exact sequence
  `1-A-2-B…` while keeping stable ordinal IDs internally. The 25-, 36- and
  49-target modes end at `13`, `R` and `25` respectively.
- It reuses Schulte Grid's tested organic circular geometry, monotonic clock,
  stop/restart flow and three theme-specific layouts. Its records use a
  separate local-storage key, so Schulte and alternating-trail results cannot
  overwrite one another.
- The visible board never records a correct-tap state. Numbers, letters, SVG
  paths and hit regions remain byte-identical after progress; only the target,
  progress, timer and live status change.

### Responsive checks

| Theme / viewport | Measured result |
| --- | --- |
| Theme 1, 320×568 | 304×304 board; final visible section ends at y=548.3; history hidden at this extreme breakpoint; no clipped control or overflow |
| Theme 1, 375×667 | 320×320 board; history ends at y=626.2; no clipped control or overflow |
| Theme 1, 390×844 | 374×374 board; history ends at y=786.3; no clipped control or overflow |
| Theme 2, 320×568 | 288×288 board; dock ends at y=452.9 before tab bar at y=496.8; no clipped control or overflow |
| Theme 2, 375×667 | 343×343 board; history ends at y=556.3 before tab bar at y=595.8 |
| Theme 2, 390×844 | 352×352 board; history ends at y=645.3 before tab bar at y=772.8 |
| Theme 3, 320×568 | 285.6×285.6 board; telemetry ends at y=465.6 before navigation at y=494.8 |
| Theme 3, 375×667 | 336×336 board; history ends at y=569.4 before navigation at y=593.8 |
| Theme 3, 390×844 | 366×366 board; history ends at y=746.4 before navigation at y=770.8 |

- Chinese, English and Thai were checked at 320×568. The compact in-game
  titles, target labels and controls remained readable with no horizontal
  document overflow.

### Interaction and persistence checks

- Starting a round produced a new label permutation. Restart changed both the
  label order and the dynamically generated cell paths.
- A wrong `A` tap while target `1` was active kept progress at `0/49`, showed
  the penalty notice and increased displayed time by the one-second penalty
  plus normal clock time.
- Correct `1`, then `A`, advanced the target to `2` and progress to `2/25`;
  the complete board signature remained unchanged.
- Stop generated an incomplete recent result; reloading restored it. Existing
  Schulte history remained unchanged in its separate record store.
- The new Focus Training category appears between Board Games and Puzzle Games,
  with Schulte Grid first and Alternating Trail second.

### Automated checks

- `pnpm test` — 55 files, 384 tests
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build` — `/alternating-trail` statically generated with all 27
  application pages and existing LAN API routes
- `git diff --check`

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

---

# Theme Four design QA

**Source visual truth**

- Desktop entrance: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-audit/02-desktop-door-hover.png`
- Desktop corridor: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-audit/03-desktop-corridor.png`
- Mobile map: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-audit/12-mobile-menu-390x844.png`

**Rendered implementation evidence**

- Desktop entrance: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/desktop-entry-1440x900.png`
- Desktop corridor: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/desktop-corridor-1440x900.png`
- Mobile entry and corridor: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/mobile-entry-390x844.png`, `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/mobile-corridor-390x844.png`
- Mobile map final: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/mobile-map-final-390x844.png`
- Responsive game routes: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/mobile-2048-nav-390x844.png`, `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/mobile-bingo-390x844.png`, `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/mobile-schulte-390x844.png`

**Viewport and normalization**

- Desktop source and implementation: 1440 × 900 pixels, 1440 × 900 CSS pixels, device scale factor 1. No density normalization required.
- Mobile source and implementation: 390 × 844 pixels, 390 × 844 CSS pixels, device scale factor 1. No density normalization required.
- Small-screen implementation-only regression: 320 × 568 CSS pixels.
- States: entrance hover/focus language, entered corridor, room selected, map open, game route, and theme-switch state preservation.

**Full-view comparison evidence**

- Desktop entrance side by side: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/comparisons/entry-desktop-side-by-side.png`
- Desktop corridor side by side: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/comparisons/corridor-desktop-side-by-side.png`
- Mobile map before and after: `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/comparisons/map-mobile-side-by-side-before.png`, `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/xm-games-theme-four/comparisons/map-mobile-side-by-side-after.png`

**Focused-region comparison evidence**

- The map footer and close control were inspected at their exact bounding boxes after the first desktop defect.
- Mobile map content was measured directly: the final viewport exposes a constrained 405px scroll region for 1271px of content and keeps the close action inside the paper sheet.
- Mobile game boards were inspected separately because their typography, controls, and persistent navigation are too small to judge in a full-view entrance comparison.

**Required fidelity surfaces**

- Fonts and typography: serif display headings and compact monospaced labels preserve the reference's printed/sketchbook hierarchy. Chinese, English, and Thai retain the project's existing fallbacks and do not clip at tested widths.
- Spacing and layout rhythm: entrance door, sign, top controls, corridor perspective, room markers, bottom deck, and mobile paper map preserve the source hierarchy. 320px, 390px, and 1440px checks show no horizontal overflow or persistent-control collision.
- Colors and visual tokens: warm paper, graphite ink, muted teal, ochre, and coral replace the reference's personal palette while preserving the monochrome-to-watercolor interaction language and usable contrast.
- Image quality and asset fidelity: both visible scenes are original 1536-class raster assets encoded as WebP. No source personal artwork, inline SVG illustration, CSS drawing, placeholder, stretched screenshot, or copied character is used.
- Copy and content: all labels describe XM-Games rooms and real routes; the map exposes all 22 existing experiences. Copy is localized for Chinese, English, and Thai.
- Icons and affordances: Lucide icons use a consistent stroke family; door, map, room, previous/next, theme, language, settings, and route controls have semantic labels and visible focus states.
- Accessibility and motion: semantic buttons/links/dialog, keyboard arrows, scroll, drag/swipe, reduced-motion overrides, practical mobile targets, and focus-visible states were verified.

**Comparison history**

1. Desktop map footer — P2. The shared dialog-close selector compressed the text close action to icon width. Fixed by excluding `.theme-four-map-done`; post-fix evidence: `desktop-map-fixed-1440x900.png`.
2. Mobile map overflow — P1. The map grid expanded to 1271px inside an 828px dialog, hiding lower rooms and the close action. Fixed with `grid-template-rows: auto minmax(0, 1fr) auto`; post-fix grid is 625px with internal scrolling and the close action remains visible.
3. Classic game layout — P1. The first Theme Four 2048 render lacked the theme-owned board layout. Fixed by adding isolated Theme Four classic and Schulte layout suites; post-fix evidence: `mobile-2048-nav-390x844.png` and `mobile-schulte-390x844.png`.
4. Mobile map fidelity — P2. The first implementation filled the complete viewport while the source uses a paper sheet over a visible corridor. Fixed by constraining the sheet to 72dvh, anchoring it near the top, and lightening the mobile backdrop; post-fix evidence: `map-mobile-side-by-side-after.png`.

**Primary interactions tested**

- Switch Theme One → Theme Four from the real theme menu.
- Enter through the door and return outside.
- Change rooms with buttons, keyboard/wheel controls, and an actual horizontal drag.
- Open, scroll, and close the room map; launch 2048, Bingo, and Schulte Grid.
- Switch away from Theme Four and back while a 2048 board is active; tile state remained identical (`[2,4,2]`).
- Browser console checked after interaction run: no warnings or errors.

**Findings**

- No actionable P0, P1, or P2 findings remain.
- Intentional deviation: original generated XM-Games scenes and app-specific room content replace the reference creator's restricted personal characters, logos, text, textures, and portfolio narrative.

**Follow-up polish**

- P3: optional ambient audio could be added later only with a separately licensed or original sound asset and an explicit mute preference.

final result: passed

---

# Theme Four XM-Games room replacement QA (2026-08-09)

**Scope and root cause**

- The room return control existed inside the embedded 3D experience, but its
  original top offset placed it underneath the XM-Games host toolbar.
- The source portfolio's Gallery, Studio, About, and Contact components were
  still mounted after entering a door, so the room narrative remained the
  original author's even though the host shell had XM-Games branding.

**Implemented room architecture**

- The host sends a localized, route-derived game manifest to the same-origin
  Theme Four iframe. Navigation messages are accepted only from that exact
  iframe, at the current origin, and for routes present in the manifest.
- Gallery is now a dedicated **Game Hall** containing the project's real game
  routes. Contact is an **Offline Toolbox**. Studio is a **LAN Lounge** summary,
  and About describes XM-Games without duplicating playable entries.
- The original room component tree is no longer imported or prewarmed. Runtime
  room rendering uses a neutral paper-textured 3D shell plus localized
  XM-Games overlays.
- The original author avatar, achievement copy, console signature, empty-canvas
  contact solicitation, and unused avatar-animation preload list were removed
  from the runtime path.

**Rendered evidence**

- Final entrance branding:
  `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/xm-games-entrance-final.png`
- Desktop Game Hall and return control:
  `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/xm-games-game-hall-desktop-final.png`
- 320 × 568 Game Hall:
  `/Users/mimi/.codex/visualizations/2026/08/08/019fe27e-6119-75f1-bf78-eef9cb8ec0c8/itom-theme4-3d-qa/xm-games-game-hall-320-final.png`

**Interaction and responsive checks**

- Entered through the real WebGL entrance door, moved down the corridor, and
  clicked the real XM GAMES door.
- Desktop, 390 × 844, and 320 × 568 all keep the return control below the host
  toolbar. Returning completes the room-exit transition and restores the
  corridor.
- At 320px, the room paper measured 300px client width and 300px scroll width,
  with a 445px internal viewport for 1467px of catalog content: vertical
  scrolling is contained and there is no horizontal overflow.
- Clicking the visible BINGO entry navigated the parent application to the real
  `/bingo` route and rendered its BINGO heading.
- Browser console after the interaction run: no warnings or errors.

**Build evidence**

- Theme Four source build: 670 modules; room experience chunk 201.18 kB
  (66.12 kB gzip).
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` — 58 files, 397 tests
- `pnpm build` — Theme Four Vite build plus all 27 Next.js pages and LAN API
  routes generated successfully
- `git diff --check`

The remaining Vite message is its standard large-entry-chunk advisory; the
room experience itself remains lazy-loaded and was reduced to about 201 kB.

final result: passed

---

# Theme Four 3D room restoration final record (2026-08-09)

This final record supersedes the historical generic-shell room replacement
section immediately above it. Theme Four now imports and renders the original
Gallery, Studio, About, and Contact 3D room structures again; only their
portfolio content has been replaced with XM-Games games, tools, and narrative.

The detailed same-viewport comparisons, interaction evidence, fixes, and
validation results are recorded in **Theme Four original 3D room restoration
QA (2026-08-09)** above. The final production preview was restarted after the
complete build and no actionable P0, P1, or P2 findings remain.

final result: passed

---

# Theme Two Pocket selected-image implementation QA (2026-09-14)

## Scope and reference

User selected displayed option 2 unchanged: the blue-white pocket launcher. Reference file: `/Users/mimi/.codex/generated_images/019feb77-4fc5-7a12-9663-08490176993a/exec-27e5a9fb-12e8-4b4f-b07e-bf340342585d.png` (853 × 1844). The source and rendered page were normalized to 390 × 844 and visually inspected together, not separately scored from memory.

The implementation remains in the existing Next.js/PWA application, with an independent `theme-pocket` presentation and no new dependencies or domain-state rewrites. Secondary pages inherit the selected visual language; the mockup supplied only the home screen, so secondary page fidelity means coherent adaptation, not a claimed pixel match to nonexistent designs.

## Blocking findings and corrections

| Priority | Evidence | Correction | Result |
| --- | --- | --- | --- |
| P1 | Initial development compilation saw imports before new files existed | Completed the independent CSS files and invalidated the entry stylesheet; production compilation succeeds | Closed |
| P2 | `compare-v1.png`: tabs/game grid began about 10px too low and cumulative spacing pushed the anime entry under the dock at 390 × 844 | Reduced headline, grid row and section gaps; tuned document illustration footprint | Closed in `compare-final.png` |
| P2 | English at 320px broke Featured across two lines | Responsive 12–15px category labels with single-line layout | Closed: all four controls 36px high, scrollWidth equals clientWidth |
| P1 | Full verification found the test-only offline directory inventory omitted seven new files | Added the pocket directory to independent manifest coverage assertions; retained all previous directories | Closed: full suite passes |

## Final fidelity comparison

- Combined source/render: `output/theme-pocket-qa/compare-final.png` (reference left, implementation right). First iteration retained as `compare-v1.png`.
- Typography: same hierarchy of compact brand, prominent Chinese title, centered game labels, tool section heading and smaller descriptions. Native font rendering yields minor weight differences (P3).
- Spacing: 20px mobile gutters, three columns, approximately 106px illustrations, two game rows; feature and anime entries now appear above the dock at the reference viewport.
- Color: cool off-white background, clear blue selected pills and actions, pale blue feature card, white anime/dock surfaces. No theme-one black rules or coral blocks were reused.
- Imagery: seven fresh raster assets inserted separately. Small generated object/lighting differences from the reference remain cosmetic (P3); no placeholder or screenshot-as-UI substitution.
- Copy: selected Chinese home copy and ordering retained; all visible controls use working application actions. No unsupported counts, recent activity, account or settings-center section added.

## Responsive, behavior and regression evidence

- All 22 catalog routes checked at 390 × 844 and 320 × 740: theme remains pocket, page headers present, document width equals viewport, no horizontal overflow from main/section/article/input/textarea/navigation. JSON evidence: `routes-390.json`, `routes-320.json`.
- Screenshots visually inspected in contact sheets `secondary-contact.png`, `games-contact.png`, `games2-contact.png`; individual captures retained. Game boards preserve semantic colors and shared controls. Tool forms/results, watchlist and transfer entry remain intact.
- Desktop 1280 × 900: six-column home grid and two-column tool panels; `home-desktop.png`, `text-tool-desktop.png`.
- Chinese, English and Thai home states inspected at 320px; final English evidence `home-en-320.png`. Browser locale restored to Chinese.
- Category selection changes entries; game library exposes 16 entries, tools expose 6. Back-to-tools, home navigation and reload preserve the selected appearance.
- Text cleanup actual input `  Pocket QA  \n\nReady\nReady` produces `Pocket QA\n\nReady`. No clipboard export or user record mutation performed.
- Schulte start and click 1 produce target 2 and progress 1/25; navigated away without completing/stopping a recorded attempt.
- Sticky header observed while scrolling the text result. Safe-area and reduced-motion behavior covered by theme CSS and assertions; no claim of physical iPhone validation.
- Representative text-tool captures for retained themes: `regression-arcade.png`, `regression-glass.png`, `regression-paper.png`. Their layouts remain visually independent.

## Verification and limitations

`pnpm verify` passes: lint, TypeScript, both 3D builds, Next.js production build, 78 test files / 568 tests passed; 1 file / 2 tests remain skipped. Offline manifest includes 277 assets, including all seven pocket WebPs (82,548 bytes combined). Existing 3D chunk-size and runtime paper-texture warnings are unchanged.

No new P0/P1/P2 finding remains in the inspected scope. No device PWA installation, offline cold start or full 3D room regression was performed. All evidence is local under `output/theme-pocket-qa/`; no deployment or Git synchronization was authorized in this turn. Temporary viewport override restored; preview kept on the chosen theme.

final result: passed

## Follow-up: full game-cover consistency (2026-09-14)

User feedback identified a real visual inconsistency: the six original glossy game illustrations were mixed with ten generic line-icon tiles outside Featured. This supersedes the earlier acceptance of those fallback tiles; all 16 catalog games now have individual raster covers in the same 3D material family.

- Added 10 new 320 × 320 WebPs via built-in ImageGen, 163,872 bytes combined; existing covers and layout were not changed. All 17 pocket assets total 246,420 bytes, while the original featured payload remains 82,548 bytes.
- Inspected original generated images, optimized `all-covers.png` contact sheet, and three real category screenshots together in `output/theme-pocket-covers-qa/categories.png`. Chess subjects, number/letter tiles, matching stars, mine/flag and brick-breaker scene remain recognizable at thumbnail size.
- Browser: board 5/5, puzzle 6/6, arcade 5/5 covers loaded; full library 16 images loaded, zero line-icon fallback tiles. At 320px, all six puzzle images measured approximately 89.33px square and document width stayed 320px. Clicking the Memory Match cover opened `/memory-match` with its original game UI.
- Coverage regression started red with exactly the 10 missing routes, then passed. Offline inventory now includes all 287 assets. `pnpm verify` passed: lint, types, production builds, 569 tests; 2 existing tests skipped. No real-device offline cold-start claim.
- Production paths and exact prompt set: `docs/theme-pocket-cover-prompts.md`. No Git commit, push or deployment performed.

final result: passed

## Follow-up: tool artwork consistency (2026-09-14)

The user identified the remaining mismatch between glossy game covers and line-icon tool entries. All six tool entries now use the same 3D illustration family; the home anime shortcut reuses its catalog artwork, and text cleanup reuses the existing transparent document illustration. Header/dock controls and navigation arrows remain outline UI glyphs. No tool logic or other theme was changed.

- Built-in ImageGen produced five independent covers from the existing documents and 2048 style references; no screenshot-as-UI or new icon library. Exact prompts: `docs/theme-pocket-tool-prompts.md`. QR artwork is decorative, not a generated user QR code.
- Production assets are 320 × 320 WebP quality 85. New files total 52,102 bytes; the six tool images total 65,174 bytes, all 22 theme assets 298,522 bytes, and featured home plus both tool illustrations 91,716 bytes. Existing game budget stays independently enforced.
- Visually inspected optimized `tools-contact.png`, `tools-390.png`, `home-390.png`, `tools-320.png`, and `tools-desktop.png` under `output/theme-pocket-tools-qa/`. All six artwork frames remain 48 × 48px and images loaded at mobile/desktop widths. No horizontal overflow at 320, 390 or 1280px. At 390 × 844, the home anime card ends about 10px above the dock. Desktop keeps two columns.
- Clicking the JSON entry navigates to the original JSON tool UI. Text and action semantics remain intact; decorative images have empty alt text, with accessible entry names provided by existing localized titles/descriptions.
- New coverage checks first failed on the old line-icon home and five missing files, then passed. Offline manifest now contains 292 files. Full `pnpm verify` passes lint, types, both 3D builds, Next.js production build, 78 test files / 570 tests; 1 file / 2 tests remain skipped. Existing 3D warnings unchanged. No real-device offline cold-start claim.
- Viewport override reset; preview retained on the chosen theme's tools section. No commit, push or deployment performed.

final result: passed
