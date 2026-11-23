"""
Lap debrief: where a lap lost time against a reference lap, turn by turn, and why.

Both laps' telemetry samples (distance_m, speed km/h, brake %) become time-at-distance traces; their difference
(you - reference) is split by corner. Every real corner owns the track from halfway after the previous corner's
apex to halfway before the next one's (kinks are flat out and belong to the corner before them), so its braking
zone, the corner itself and the run out of it all count. The corner that lost the most is named with its most
likely cause, read from the braking point, the minimum speed and the exit speed.

Used by StateManager for the lap debrief radio (practice / qualifying), the race lap-loss call and the answer to
"where am I losing time?". Wording and thresholds: docs/ENGINEER_VOICE_LINES.md (generated) section 1.
"""
from bisect import bisect_left

STEP = 10.0                  # m: grid of the delta trace
LATE_M = EARLY_M = 8.0       # m: braking point clearly later / earlier than on the reference lap
BRAKE_MAX_DIFF_M = 80.0      # m: larger differences are mis-detected braking points (lift, flashback)
APEX_KMH = EXIT_KMH = 4      # km/h: minimum / exit speed clearly lower than on the reference lap
MIN_CORNER_LOSS = 0.05       # s: a corner losing less than this is not worth naming
BRAKE_ON = 5                 # % brake pedal


def _clean(points):
    pts = sorted((p for p in (points or []) if (p.get("distance_m") or -1) >= 0 and (p.get("speed") or 0) > 5),
                 key=lambda p: p["distance_m"])
    out = []
    for p in pts:
        if out and p["distance_m"] - out[-1]["distance_m"] < 0.5:
            continue
        out.append(p)
    return out


def time_trace(points):
    """Telemetry samples -> ([distance_m], [seconds since the first sample]) or None (too few samples)."""
    pts = _clean(points)
    if len(pts) < 30:
        return None
    dist, t = [pts[0]["distance_m"]], [0.0]
    for a, b in zip(pts, pts[1:]):
        v = max(5.0, (a["speed"] + b["speed"]) / 2 / 3.6)
        dist.append(b["distance_m"])
        t.append(t[-1] + (b["distance_m"] - a["distance_m"]) / v)
    return dist, t


def _at(trace, d):
    dist, t = trace
    i = bisect_left(dist, d)
    if i <= 0:
        return t[0]
    if i >= len(dist):
        return t[-1]
    d0, d1 = dist[i - 1], dist[i]
    return t[i - 1] + (t[i] - t[i - 1]) * (d - d0) / max(1e-6, d1 - d0)


def _corner_profile(pts, c, lo):
    """Minimum speed, exit speed and braking point of one corner on one lap (lo: start of its segment)."""
    entry, apex, exit_ = float(c["entry_dist"]), float(c["apex_dist"]), float(c["exit_dist"])
    seg = [p for p in pts if entry - 15 <= p["distance_m"] <= exit_ + 15]
    if not seg:
        return None
    low = min(seg, key=lambda p: p["speed"])
    out = min(pts, key=lambda p: abs(p["distance_m"] - exit_))
    brake = [p for p in pts if max(lo, entry - 200) <= p["distance_m"] <= low["distance_m"] and (p.get("brake") or 0) > BRAKE_ON]
    return {"apex": low["speed"], "exit": out["speed"], "brake_m": brake[0]["distance_m"] if brake else None}


def cause(you, ref):
    """'late' / 'early' (braking point), 'apex' (minimum speed), 'exit' (exit speed) or None."""
    if not you or not ref:
        return None
    if you["brake_m"] is not None and ref["brake_m"] is not None:
        d = you["brake_m"] - ref["brake_m"]          # + = braked later than on the reference lap
        if LATE_M <= d <= BRAKE_MAX_DIFF_M:
            return "late"
        if -BRAKE_MAX_DIFF_M <= d <= -EARLY_M:
            return "early"
    if you["apex"] <= ref["apex"] - APEX_KMH:
        return "apex"
    if you["exit"] <= ref["exit"] - EXIT_KMH:
        return "exit"
    return None


