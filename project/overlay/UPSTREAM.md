# Upstream: f1-25-tv-overlay

Vendored from <https://github.com/thenotrealuser/f1-25-tv-overlay> at commit `9e9181d` (2026-10-14),
MIT License — Copyright (c) 2026 thenotrealuser and contributors (see `LICENSE`).

## What is included
Everything needed to run the overlay: `server.js`, `overlay.html`, `control.html`, `curvas.js`,
the Electron window (`janela/`), diagnostics and the Windows launchers.
**Not included:** `docs/referencias/*.png` — third-party screenshots that the upstream project marks as
not covered by its MIT license.

## Local changes
The overlay is now maintained as part of F1 AI Race Engineer and has diverged from upstream:

| File | Change |
|---|---|
| `theme-broadcast.css` | **new** — look tuned to an in-game broadcast-overlay reference (Singapore sprint, 1920x1080): tower position/size/row height measured to the pixel, salmon P1 box, compound shown as a coloured letter, "Interval" on the leader row, **Saira** (SIL OFL) at 118 % width as the closest open match to the reference type |
| `theme-broadcast.js` | **new** — colours the compound letters, formats "LAP 36 / 62", one-decimal intervals ("+5.3", "+1:01.1", "Out"), race header "FIA Formula 1 World Championship" (sprint keeps SPRINT), loads optional artwork from `local-assets/`; **TV-pod halo layout**: re-lays the halo HUD in a 1247x702 frame (sizes and side elements measured from a broadcast TV-pod frame) fitted to F1 25's own TV Pod camera: the arc traces the car's halo top edge and the dial cluster hangs under its top bar (measured on an in-game screenshot; per-team calibration still shifts/scales the whole frame); brake (left) and throttle (right) are crescents of 28 thin horizontal bars around the dial (the 12 upstream bar rects are replaced by 28 paths with the same class and data-active-color; the overlay fills group.children by value × count), recharge/deploy are curved bands outside them with stacked letters; TURN and ACTIVE AERO are mirrored boxes at the same height, each tilted to the halo arc's slope at its position (about ±25°), with their text drawn in the box's own frame; turn box, active aero (state shown by the two aero lines), gears on the halo curve with the RPM bar under them (filled from the RPM value, scaled to the car's max RPM from the state stream), viewed driver + car ahead along the halo. Only what the broadcast shows is drawn — brake/throttle %, ERS %, the RPM number and the turn total stay hidden so no text overlaps. The live SVG nodes are moved, not recreated |
| `halo-fit.js` | **new** — halo auto-fit: finds the car's halo top bar in a screen capture (column edge candidates + RANSAC parabola) and turns its apex and curvature into a per-team halo profile; `janela/main.js` captures the screen (Ctrl+Alt+A, the `/control` button, or automatically for a team without a profile); `check-halo-fit.js` tests it |
| `local-assets/` | **new, git-ignored** (except its README) — your own `logo.*`, `fonts/*`, `teams/<team>.*`; official artwork is never committed |
| `overlay.html` | Saira font + theme stylesheet in `<head>`, theme script before `</body>` (`?theme=original` disables the theme); lap cards: practice/quali cards at the top centre (max 3), the race card shows only the player's own times; the unstyled debug status line and the pause banner are removed; the hotkey toast is a small pill at the bottom |
| `server.js` | routes `GET /theme-broadcast.css`, `/theme-broadcast.js`, `/local-assets/index.json`, `/local-assets/<file>` (path-traversal guarded); `/api/ui` also accepts `{"set": key, "value": bool}` (our app switches the halo on at start); with a known turn map the TURN counter also follows the lap-data packet, not only car telemetry |
| `curvas/<trackId>.json` | written at start by our app (`backend/overlay_manager.py`) from `backend/circuit_data/*_corners.json`: official turn numbers for 24 tracks. Learned or our own files are replaced; hand-edited ones are kept |
| `.gitignore` | ignore `local-assets/*` |
| **English only** | every on-screen text, toast, banner, the `/control` page, log line, code comment and doc is English (upstream was Portuguese). Session labels read `FP1`/`QUALI`/`RACE`; dump files are `id*-size*.bin` (old `id*-tam*.bin` still read) |
| renamed files | `iniciar.bat` → `start-server.bat`, `iniciar-overlay.bat` → `start-overlay.bat`, `iniciar-demo.bat` → `start-demo.bat`, `diagnostico.bat` → `diagnose.bat`, `verificar-dump.js` → `check-dump.js`, `verificar-curvas.js` → `check-turns.js`, `verificar-janela.js` → `check-window.js`. `janela/` and `curvas/` keep their names (the app and the installed Electron depend on them) |
| docs | `README.md` rewritten in English for this app; upstream's `LEIA-ME.md` and `programa.md` merged into it and removed |

## How F1 AI Race Engineer runs it
Our backend (`backend/overlay_manager.py`) starts it with:

| Setting | Value | Why |
|---|---|---|
| `UDP_PORT` | `20778` | the game sends to our app on 20777; we forward every packet to 20778 |
| `HTTP_PORT` | `8090` | our dashboard already uses 8080 |
| `NO_OPEN` | `1` | don't pop up the browser control panel |
| `OVERLAY_URL` (Electron) | `http://127.0.0.1:8090/` | the window shows the overlay page |

In replay mode our backend re-encodes the recorded packets to the binary 2026 layout and sends them to
the overlay too, so the overlay can be tested without the game.

The `.bat` launchers still run the overlay on its own (ports 20777 / 8080) —
don't run them at the same time as our app.
