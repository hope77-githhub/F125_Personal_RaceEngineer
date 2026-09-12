# F1 AI Race Engineer Dashboard

This project is a **Race Engineering Dashboard** that analyzes real-time UDP telemetry data from the F1 26 game, providing players with strategic insights and detailed turn-by-turn lap comparisons.

## 🚀 Current Features

**Phase 1 (UI/Dummy Integration)** and **Phase 2 (Real UDP Packet Parsing Architecture)** have been successfully completed.

### 1. Advanced Session Setup UI
Configure your race environment easily via the web-based Setup UI.
*   **i18n Support:** Fully supports English (ENG) and Korean (KOR) UI with real-time switching.
*   **Unit Conversion:** Supports Metric (km/h, °C) and Imperial (mph, °F) systems.
*   **Telemetry Rate:** Choose between 30Hz or 60Hz data refresh rates based on your network environment.
*   **Engineer Persona Selection:** Select your AI Engineer's voice persona (e.g., GP for Max Verstappen, Bono for Lewis Hamilton, Ricky for Carlos Sainz).

### 2. Perfect Binary Packet Parsing (F1 26 UDP C-Struct Parsing)
A robust Python backend pipeline built with `ctypes` decodes the massive binary telemetry packets sent by the F1 26 game without dropping a single byte.
*   **Packet 1 (Session):** Parses track metadata including track temp, weather, and track length.
*   **Packet 2 (Lap Data):** Tracks lap times, sector times, current positions, and delta times to cars ahead/leader.
*   **Packet 4 (Participants):** Matches real names and nationalities for multiplayer and AI drivers.
*   **Packet 5 (Car Setups):** 100% decoding of the 49-byte setup data (suspension, wing angles, tyre pressures, etc.).
*   **Packet 6 (Car Telemetry):** Captures 60Hz pedal inputs (brake/throttle), speed, gear, and engine RPM.
*   **Packet 10 (Car Damage):** Extracts exact tyre wear percentages and car damage metrics.

### 3. Turn-by-Turn Lap Analysis & XY Graphs
Telemetry data is buffered and grouped by sectors (~5% intervals of the track) per lap to provide deep analytical insights.
*   **Comparison Toggle:** Compare your telemetry against the **'Car Ahead'** or the **'Race Leader'**.
*   **Live Speed Graph (XY):** A dynamic, scrolling SVG graph showing your speed overlaying your rivals' speeds in real-time. Features toggleable visibility for each player.
*   **Pedal Work Graph (XY):** A smooth, real-time scrolling graph showing Throttle (Green) and Brake (Red) inputs to analyze trail braking and pedal application.

---

## 🛠️ Planned Features

### Phase 3: AI Voice Feedback (Voice Cloning TTS) - ⏳ Pending Data
*   Utilize local AI models (e.g., Coqui XTTSv2) to clone the voices of real F1 engineers (GP, Bono, etc.) based on the persona selected in the Setup UI.
*   Convert AI strategy text into real-time WAV audio streaming for hands-free audio feedback while racing.

### Phase 4: Transparent Overlay HUD
*   Implement an Electron or Windows Form-based transparent overlay to display the dashboard directly over the game screen without interrupting gameplay.

---

## 💻 Tech Stack
*   **Backend:** Python 3 (FastAPI, WebSockets, `ctypes` for C-struct Memory Mapping)
*   **Frontend:** React (Vite), CSS Grid & Flexbox, Native SVG for real-time charting, i18n
*   **Architecture:** Data Pipeline (UDP Listener ➡️ Router ➡️ StateManager ➡️ WebSocket)
