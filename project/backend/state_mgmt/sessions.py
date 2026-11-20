"""
Session awareness for F1 25 telemetry.

Every UDP packet header carries m_sessionUID (unique per session) and the Session packet
(id 1) carries m_sessionType. The raw recorder appends frames to lap{N}.jsonl by lap number
only, so one file can hold frames from several sessions (e.g. Practice 1 lap 1 and Race lap 1).
This module indexes recorded frames by session so replay / preload can use one session at a time.
"""
import json
import os

SESSION_TYPE_NAMES = {
    0: "Unknown",
    1: "Practice 1", 2: "Practice 2", 3: "Practice 3", 4: "Short Practice",
    5: "Qualifying 1", 6: "Qualifying 2", 7: "Qualifying 3", 8: "Short Qualifying",
    9: "One-Shot Qualifying",
    10: "Sprint Shootout 1", 11: "Sprint Shootout 2", 12: "Sprint Shootout 3",
    13: "Short Sprint Shootout", 14: "One-Shot Sprint Shootout",
    15: "Race", 16: "Race 2", 17: "Race 3",
    18: "Time Trial",
}

INDEX_FILE = "_sessions_index_v1.json"


def recorded_circuits(data_dir):
    """circuit_* folders that still hold recorded lap files, most recently recorded first."""
    out = []
    try:
        names = os.listdir(data_dir)
    except OSError:
        return out
    for name in names:
        path = os.path.join(data_dir, name)
        if not (name.startswith("circuit_") and name != "circuit_unknown" and os.path.isdir(path)):
            continue
        laps = [os.path.join(path, f) for f in os.listdir(path)
                if f.startswith("lap") and f.endswith(".jsonl") and os.path.getsize(os.path.join(path, f)) > 1_000_000]
        if laps:
            out.append((max(os.path.getmtime(f) for f in laps), name))
    return [name for _, name in sorted(out, reverse=True)]


def latest_recorded_circuit(data_dir):
    """Folder name of the most recently recorded circuit that still exists, or None."""
    found = recorded_circuits(data_dir)
    return found[0] if found else None


def session_group(session_type):
    """'practice' | 'qualifying' | 'race' — drives which radio calls the engineer makes."""
    t = int(session_type or 0)
    if 5 <= t <= 14:
        return "qualifying"
    if 15 <= t <= 17:
        return "race"
    return "practice"  # practice sessions, time trial, unknown


def session_name(session_type):
    return SESSION_TYPE_NAMES.get(int(session_type or 0), f"Session {session_type}")


def frame_session_uid(data):
    """Session UID of a recorded frame, taken from the lap-data packet (it drives replay)."""
    for key in ("packet_id_2", "packet_id_6", "packet_id_0", "packet_id_1"):
        hdr = (data.get(key) or {}).get("m_header") or {}
        uid = hdr.get("m_sessionUID")
        if uid:
            return str(uid)
    return None


def packet_session_uid(pkt):
    hdr = (pkt or {}).get("m_header") or {}
    uid = hdr.get("m_sessionUID")
    return str(uid) if uid else None


def _lap_files(circuit_path):
    out = []
    for fname in os.listdir(circuit_path):
        if fname.startswith("lap") and fname.endswith(".jsonl"):
            fpath = os.path.join(circuit_path, fname)
            if os.path.getsize(fpath) > 1000:
                out.append(fpath)
    return sorted(out)


def build_session_index(circuit_path):
    """{uid: {uid, type, name, group, frames, first_ts, last_ts, laps:[...], files:{fname:[line,...]}}}
    Cached in INDEX_FILE and rebuilt when any lap file is newer than the cache."""
    files = _lap_files(circuit_path)
    if not files:
        return {}
    cache_path = os.path.join(circuit_path, INDEX_FILE)
    newest = max(os.path.getmtime(f) for f in files)
    if os.path.exists(cache_path) and os.path.getmtime(cache_path) >= newest:
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass

    sessions = {}
    type_by_uid = {}
    for fpath in files:
        fname = os.path.basename(fpath)
        with open(fpath, "r", encoding="utf-8") as f:
            for line_idx, line in enumerate(f):
                try:
                    entry = json.loads(line)
                except Exception:
                    continue
                data = entry.get("data", {})
                uid = frame_session_uid(data)
                if not uid:
                    continue
                p1 = data.get("packet_id_1") or {}
                if packet_session_uid(p1) == uid and "m_sessionType" in p1:
                    type_by_uid[uid] = int(p1.get("m_sessionType") or 0)
                s = sessions.setdefault(uid, {"uid": uid, "frames": 0, "first_ts": None, "last_ts": None,
                                              "laps": set(), "files": {}})
                s["frames"] += 1
                ts = entry.get("timestamp")
                if ts is not None:
                    s["first_ts"] = ts if s["first_ts"] is None else min(s["first_ts"], ts)
                    s["last_ts"] = ts if s["last_ts"] is None else max(s["last_ts"], ts)
                s["files"].setdefault(fname, []).append(line_idx)
                try:
                    pidx = int((p1.get("m_header") or {}).get("m_playerCarIndex", 0))
                    lap = int(data["packet_id_2"]["m_lapData"][pidx]["m_currentLapNum"])
                    if lap > 0:
                        s["laps"].add(lap)
                except Exception:
                    pass

    for uid, s in sessions.items():
        t = type_by_uid.get(uid, 0)
        s["type"] = t
        s["name"] = session_name(t)
        s["group"] = session_group(t)
        s["laps"] = sorted(s["laps"])

    try:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(sessions, f)
    except Exception:
        pass
    return sessions


def list_sessions(circuit_path, min_frames=60):
    """Sessions worth replaying, oldest first, numbered per type (Race #1, Race #2 …)."""
    idx = build_session_index(circuit_path)
    rows = [s for s in idx.values() if s["frames"] >= min_frames]
    rows.sort(key=lambda s: s.get("first_ts") or 0)
    counts, out = {}, []
    for s in rows:
        counts[s["name"]] = counts.get(s["name"], 0) + 1
        out.append({
            "uid": s["uid"], "type": s["type"], "name": s["name"], "group": s["group"],
            "ordinal": counts[s["name"]], "frames": s["frames"], "laps": s["laps"],
            "first_ts": s.get("first_ts"),
        })
    totals = {}
    for r in out:
        totals[r["name"]] = totals.get(r["name"], 0) + 1
    for r in out:
        r["label"] = r["name"] if totals[r["name"]] == 1 else f"{r['name']} #{r['ordinal']}"
    return out


def session_frame_refs(circuit_path, uid, lap=None):
    """[(fpath, line_idx), …] for one session in recording order. With lap, only that lap's frames
    are kept (decided per frame while streaming, so this returns the whole session here)."""
    idx = build_session_index(circuit_path)
    s = idx.get(str(uid))
    if not s:
        return []
    refs = []
    for fname, lines in s["files"].items():
        fpath = os.path.join(circuit_path, fname)
        refs.extend((fpath, li) for li in lines)
    return refs
