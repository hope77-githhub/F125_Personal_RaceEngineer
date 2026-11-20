"""
Runs the vendored TV overlay (project/overlay, MIT, github.com/thenotrealuser/f1-25-tv-overlay)
next to the dashboard and feeds it telemetry.

The game can only send UDP to one port, and our app already listens on 20777. So the overlay's
Node server is started on UDP 20778 / HTTP 8090, and every packet we receive is forwarded to it
(replays are re-encoded to binary first, see telemetry/encoder.py). An Electron window shows the
overlay transparently on top of the game (game must be in borderless / windowed-fullscreen).
"""
import json
import logging
import os
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.request

logger = logging.getLogger(__name__)

IS_WIN = sys.platform == "win32"


def _port_busy_udp(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.bind(("0.0.0.0", port))
        return False
    except OSError:
        return True
    finally:
        s.close()


def _port_busy_tcp(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.3)
    try:
        return s.connect_ex(("127.0.0.1", port)) == 0
    finally:
        s.close()


class _KillOnExitJob:
    """Windows Job Object with KILL_ON_JOB_CLOSE: every process assigned to it (and the processes
    those start, e.g. Electron's renderer/GPU processes) is killed by Windows when this app exits —
    even on a hard kill or a closed console window, where Python's shutdown hooks never run."""

    def __init__(self):
        self.handle = None
        if not IS_WIN:
            return
        try:
            import ctypes
            from ctypes import wintypes
            k32 = ctypes.WinDLL("kernel32", use_last_error=True)

            class IO_COUNTERS(ctypes.Structure):
                _fields_ = [(n, ctypes.c_ulonglong) for n in (
                    "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
                    "ReadTransferCount", "WriteTransferCount", "OtherTransferCount")]

            class BASIC(ctypes.Structure):
                _fields_ = [("PerProcessUserTimeLimit", ctypes.c_longlong), ("PerJobUserTimeLimit", ctypes.c_longlong),
                            ("LimitFlags", wintypes.DWORD), ("MinimumWorkingSetSize", ctypes.c_size_t),
                            ("MaximumWorkingSetSize", ctypes.c_size_t), ("ActiveProcessLimit", wintypes.DWORD),
                            ("Affinity", ctypes.c_size_t), ("PriorityClass", wintypes.DWORD),
                            ("SchedulingClass", wintypes.DWORD)]

            class EXTENDED(ctypes.Structure):
                _fields_ = [("BasicLimitInformation", BASIC), ("IoInfo", IO_COUNTERS),
                            ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                            ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t)]

            k32.CreateJobObjectW.restype = wintypes.HANDLE
            k32.OpenProcess.restype = wintypes.HANDLE
            job = k32.CreateJobObjectW(None, None)
            info = EXTENDED()
            info.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            if job and k32.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info)):  # 9 = Extended
                self.handle = job
                self._k32 = k32
        except Exception as e:
            logger.warning(f"Kill-on-exit job object unavailable: {e}")

    def add(self, proc):
        if not self.handle or proc is None:
            return
        try:
            h = self._k32.OpenProcess(0x0101, False, proc.pid)  # PROCESS_SET_QUOTA | PROCESS_TERMINATE
            if h:
                self._k32.AssignProcessToJobObject(self.handle, h)
                self._k32.CloseHandle(h)
        except Exception:
            pass


def _kill_tree(proc):
    if proc is None or proc.poll() is not None:
        return
    try:
        if IS_WIN:
            subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        else:
            proc.terminate()
        proc.wait(timeout=5)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass


