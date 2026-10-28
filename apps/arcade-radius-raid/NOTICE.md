# XM Games · Radius Raid / 半径突袭

Based on Jack Rugile's Radius Raid (MIT), commit
`016cb866b6078672e37a1691bd9fe555364dbf58`, retrieved 2026-10-28.
The actual upstream engine is retained in `upstream/js`: all thirteen enemy
definitions, five power-ups, level distributions, combat, particles and scoring.

XM Games modifications: isolated full-viewport entry, mobile movement pad and
auto-aim/fire, localized DOM menus/HUD, responsive camera, theme materials,
safe storage, explicit pause/resume and frame teardown. External links and the
collection-specific desktop menus are omitted from the mounted UI.

The game uses procedural canvas artwork. Its bundled recorded sounds have been
replaced with synthesized Web Audio effects so the package needs no separately
licensed media. The unused upstream Howler library, recorded-audio adapter and
Storage-prototype adapter are omitted; the selected source uses XM's small
synthesizer and safe namespaced storage adapters instead.
