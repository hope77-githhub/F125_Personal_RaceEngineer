# TV Overlay

A broadcast-style HUD for **F1 25** drawn from the game's UDP telemetry. It runs in a transparent window on top of
the game (Electron) or as an OBS Browser Source. It never touches the game's files or memory.

Part of **F1 AI Race Engineer**. The overlay started from the open-source
[f1-25-tv-overlay](https://github.com/thenotrealuser/f1-25-tv-overlay) (MIT licence, see [`LICENSE`](LICENSE) and
[`UPSTREAM.md`](UPSTREAM.md)) and has been reworked for this app. It is an independent fan project, not an official
product of Formula 1, the FIA, EA or any team.

## Running it with F1 AI Race Engineer

There is one switch: **📺 TV** in the web app (the setup screen card or the dashboard header). It is **ON by default**
and remembered between runs.

| Step | What happens |
|---|---|
| App starts | The app listens for the game on UDP `20777`. Nothing is drawn yet. |
| First game packet | The overlay starts by itself: server on `http://127.0.0.1:8090/`, transparent window on top of the game. |
| While you drive | The app forwards every game packet to the overlay on UDP `20778`. Replays are forwarded too, so you can try it without the game. |
| Switch OFF / app closed | The overlay window and server close. |

The overlay window (Electron, about 370 MB) is downloaded **once**, only when you press **Install** on the TV card.
At start the app writes the official turn maps of 24 tracks into `curvas/`, so the TURN number is right from the first lap.

Run the game in **Windowed (Fullscreen)** / borderless mode so the window can sit on top of it (no window can draw
over exclusive fullscreen). While the switch is ON the window keeps itself above the game — after Alt+Tab, a minimise
or show-desktop it takes the top again within half a second, without ever taking the game's focus.

## What it shows

- **Timing tower** — positions, intervals, tyres, pit and retirements. The header reads `SPRINT` in a sprint race and
  `FIA Formula 1 World Championship` otherwise; practice and qualifying show the session (`FP1`, `Q2`, …) and the time
  left, plus the elimination-zone line in Q1/Q2.
- **Lap cards**
  - *Practice / qualifying:* up to 3 cards at the **top centre** — your car first, then cars on a flying lap. Each
    shows the live lap time, the reference time and driver, a 5-second delta when a sector closes, and S1/S2/S3 bars
    (green = personal best, purple = session best, yellow = slower).
  - *Race:* one card at the bottom right with **only your own times** — live lap time, sector delta against your own
    best lap, `BEST LAP`, and sector colours. S3 is worked out when you cross the line (last lap − S1 − S2) and the
    closed lap stays on screen for 5 s.
- **Halo HUD** (centred TV-pod camera) — speed in km/h and mph, gear, an RPM bar scaled to the car's max RPM,
  brake (left) and throttle (right) gauges around the dial, ERS, Boost / Overtake / Active Aero states
  (DRS in the 2025 format), the official turn number, and the names of your car and the car ahead.
  Pill states: grey = unavailable, pulsing green outline = ready, solid green = in use, yellow = active-aero zone ahead.
- **Race control** — yellow flag, Safety Car, VSC and red flag in the tower header; a VSC/SC delta panel only while the
  game sends a recent delta; an 8-second purple fastest-lap banner.
- **Onboard card** — name, team and number of the viewed driver (off by default; the game does not report the camera).

## Control panel and hotkeys

Open `http://127.0.0.1:8090/control` (standalone: port `8080`). Every HUD can be switched on/off, moved and resized
(0.3× to 3×); the halo also has a position and size per team. **Automatic** mode follows the session type;
**Qualifying** and **Race** force a layout.

| Global hotkey (overlay window open) | Action |
|---|---|
| `Ctrl+Alt+H`, `Ctrl+Shift+H` or `Ctrl+Alt+F10` | Whole HUD |
| `Ctrl+Alt+T` | Timing tower |
| `Ctrl+Alt+K` | Lap cards (practice / qualifying) |
| `Ctrl+Alt+L` | My lap card (race) |
| `Ctrl+Alt+G` | Halo |
| `Ctrl+Alt+O` | Onboard card |
| `Ctrl+Alt+F` | Tower alerts and VSC/SC delta |
| `Ctrl+Alt+V` | Fastest-lap banner |
| `Ctrl+Alt+M` | Cycle Automatic → Qualifying → Race |
| `Ctrl+Alt+E` or `Ctrl+Shift+E` | Edit mode |

Each action has a second hotkey in case another program has taken one; a short notice at the bottom of the screen
says whether they all registered. With the overlay page focused in a browser, the keys `H T K L G O F V M` do the same.

