"""
Recording retention.

While a live dashboard is open, main.on_udp_packet_received appends a full snapshot of every game packet to
backend/data/circuit_<track>/lap<N>.jsonl five times a second, roughly 200 MB per session. The app only needs
a session's recording while that session is being shown, so unless `keep` is on:

* when a new session starts recording, every other session is cut out of the lap files;
* when the app closes (or, after a crash, when it next starts) all lap files are deleted.

The per-session lap caches built from those recordings (_parsed_laps_cache_v3_<uid>.json) go with them.
Only recorder output is removed: lap*.jsonl files (never committed) and the caches of sessions found in them
or in the ledger. Demo caches that ship with the repo, the generic _parsed_laps_cache_v3.json and the session
index (_sessions_index_v1.json, ignored or rebuilt whenever its lap files change) are left alone.

keep = True (POST /api/recordings {"keep": true}) keeps every recording, for replays. The setting and the
ledger of recorded sessions live in backend/data/_recordings.json.
"""
import json
import logging
import os
import re
import threading
import time

from .sessions import frame_session_uid

logger = logging.getLogger(__name__)

LEDGER = "_recordings.json"
LAP_FILE = re.compile(r"^lap\d+\.jsonl$")
# session UID of a recorded line, read from its lap-data packet header without parsing the ~150 KB line
LAP_UID = re.compile(rb'"packet_id_2": \{"m_header": \{[^}]*?"m_sessionUID": (\d+)')
ANY_UID = re.compile(rb'"m_sessionUID": (\d+)')

write_lock = threading.Lock()   # the recorder appends under it; a cleanup swaps a lap file under it


def _line_uid(line: bytes):
    m = LAP_UID.search(line)
    if m:
        return m.group(1).decode()
    try:   # lap-data packet missing from this frame: fall back to the other packets, like the replay does
        return frame_session_uid(json.loads(line).get("data", {}))
    except Exception:
        return None


def _retry(fn, *args, tries=6, wait=0.25):
    """os.remove / os.replace fail on Windows while another handle has the file open (a replay or a
    preload reading it): retry for a moment, then give up and leave it for the next cleanup."""
    for i in range(tries):
        try:
            return fn(*args)
        except FileNotFoundError:
            return None
        except PermissionError:
            if i == tries - 1:
                raise
            time.sleep(wait)


