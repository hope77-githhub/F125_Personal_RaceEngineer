# 🏎️ F1 AI Race Engineer Dashboard

> **Institutional-grade telemetry, corner-by-corner kinematics, and real-time race strategy for F1 25 / F1 26.**

A high-performance web dashboard that captures real-time high-speed UDP telemetry (port `20777`) from EA SPORTS™ F1 25 / F1 26, analyzing turn-by-turn kinematics, tire degradation, and circuit telemetry to provide drivers with professional pitwall-grade engineering insights.

Built with the Coinbase Design System aesthetic—combining a deep dark hero band, crisp white editorial canvas, soft surface elevations, and tabular `JetBrains Mono` typography for high data density and readability.

---

## 📸 Screenshots

| 1. Session Configuration & Replay | 2. Lap Archive & Corner Telemetry |
| :---: | :---: |
| ![Session Configuration](project/docs/images/01_session_configuration.png) | ![Lap History and Setup](project/docs/images/02_lap_history_and_setup.png) |
| Replay circuit selection, 60Hz UDP port, AI voice persona | Multi-lap history, corner entry/apex/exit metrics, setup & wear |

| 3. Turn-by-Turn Kinematics Matrix | 4. Interactive Circuit Map & Sectors |
| :---: | :---: |
| ![Corner Analysis Matrix](project/docs/images/03_corner_analysis_matrix.png) | ![Circuit Map and Sectors](project/docs/images/04_circuit_map_and_sectors.png) |
| Full corner table (T1~TN) with speed, gear, pedals, brake point, G-force | Vector racing line, clickable dynamic apex markers, split timing |

---

## ✨ Key Features

### 1. Advanced Session Configuration & Replay
* **Live & Replay Modes**: Stream live from the game at 60Hz or replay pre-recorded telemetry files (Catalunya 9 Laps, Austria, etc.) at 1x to 4x playback speed.
* **i18n & Unit Conversion**: Real-time switching between English (ENG) / Korean (KOR) and Metric (km/h, °C) / Imperial (mph, °F).
* **AI Engineer Persona**: Select your race engineer voice persona (GP for Max Verstappen, Bono for Lewis Hamilton, Ricky for Carlos Sainz).

### 2. High-Fidelity Packet Parsing & Kinematics Engine
* **Full C-Struct Parsing**: `Packet 0` (Motion), `Packet 1` (Session), `Packet 2` (Lap Data), `Packet 4` (Participants), `Packet 5` (Car Setups), `Packet 6` (Car Telemetry), `Packet 10` (Car Damage), `Packet 11` (Session History).
* **Turn-by-Turn Telemetry & Kinematics**:
  * Entry, Apex, and Exit speeds (`km/h`), gear selection, throttle %, and brake %.
  * Precise Braking Point (`m`) detection and Throttle-On (`m`) re-application point.
  * Lateral G-load (`Max G`) and live rival comparison (`vs Ahead` / `vs Leader`).

### 3. Interactive Multi-Lap History
* Click any completed lap (`Lap 1` through `Lap 9`) or `LIVE` buffer to inspect turn-by-turn telemetry cards.
* Official millisecond lap and sector times (`S1, S2, S3`) directly parsed from `SessionHistory`.

### 4. Interactive Circuit Map
* Smooth SVG vector racing line generated from high-density circuit coordinates.
* Interactive corner markers (`T1 ~ T11`) tracking the driver's dynamic apex (actual minimum speed location) per lap.
* Click any corner on the map to inspect its telemetry profile.

---

## 💻 Quick Start

### 1. Backend
```bash
cd project/backend
# Activate your python virtual environment
python main.py
```
* Runs at `http://localhost:8080`. With the pre-parsed disk cache (`_parsed_laps_cache_v3.json`), server startup and lap preloading take only ~28ms.

### 2. Frontend
```bash
cd project/frontend
npm install
npm run dev
```
* Open your browser at `http://localhost:5173`.

---

## 📖 Documentation
* [Data Structure & Rendering Architecture Guide](project/docs/DATA_AND_RENDERING_GUIDE.md)
* [Coinbase Design System Specification](project/frontend/DESIGN-coinbase.md)
