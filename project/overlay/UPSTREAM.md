# Upstream: f1-25-tv-overlay

Vendored from <https://github.com/thenotrealuser/f1-25-tv-overlay> at commit `9e9181d` (2026-10-14),
MIT License — Copyright (c) 2026 thenotrealuser and contributors (see `LICENSE`).

## What is included
Everything needed to run the overlay: `server.js`, `overlay.html`, `control.html`, `curvas.js`,
the Electron window (`janela/`), diagnostics and the original Windows launchers.
**Not included:** `docs/referencias/*.png` — third-party screenshots that the upstream project marks as
not covered by its MIT license.

## How F1 AI Race Engineer runs it
The upstream code is unchanged. Our backend (`backend/overlay_manager.py`) starts it with:

| Setting | Value | Why |
|---|---|---|
| `UDP_PORT` | `20778` | the game sends to our app on 20777; we forward every packet to 20778 |
| `HTTP_PORT` | `8090` | our dashboard already uses 8080 |
| `NO_OPEN` | `1` | don't pop up the browser control panel |
| `OVERLAY_URL` (Electron) | `http://127.0.0.1:8090/` | the window shows the overlay page |

In replay mode our backend re-encodes the recorded packets to the binary 2026 layout and sends them to
the overlay too, so the overlay can be tested without the game.

The original `.bat` launchers still work for running the overlay on its own (ports 20777 / 8080) —
don't run them at the same time as our app.