class Recordings:
    def __init__(self, data_dir):
        self.data_dir = data_dir
        self.path = os.path.join(data_dir, LEDGER)
        self.keep = False
        self.sessions = {}          # uid -> [circuit folder, ...] for sessions this app recorded
        self.current_uid = None     # session being recorded now
        self._purge_lock = threading.Lock()
        self._load()

    # ---------------------------------------------------------------- settings / ledger
    def _load(self):
        try:
            with open(self.path, "r", encoding="utf-8") as f:
                d = json.load(f)
            self.keep = bool(d.get("keep", False))
            self.sessions = {str(k): list(v) for k, v in (d.get("sessions") or {}).items()}
        except FileNotFoundError:
            pass
        except Exception as e:
            logger.warning(f"Could not read {self.path}: {e}")

    def _save(self):
        try:
            os.makedirs(self.data_dir, exist_ok=True)
            with open(self.path, "w", encoding="utf-8") as f:
                json.dump({"keep": self.keep, "sessions": self.sessions}, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not write {self.path}: {e}")

    def set_keep(self, keep: bool):
        self.keep = bool(keep)
        self._save()
        return self.status()

    # ---------------------------------------------------------------- recorder side
    def note_frame(self, circuit_folder, data):
        """Called for every recorded frame (cheap). A new session UID means the previous session ended:
        unless keep is on, the other sessions are cut out of the lap files in the background."""
        uid = frame_session_uid(data)
        if not uid:
            return
        folders = self.sessions.get(uid)
        if uid != self.current_uid:
            prev, self.current_uid = self.current_uid, uid
            self.sessions.setdefault(uid, [])
            if circuit_folder not in self.sessions[uid]:
                self.sessions[uid].append(circuit_folder)
            self._save()
            if prev is not None and not self.keep:
                logger.info(f"New session {uid} is recording: removing the recordings of earlier sessions")
                self.purge_in_background(keep_uid=uid)
        elif folders is not None and circuit_folder not in folders:
            folders.append(circuit_folder)
            self._save()

    def append(self, path, line):
        with write_lock:
            with open(path, "a", encoding="utf-8") as f:
                f.write(line)

    # ---------------------------------------------------------------- cleanup
    def _circuits(self):
        if not os.path.isdir(self.data_dir):
            return []
        return [os.path.join(self.data_dir, d) for d in sorted(os.listdir(self.data_dir))
                if d.startswith("circuit_") and os.path.isdir(os.path.join(self.data_dir, d))]

    @staticmethod
    def _lap_files(folder):
        return [os.path.join(folder, f) for f in sorted(os.listdir(folder)) if LAP_FILE.match(f)]

    @staticmethod
    def _uids_in(path):
        uids, tail = set(), b""
        with open(path, "rb") as f:
            while True:
                chunk = f.read(16 << 20)
                if not chunk:
                    break
                buf = tail + chunk
                uids.update(m.decode() for m in ANY_UID.findall(buf))
                tail = buf[-64:]
        return uids

    def _filter_file(self, path, keep_uid):
        """Keep only keep_uid's lines in one lap file. Lines appended while it runs (the session now
        recording) are copied over under write_lock just before the swap. Returns the removed UIDs."""
        removed = set()
        tmp = path + ".tmp"
        size0 = os.path.getsize(path)
        kept = 0
        with open(path, "rb") as src, open(tmp, "wb") as dst:
            while src.tell() < size0:
                line = src.readline()
                if not line:
                    break
                uid = _line_uid(line)
                if uid == keep_uid:
                    dst.write(line)
                    kept += 1
                elif uid:
                    removed.add(uid)
        if not removed:
            os.remove(tmp)
            return removed
        with write_lock:
            with open(path, "rb") as src:
                src.seek(size0)
                tail_bytes = src.read()
            if tail_bytes:
                with open(tmp, "ab") as dst:
                    dst.write(tail_bytes)
            try:
                if kept == 0 and not tail_bytes:
                    _retry(os.remove, path)
                    os.remove(tmp)
                else:
                    _retry(os.replace, tmp, path)
            except PermissionError:
                logger.warning(f"{path} is in use; its old sessions are removed next time")
                if os.path.exists(tmp):
                    os.remove(tmp)
                return set()
        return removed

    def purge(self, keep_uid=None):
        """Remove every recorded session except keep_uid (None: all of them). Returns MB freed."""
        if self.keep:
            return 0.0
        with self._purge_lock:
            freed = 0.0
            removed_all = set()
            for folder in self._circuits():
                files = self._lap_files(folder)
                if not files:
                    continue
                before = sum(os.path.getsize(f) for f in files)
                removed = set()
                for path in files:
                    try:
                        if keep_uid is None:
                            removed |= self._uids_in(path)
                            with write_lock:
                                _retry(os.remove, path)
                        else:
                            removed |= self._filter_file(path, keep_uid)
                    except PermissionError:
                        logger.warning(f"{path} is in use; it is removed next time")
                    except Exception as e:
                        logger.warning(f"Could not clean {path}: {e}")
                name = os.path.basename(folder)
                removed |= {u for u, fs in self.sessions.items() if name in fs}
                removed.discard(keep_uid)
                for uid in removed:
                    cache = os.path.join(folder, f"_parsed_laps_cache_v3_{uid}.json")
                    try:
                        _retry(os.remove, cache)
                    except Exception:
                        pass
                after = sum(os.path.getsize(f) for f in self._lap_files(folder))
                freed += (before - after) / 1048576
                removed_all |= removed
            for uid in removed_all:
                self.sessions.pop(uid, None)
            if keep_uid is None:
                self.current_uid = None
            self._save()
            if freed > 0.05:
                logger.info(f"Removed recordings of {len(removed_all)} session(s), {freed:.1f} MB freed")
            return round(freed, 1)

    def purge_in_background(self, keep_uid=None):
        if self.keep:
            return None
        t = threading.Thread(target=self.purge, kwargs={"keep_uid": keep_uid}, name="recordings-purge", daemon=True)
        t.start()
        return t

    def status(self):
        circuits = {}
        for folder in self._circuits():
            mb = sum(os.path.getsize(f) for f in self._lap_files(folder)) / 1048576
            if mb > 0:
                circuits[os.path.basename(folder)] = round(mb, 1)
        return {"keep": self.keep, "recording_session": self.current_uid,
                "total_mb": round(sum(circuits.values()), 1), "circuits": circuits}