def analyze(you_lap, ref_lap, corners, sector_starts=None):
    """
    you_lap / ref_lap: lap_history entries ({"time_ms", "telemetry_points", "lap"}).
    corners: circuit corner list ({"turn", "type", "entry_dist", "apex_dist", "exit_dist"}); [] = sectors only.
    sector_starts: (sector 2 start m, sector 3 start m) or None.
    -> {"lap_delta": s (official times), "sectors": [s1, s2, s3] or None, "corners": [... most lost first],
        "worst": corner dict or None}. Positive = you lost time. None when a lap lacks telemetry.
    """
    you_pts, ref_pts = _clean(you_lap.get("telemetry_points")), _clean(ref_lap.get("telemetry_points"))
    ty, tr = time_trace(you_pts), time_trace(ref_pts)
    if not ty or not tr:
        return None
    d0, d1 = max(ty[0][0], tr[0][0]), min(ty[0][-1], tr[0][-1])
    if d1 - d0 < 500:
        return None
    base = _at(ty, d0) - _at(tr, d0)

    def delta(d):
        d = min(d1, max(d0, d))
        return _at(ty, d) - _at(tr, d) - base

    sectors = None
    if sector_starts and all(sector_starts) and d0 < sector_starts[0] < sector_starts[1] < d1:
        s2, s3 = sector_starts
        sectors = [delta(s2), delta(s3) - delta(s2), delta(d1) - delta(s3)]

    real = sorted((c for c in corners or [] if c.get("type") != "kink" and c.get("apex_dist") is not None
                   and c.get("entry_dist") is not None and c.get("exit_dist") is not None),
                  key=lambda c: float(c["apex_dist"]))
    rows = []
    for i, c in enumerate(real):
        apex = float(c["apex_dist"])
        lo = d0 if i == 0 else (float(real[i - 1]["apex_dist"]) + apex) / 2
        hi = d1 if i == len(real) - 1 else (apex + float(real[i + 1]["apex_dist"])) / 2
        y, r = _corner_profile(you_pts, c, lo), _corner_profile(ref_pts, c, lo)
        row = {"turn": int(c.get("turn", i + 1)), "name": c.get("name") or f"Turn {c.get('turn', i + 1)}",
               "loss": round(delta(hi) - delta(lo), 3), "cause": cause(y, r)}
        if y and r:
            row.update({"brake_d": (round(y["brake_m"] - r["brake_m"], 1)
                                    if y["brake_m"] is not None and r["brake_m"] is not None else None),
                        "apex_d": y["apex"] - r["apex"], "exit_d": y["exit"] - r["exit"]})
        rows.append(row)
    rows.sort(key=lambda r: -r["loss"])
    worst = rows[0] if rows and rows[0]["loss"] >= MIN_CORNER_LOSS else None
    lap_delta = None
    if (you_lap.get("time_ms") or 0) > 0 and (ref_lap.get("time_ms") or 0) > 0:
        lap_delta = round((you_lap["time_ms"] - ref_lap["time_ms"]) / 1000.0, 3)
    return {"lap_delta": lap_delta, "trace_delta": round(delta(d1), 3),
            "sectors": [round(s, 3) for s in sectors] if sectors else None, "corners": rows, "worst": worst}


# turn learning from steering: same rules as the overlay's TURN counter (overlay/curvas.js detectCorners)
STEER_ENTER, STEER_EXIT, STEER_MIN_PEAK, CORNER_MIN_LEN, CORNER_MERGE_GAP = 0.10, 0.05, 0.15, 20.0, 40.0


def learn_corners(points):
    """Corner map from one clean lap's steering, for tracks without official corner data (reverse layouts,
    Madrid): corners numbered in order from the line, apex at the slowest point. [] when it does not look like
    a lap (fewer than 4 or more than 40 corners)."""
    pts = _clean(points)
    if len(pts) < 30:
        return []
    sign = lambda v: (v > 0) - (v < 0)   # noqa: E731
    segs, cur = [], None
    for p in pts:
        s, d = p.get("steer") or 0.0, p["distance_m"]
        a = abs(s)
        if cur is None:
            if a > STEER_ENTER:
                cur = {"start": d, "end": d, "peak": a, "sign": sign(s)}
        elif a < STEER_EXIT or (a > STEER_ENTER and sign(s) != cur["sign"]):
            segs.append(cur)
            cur = {"start": d, "end": d, "peak": a, "sign": sign(s)} if a > STEER_ENTER else None
        else:
            cur["end"], cur["peak"] = d, max(cur["peak"], a)
    if cur:
        segs.append(cur)
    merged = []
    for g in segs:
        if merged and merged[-1]["sign"] == g["sign"] and g["start"] - merged[-1]["end"] < CORNER_MERGE_GAP:
            merged[-1]["end"], merged[-1]["peak"] = g["end"], max(merged[-1]["peak"], g["peak"])
        else:
            merged.append(dict(g))
    out = []
    for g in merged:
        if g["peak"] < STEER_MIN_PEAK or g["end"] - g["start"] < CORNER_MIN_LEN:
            continue
        seg = [p for p in pts if g["start"] <= p["distance_m"] <= g["end"]]
        n = len(out) + 1
        out.append({"turn": n, "name": f"Turn {n}", "type": "corner", "entry_dist": round(g["start"]),
                    "apex_dist": round(min(seg, key=lambda p: p["speed"])["distance_m"]), "exit_dist": round(g["end"]),
                    "direction": "Right" if g["sign"] > 0 else "Left", "learned": True})
    return out if 4 <= len(out) <= 40 else []


def describe(row):
    """One line for the dashboard details: 'Turn 7 (Stowe): -0.21 s, braked 12 m later, apex -6 km/h'."""
    parts = [f"Turn {row['turn']} ({row['name']}): lost {row['loss']:.2f}s"]
    if row.get("brake_d") is not None and abs(row["brake_d"]) >= 3:
        parts.append(f"braked {abs(row['brake_d']):.0f} m {'later' if row['brake_d'] > 0 else 'earlier'}")
    if row.get("apex_d") is not None:
        parts.append(f"min speed {row['apex_d']:+.0f} km/h")
    if row.get("exit_d") is not None:
        parts.append(f"exit {row['exit_d']:+.0f} km/h")
    return ", ".join(parts)