**Edit mode:** pause the game from its own menu, press `Ctrl+Alt+E`, drag a HUD to move it, use the yellow corner or
the mouse wheel to resize it, double-click to reset, and leave with `Esc`. Data stays frozen while you edit. Positions
and sizes are saved in `hud-offsets.json`, `hud-scales.json` and `halo-layouts.json` (personal, never committed).

Page options: `?gap=leader` shows the gap to the leader instead of the car ahead, `?rows=10` limits the tower to ten
rows, `?theme=original` turns the broadcast theme off.

## Running it on its own

Don't run these while F1 AI Race Engineer is running — both want UDP port `20777`.

| Launcher | What it does |
|---|---|
| `start-overlay.bat` | Installs Electron on the first run, starts the server and the transparent window |
| `start-server.bat` | Server only: open `http://127.0.0.1:8080/` in a browser or add it to OBS as a Browser Source (transparent, same size as your scene) |
| `start-demo.bat` | Simulated race, no game needed (`node server.js --demo --quali` for qualifying) |

Game settings (Settings → Telemetry): UDP telemetry **On**, broadcast mode **Off**, IP `127.0.0.1`, port `20777`,
20–60 Hz, format **2026** for the 2026 Season Pack.

## Where the data comes from

```text
F1 25 ──UDP──> server.js ──HTTP/SSE──> overlay.html  (Electron window / browser / OBS)
                               └─────> control.html
```

| Packet | Used for |
|---|---|
| Session (1) | session type, total laps, time left, SC/VSC state, marshal-zone yellow flags |
| Lap data (2) | positions, lap and sector times, pit state, VSC/SC delta, lap distance (turn number) |
| Event (3) | `FTLP` fastest lap, `RDFL` red flag, `SCAR` safety car |
| Participants (4) | names, teams, numbers |
| Car telemetry (6) | speed, gear, RPM, brake, throttle, steering |
| Car status (7) | tyres, ERS store and mode (Boost), flag shown to the player, max RPM |
| Session history (11) | best laps and best sectors |
| Car telemetry 2 (16) | 2026 active aero and overtake state and activation distances |

Spec: [EA 2026 Season Pack UDP structures](https://forums.ea.com/t5/s/tghpe58374/attachments/tghpe58374/f1-games-game-info-hub-en/61/8/2026%20Season%20Pack%20Telemetry%20Output%20Structures%20(1).txt).
Delta sign: [FIA explanation](https://www.fia.com/news/fia-insights-developing-new-delta-for-double-yellow-flag-zones).

The game sends no "delta required now" flag. The delta panel therefore needs a recent non-zero value; a delta that
stays at exactly zero for over a second can hide it even if it is still required.

## Diagnostics and checks

| Command | Purpose |
|---|---|
| `diagnose.bat` | Records one packet per type to `dump/id*-size*.bin` and samples your car every 500 ms to `dump/player-samples.jsonl`. `dump/` is local and git-ignored — it can contain your session data, so review it before sharing. |
| `node check-dump.js` | Checks parsing of the packets recorded in `dump/` |
| `node check-turns.js` | Tests turn learning on a synthetic track |
| `node check-window.js` | Checks that the window starts and registers its hotkeys, without opening it |
| `node server.js` + `node replay-dump.js` | Replays the recorded packets to a local server (a frozen sample, not a moving lap) |

## Known limits

- The telemetry does not say which camera is active: switch the onboard card and the halo by hand.
- The halo position differs between teams, cars, cameras and resolutions: calibrate it per team in `/control` or edit mode.
- Brake and throttle follow the values the game sends; a device that only sends 0 % / 100 % gives binary bars.
- The 2026 battery scale is experimental. The 2025 format keeps the older parser and has not been checked with a real capture.
- SC/VSC, red-flag and fastest-lap transitions and S3 over a full race still need real captures to confirm.
- On tracks without an official turn map the overlay learns the corners on the first clean lap; learned numbers can
  differ from the official ones (edit or delete `curvas/<trackId>.json` to relearn).

## If something does not appear

| Symptom | Check |
|---|---|
| Nothing on screen | TV switch ON, a session started, UDP telemetry on with the right IP/port/format, whole HUD on (`Ctrl+Alt+H`) |
| Shows in a browser but not over the game | Game in Windowed (Fullscreen); the overlay window is installed and running |
| Halo misaligned | `/control` → pick the team and adjust, or edit mode |
| Race lap card missing | It only shows in races; check `Ctrl+Alt+L` and the button in `/control` |
| A hotkey does nothing | Another program took it: use the second hotkey or the button in `/control` |

## Licence and artwork

The original overlay code is MIT-licensed; its licence text must stay in [`LICENSE`](LICENSE). Formula 1, FIA, EA and
team names, marks, logos and fonts belong to their owners. Official artwork is never committed: put your own files in
[`local-assets/`](local-assets/README.md) (git-ignored) for personal use.
