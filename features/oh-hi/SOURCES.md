# 0h h1 integration

- Upstream: <https://github.com/florisluiten/0hh1>
- Pinned reference: `25910e580d6ea6bc1dfbfd29b2637e47844a96f9`
- Original game and source: Q42, 2014; MIT license (see `LICENSE`).
- Reference implementation: `js/grid.js`, `generateFast`, `breakDown`, `isValid`.

The original balanced-row combination generation and clue-removal approach has
been adapted into TypeScript. This integration adds exhaustive uniqueness checks,
immutable interaction state, keyboard controls, touch controls, three languages,
and theme palettes. The React UI is new; no assets or code from the newer closed
website build are used. No jQuery, web fonts, analytics or remote services are
required at runtime.