class OverlayManager:
    def __init__(self, project_dir, udp_port=None, http_port=None):
        self.dir = os.path.join(project_dir, "overlay")
        self.window_dir = os.path.join(self.dir, "janela")
        self.udp_port = int(udp_port or os.environ.get("OVERLAY_UDP_PORT", 20778))
        self.http_port = int(http_port or os.environ.get("OVERLAY_HTTP_PORT", 8090))
        self.server_proc = None
        self.window_proc = None
        self.installing = False
        self.last_error = None
        self.forwarded = 0
        self._lock = threading.Lock()
        self._fwd_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self._fwd_sock.setblocking(False)
        self._log_path = os.path.join(self.dir, "overlay-run.log")
        self._job = _KillOnExitJob()
        # ON/OFF switch, remembered between runs (default ON). When ON the overlay is "armed": it starts by
        # itself on the first game packet we parse and only draws while game data flows.
        self._settings_path = os.path.join(self.dir, "engineer-overlay.json")
        self.enabled = self._load_enabled()
        self.last_game_packet = 0.0
        self._starting = False
        self._retry_at = 0.0

    def _load_enabled(self):
        try:
            with open(self._settings_path, encoding="utf-8") as f:
                return bool(json.load(f).get("enabled", True))
        except Exception:
            return True

    def _save_enabled(self):
        try:
            with open(self._settings_path, "w", encoding="utf-8") as f:
                json.dump({"enabled": self.enabled}, f)
        except Exception as e:
            logger.warning(f"Overlay switch not saved: {e}")

    # ------------------------------------------------------------------ helpers
    @property
    def node(self):
        return shutil.which("node")

    @property
    def npm(self):
        return shutil.which("npm.cmd" if IS_WIN else "npm") or shutil.which("npm")

    @property
    def electron_cli(self):
        return os.path.join(self.window_dir, "node_modules", "electron", "cli.js")

    @property
    def electron_installed(self):
        return os.path.exists(self.electron_cli) and os.path.exists(
            os.path.join(self.window_dir, "node_modules", "electron", "path.txt"))

    @property
    def server_running(self):
        return self.server_proc is not None and self.server_proc.poll() is None

    @property
    def window_running(self):
        return self.window_proc is not None and self.window_proc.poll() is None

    @property
    def forwarding(self):
        return self.server_running

    def _spawn(self, args, cwd, env_extra):
        env = os.environ.copy()
        env.update(env_extra)
        log = open(self._log_path, "a", encoding="utf-8", errors="replace")
        log.write(f"\n=== {time.strftime('%Y-%m-%d %H:%M:%S')} {' '.join(args)}\n")
        log.flush()
        flags = 0
        if IS_WIN:
            flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
        proc = subprocess.Popen(args, cwd=cwd, env=env, stdout=log, stderr=subprocess.STDOUT,
                                stdin=subprocess.DEVNULL, creationflags=flags)
        self._job.add(proc)  # dies with this app, however it exits
        return proc

    # ------------------------------------------------------------------ switch / auto-start
    def set_enabled(self, on):
        """User switch. ON arms the overlay (and installs the window once, if needed - an explicit click);
        OFF stops it right away."""
        self.enabled = bool(on)
        self._save_enabled()
        if not self.enabled:
            return self.stop()
        self.last_error = None
        self._retry_at = 0.0
        if not self.electron_installed:
            self.install_window(wait=False)
        elif time.time() - self.last_game_packet < 5:
            self._auto_start_async()          # the game is already sending: show it now
        return self.status()

    def on_game_packet(self):
        """Called for every parsed game packet (live UDP or replay). Cheap; starts the overlay once."""
        now = time.time()
        self.last_game_packet = now
        if not self.enabled or self._starting or now < self._retry_at or self.installing:
            return
        if self.server_running and (self.window_running or not self.electron_installed):
            return
        if not self.electron_installed:
            return                            # never download Electron without a click
        self._auto_start_async()

    def _auto_start_async(self):
        if self._starting:
            return
        self._starting = True

        def run():
            try:
                st = self.start(window=True, halo=True)
                if st.get("error"):
                    self._retry_at = time.time() + 15
                else:
                    logger.info("TV overlay auto-started on game data")
            finally:
                self._starting = False
        threading.Thread(target=run, daemon=True).start()

    def state(self):
        """One word for the UI: off | needs_install | installing | waiting | starting | ready | live | error."""
        if not self.enabled:
            return "off"
        if self.installing:
            return "installing"
        if not self.node or (self.last_error and not self.server_running):
            return "error"
        if not self.electron_installed:
            return "needs_install"
        if self._starting:
            return "starting"
        if self.server_running and self.window_running:
            return "live" if time.time() - self.last_game_packet < 3 else "ready"
        return "waiting"

    # ------------------------------------------------------------------ status
    def status(self):
        st = {
            "enabled": self.enabled,
            "state": self.state(),
            "game_data_age_s": round(time.time() - self.last_game_packet, 1) if self.last_game_packet else None,
            "node": bool(self.node),
            "electron_installed": self.electron_installed,
            "installing": self.installing,
            "server_running": self.server_running,
            "window_running": self.window_running,
            "udp_port": self.udp_port,
            "http_port": self.http_port,
            "overlay_url": f"http://127.0.0.1:{self.http_port}/",
            "control_url": f"http://127.0.0.1:{self.http_port}/control",
            "forwarded_packets": self.forwarded,
            "error": self.last_error,
        }
        if self.server_running:
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{self.http_port}/state", timeout=0.5) as r:
                    s = json.loads(r.read().decode("utf-8"))
                dbg = s.get("dbg") or {}
                st["overlay_received"] = dbg.get("counts")      # packets per id the overlay got
                st["overlay_parsed"] = dbg.get("parsed")        # id -> layout recognised
                st["overlay_has_data"] = bool(s.get("lastPacketAt"))
                st["halo_on"] = bool((s.get("ui") or {}).get("halo"))
                st["turn_map"] = s.get("turn")                 # {n, total, status} for the current track
            except Exception:
                st["overlay_has_data"] = None
        return st

    # ------------------------------------------------------------------ install
    def install_window(self, wait=False):
        """npm ci in overlay/janela (downloads Electron, ~100-200 MB, first time only)."""
        if self.electron_installed or self.installing:
            return True
        if not self.npm:
            self.last_error = "npm not found - install Node.js 18+ (https://nodejs.org)"
            return False

        def run():
            self.installing = True
            try:
                with open(self._log_path, "a", encoding="utf-8", errors="replace") as log:
                    log.write(f"\n=== {time.strftime('%Y-%m-%d %H:%M:%S')} npm ci (Electron)\n")
                    log.flush()
                    flags = subprocess.CREATE_NO_WINDOW if IS_WIN else 0
                    rc = subprocess.run([self.npm, "ci", "--no-audit", "--no-fund"], cwd=self.window_dir,
                                        stdout=log, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                                        creationflags=flags).returncode
                    # Electron 44 does not fetch its binary during `npm ci`; its install.js does
                    # (~370 MB unpacked). Run it explicitly so the first launch doesn't stall.
                    installer = os.path.join(self.window_dir, "node_modules", "electron", "install.js")
                    if rc == 0 and not self.electron_installed and os.path.exists(installer):
                        rc = subprocess.run([self.node, installer], cwd=self.window_dir, stdout=log,
                                            stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
                                            creationflags=flags).returncode
                if rc != 0 or not self.electron_installed:
                    self.last_error = f"Electron install failed (npm exit {rc}) - see overlay/overlay-run.log"
                else:
                    self.last_error = None
            finally:
                self.installing = False

        if wait:
            run()
            return self.electron_installed
        threading.Thread(target=run, daemon=True).start()
        return True

    # ------------------------------------------------------------------ telemetry links
    def sync_turn_maps(self):
        """Give the overlay's TURN counter our official turn numbers.

        The game does not send the corner number. Upstream learns corners from steering on the first
        clean lap (nothing is shown until then, and the count can differ from the official one).
        circuit_data/*_corners.json has every official turn of 24 tracks as lap distances, so we
        write them as overlay/curvas/<trackId>.json. Files the user edited by hand are left alone.
        """
        src_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "circuit_data")
        dst_dir = os.path.join(self.dir, "curvas")
        written = 0
        try:
            os.makedirs(dst_dir, exist_ok=True)
            for name in sorted(os.listdir(src_dir)):
                if not name.endswith("_corners.json"):
                    continue
                with open(os.path.join(src_dir, name), encoding="utf-8") as f:
                    data = json.load(f)
                tid, corners = data.get("track_id"), data.get("corners") or []
                if tid is None or not corners:
                    continue
                dst = os.path.join(dst_dir, f"{tid}.json")
                if os.path.exists(dst):
                    try:
                        with open(dst, encoding="utf-8") as f:
                            old = json.load(f)
                    except Exception:
                        old = {}
                    if not (old.get("learned") or str(old.get("source", "")).startswith("f125-engineer")):
                        continue  # hand-edited map: keep
                out = {
                    "trackId": tid,
                    "trackLength": data.get("lap_length_m"),
                    "source": "f125-engineer circuit_data (official turn numbers)",
                    "corners": [{"n": int(c["turn"]), "start": int(c["entry_dist"]), "end": int(c["exit_dist"])}
                                for c in corners if c.get("turn") is not None],
                }
                with open(dst, "w", encoding="utf-8") as f:
                    json.dump(out, f, indent=1)
                written += 1
        except Exception as e:
            logger.warning(f"Overlay turn maps not written: {e}")
        return written

    def set_ui(self, key, value):
        """Switch one overlay HUD on/off (server.js /api/ui {set, value})."""
        body = json.dumps({"set": key, "value": bool(value)}).encode("utf-8")
        req = urllib.request.Request(f"http://127.0.0.1:{self.http_port}/api/ui", data=body, method="POST",
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=1.0) as r:
                return r.status == 200
        except Exception as e:
            logger.warning(f"Overlay UI '{key}' not set: {e}")
            return False

    # ------------------------------------------------------------------ start / stop
    def start(self, window=True, halo=True):
        with self._lock:
            self.last_error = None
            if not self.node:
                self.last_error = "Node.js not found - install Node.js 18+ (https://nodejs.org)"
                return self.status()
            if not self.server_running:
                n = self.sync_turn_maps()
                if n:
                    logger.info(f"TV overlay: official turn maps for {n} tracks")
                if _port_busy_tcp(self.http_port):
                    self.last_error = f"HTTP port {self.http_port} is already in use (another overlay running?)"
                    return self.status()
                if _port_busy_udp(self.udp_port):
                    self.last_error = f"UDP port {self.udp_port} is already in use"
                    return self.status()
                self.server_proc = self._spawn(
                    [self.node, "server.js", "--no-open"], self.dir,
                    {"UDP_PORT": str(self.udp_port), "HTTP_PORT": str(self.http_port), "NO_OPEN": "1"})
                for _ in range(30):  # wait until the HTTP side answers
                    if _port_busy_tcp(self.http_port) or self.server_proc.poll() is not None:
                        break
                    time.sleep(0.1)
                if self.server_proc.poll() is not None:
                    self.last_error = "Overlay server exited at start - see overlay/overlay-run.log"
                    return self.status()
                logger.info(f"TV overlay server on UDP {self.udp_port} / http://127.0.0.1:{self.http_port}/")
                # The halo HUD starts off upstream (the game doesn't say which camera is used). This app
                # targets the centred TV-pod camera, so switch it on; Ctrl+Alt+G still hides it.
                if halo:
                    self.set_ui("halo", True)
            if window and not self.window_running:
                if not self.electron_installed:
                    self.install_window(wait=False)
                    threading.Thread(target=self._start_window_after_install, daemon=True).start()
                else:
                    self._start_window()
            return self.status()

    def _start_window(self):
        self.window_proc = self._spawn(
            [self.node, self.electron_cli, "."], self.window_dir,
            {"OVERLAY_URL": f"http://127.0.0.1:{self.http_port}/"})
        logger.info("TV overlay window started")

    def _start_window_after_install(self):
        while self.installing:
            time.sleep(0.5)
        with self._lock:
            if self.electron_installed and self.server_running and not self.window_running:
                self._start_window()

    def stop(self):
        with self._lock:
            _kill_tree(self.window_proc)
            _kill_tree(self.server_proc)
            self.window_proc = None
            self.server_proc = None
            logger.info("TV overlay stopped")
            return self.status()

    # ------------------------------------------------------------------ forwarding
    def forward(self, data):
        """Send one raw UDP packet to the overlay (no-op when it isn't running)."""
        if not self.forwarding or not data:
            return
        try:
            self._fwd_sock.sendto(data, ("127.0.0.1", self.udp_port))
            self.forwarded += 1
        except (BlockingIOError, ConnectionResetError, OSError):
            pass  # overlay busy/restarting: dropping a frame is fine
