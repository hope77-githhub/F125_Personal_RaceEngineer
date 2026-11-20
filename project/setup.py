"""
cx_Freeze setup script for F1 AI Race Engineer
Packages the backend, static frontend dist, and voice telemetry clips into a standalone Windows .exe.
"""
import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from cx_Freeze import setup, Executable

# Files and directories to bundle with the binary
include_files = [
    (os.path.join(BASE_DIR, "backend", "data"), os.path.join("backend", "data")),
    (os.path.join(BASE_DIR, "frontend", "dist"), os.path.join("frontend", "dist")),
]

debug_file = os.path.join(BASE_DIR, "docs", "debug_payload.json")
if os.path.exists(debug_file):
    include_files.append((debug_file, os.path.join("docs", "debug_payload.json")))

build_exe_options = {
    "packages": [
        "uvicorn",
        "fastapi",
        "starlette",
        "wsproto",
        "asyncio",
        "ctypes",
        "json",
        "logging",
        "telemetry",
        "state_mgmt",
        "circuit_data",
    ],
    "excludes": [
        "torch",
        "torchvision",
        "torchaudio",
        "scipy",
        "matplotlib",
        "tkinter",
        "pandas",
        "PyQt5",
        "PyQt6",
        "PySide6",
        "test",
        "unittest",
    ],
    "include_files": include_files,
    "include_msvcr": True,
}

setup(
    name="F1RaceEngineer",
    version="1.0.0",
    description="F1 AI Race Engineer - Pit Wall Telemetry & Engineer Radio Engine",
    options={"build_exe": build_exe_options},
    executables=[
        Executable(
            script="run_app.py",
            target_name="F1RaceEngineer.exe",
            base="Console",
        )
    ],
)
