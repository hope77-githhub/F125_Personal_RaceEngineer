# F1 AI Race Engineer - Development History & Guide

## 1. Project Context & Goal
*   **Goal:** Build a real-time Race Engineer Dashboard for the F1 26 game using UDP telemetry.
*   **Current State:** Phase 1 (UI) and Phase 2 (Backend UDP Parsing) are functionally complete. 
*   **Next Steps:** Wait for Phase 3 (AI Voice TTS) real data integration, and plan Phase 4 (Overlay).

## 2. Architecture Overview
*   **Backend (Python):** Listens to UDP packets on a specified port (default 20777), parses them using `ctypes` (`f1_types/`), and aggregates them in `StateManager` (`manager.py`). 
*   **Frontend (React/Vite):** Connects to the Backend via WebSocket (`ws://localhost:8080/ws`) at 60Hz. Renders a comprehensive UI with SVG-based real-time XY graphs for speed and pedal inputs.
*   **Current Mode (UI Testing):** The Frontend is currently running completely standalone for UI testing using `dummyData.js`. The backend WebSocket connection in `App.jsx` has been replaced with a `setInterval` that generates fake 60Hz updates.

## 3. Key Milestones Achieved (as of Session End)
1.  **C-Struct UDP Parsing:** Fully mapped the F1 26 29-byte Header, Lap Data, Participants, Car Setups, Car Telemetry, and Car Damage into Python `ctypes.LittleEndianStructure`.
2.  **State Manager & Buffering:** Built `manager.py` to sample 60Hz telemetry into 20 track sectors per lap, automatically storing lap history when cars cross the finish line.
3.  **Setup UI & i18n:** Built a pre-session Setup UI allowing UDP Port, Telemetry Rate, Unit (Metric/Imperial), TTS Persona, and Language (KOR/ENG) selection.
4.  **Live Telemetry SVG Graphs:** Replaced static progress bars with smooth, 60Hz scrolling X-Y SVG graphs for:
    *   Speed (with multi-player toggleable overlay lines).
    *   Throttle & Brake pedal work.
5.  **React State Bug Fixes:** Fixed severe stale-state and ReferenceError bugs related to aggressive 60Hz WebSocket re-renders erasing object references.

## 4. Instructions for the Next Chat Session
*   **To Resume Frontend Development:** Run `npm run dev` in `f1-ai-race-engineer/frontend`. The UI is powered by `dummyData.js` and does not require the backend.
*   **To Resume Backend Integration (Phase 2 -> Real Game):** 
    1.  Restore the WebSocket connection logic in `App.jsx` (remove `setInterval(..., getDummyPayload)`).
    2.  In `main.py`, uncomment `payload = state_manager.get_frontend_payload(units=units)` inside the `websocket_endpoint` loop.
    3.  Launch F1 26 and ensure UDP telemetry is broadcasting to port `20777`.
*   **For Phase 3 (AI Voice):** Begin designing the ZeroMQ/IPC bridge to send `strategy` strings to a Coqui XTTSv2 worker process.

## 5. File Structure
*   `f1-ai-race-engineer/`
    *   `backend/`: Python FastAPI & Socket listeners.
        *   `telemetry/f1_types/`: C-types packet definitions.
        *   `state_mgmt/`: `manager.py` (Real logic) & `dummy_provider.py` (Dummy logic).
    *   `frontend/`: React Vite app.
        *   `src/dummyData.js`: Standalone data generator.
        *   `src/App.jsx`: Main Dashboard component.
    *   `docs/`: Project documentation and architecture designs (`design.md`, `data_structure.md`).
