"""
F1 AI Race Engineer - Standalone Desktop Launcher
"""
import os
import sys
import webbrowser
import threading
import time

# Ensure base and backend directories are in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.main import app
import uvicorn

def open_browser():
    time.sleep(1.2)
    try:
        webbrowser.open("http://localhost:8080")
    except Exception:
        pass

if __name__ == "__main__":
    print("=" * 65)
    print("  F1 AI Race Engineer - Real-time Pit Wall Telemetry & Radio")
    print("  Web UI: http://localhost:8080")
    print("  Listening for F1 UDP Telemetry on 20777")
    print("=" * 65)
    threading.Thread(target=open_browser, daemon=True).start()
    uvicorn.run(app, host="0.0.0.0", port=8080, log_level="info")
