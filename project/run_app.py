"""
F1 AI Race Engineer - Standalone Desktop Launcher
(same as `python backend/main.py`: starts the server and opens the web UI)
"""
import os
import sys

# Ensure base and backend directories are in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.main import run

if __name__ == "__main__":
    run(open_browser="--no-browser" not in sys.argv[1:])
