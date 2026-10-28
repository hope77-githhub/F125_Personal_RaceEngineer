import os
import csv
import io
import json
import math
import logging

logger = logging.getLogger(__name__)


class CircuitDataManager:
    def __init__(self, data_dir=None):
        if data_dir is None:
            self.data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs"))
        else:
            self.data_dir = data_dir

        # Map F1 track IDs to their respective racing line files
        self.track_file_map = {
            0: "tracks/melbourne_2020_racingline.txt",
            2: "tracks/shanghai_2020_racingline.txt",
            3: "tracks/sakhir_2020_racingline.txt",
            4: "tracks/catalunya_2020_racingline.txt",
            5: "tracks/monaco_2020_racingline.txt",
            6: "tracks/montreal_2020_racingline.txt",
            7: "tracks/silverstone_2020_racingline.txt",
            9: "tracks/hungaroring_2020_racingline.txt",
            10: "tracks/spa_2020_racingline.txt",
            11: "tracks/monza_2020_racingline.txt",
            12: "tracks/singapore_2020_racingline.txt",
            13: "tracks/suzuka_2020_racingline.txt",
            14: "tracks/abu_dhabi_2020_racingline.txt",
            15: "tracks/texas_2020_racingline.txt",
            16: "tracks/brazil_2020_racingline.txt",
            17: "tracks/austria_2020_racingline.txt",
            19: "tracks/mexico_2020_racingline.txt",
            20: "tracks/baku_2020_racingline.txt",
            26: "tracks/zandvoort_2020_racingline.txt",
            27: "tracks/imola_2020_racingline.txt",
            29: "tracks/jeddah_2020_racingline.txt",
            30: "tracks/miami_2020_racingline.txt",
            31: "tracks/Las Vegas_2020_racingline.txt",
            32: "tracks/losail_2020_racingline.txt",
        }
        self.corner_file_map = {
            4: "catalunya_2020_racingline_corners.json",
            5: "monaco_2020_racingline_corners.json",
            17: "austria_2020_racingline_corners.json",
        }
        self._cache = {}
        self._full_cache = {}
        self._corners_cache = {}

        self.circuit_data_dir = os.path.dirname(__file__)

    def _ensure_full_track(self, track_id: int):
        if track_id in self._full_cache:
            return self._full_cache[track_id]

        file_name = self.track_file_map.get(track_id)
        if not file_name:
            logger.info(f"Unknown track_id {track_id}, falling back to catalunya for reference track")
            file_name = "tracks/catalunya_2020_racingline.txt"

        file_path = os.path.join(self.data_dir, file_name)
        if not os.path.exists(file_path):
            logger.error(f"Reference track file not found at: {file_path}")
            return []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()

            rl_data = []
            reader = csv.reader(io.StringIO("".join(lines[2:])))
            for row in reader:
                if len(row) >= 3:
                    try:
                        rl_data.append({
                            "dist": round(float(row[0]), 2),
                            "x": round(float(row[1]), 2),
                            "z": round(float(row[2]), 2),
                        })
                    except ValueError:
                        continue

            # Precompute signed curvature along the track
            n = len(rl_data)
            if n > 10:
                step = max(2, min(12, n // 180))
                for i in range(n):
                    p_prev = rl_data[(i - step) % n]
                    p_curr = rl_data[i]
                    p_next = rl_data[(i + step) % n]
                    v1x = p_curr["x"] - p_prev["x"]
                    v1z = p_curr["z"] - p_prev["z"]
                    v2x = p_next["x"] - p_curr["x"]
                    v2z = p_next["z"] - p_curr["z"]
                    l1 = math.hypot(v1x, v1z) or 1.0
                    l2 = math.hypot(v2x, v2z) or 1.0
                    cross = (v1x * v2z - v1z * v2x) / (l1 * l2)
                    arc_len = (l1 + l2) / 2.0 or 1.0
                    rl_data[i]["curv"] = round(cross / arc_len, 6)
            else:
                for p in rl_data:
                    p["curv"] = 0.0

            self._full_cache[track_id] = rl_data
            return rl_data
        except Exception as e:
            logger.error(f"Failed to load racing line from {file_path}: {e}")
            return []

    def interpolate_point(self, track_id: int, dist: float):
        """Interpolate (x, z, curv, direction) on the reference track for a given distance (m)."""
        full_track = self._ensure_full_track(track_id)
        if not full_track:
            return {"x": 0.0, "z": 0.0, "curv": 0.0, "direction": "Right"}

        lo, hi = 0, len(full_track) - 1
        while lo < hi:
            mid = (lo + hi) // 2
            if full_track[mid]["dist"] < dist:
                lo = mid + 1
            else:
                hi = mid

        idx = lo
        pt = full_track[idx]
        if idx > 0:
            p0 = full_track[idx - 1]
            span = pt["dist"] - p0["dist"]
            if 0 < span < 80:
                t = max(0.0, min(1.0, (dist - p0["dist"]) / span))
                x = round(p0["x"] + (pt["x"] - p0["x"]) * t, 2)
                z = round(p0["z"] + (pt["z"] - p0["z"]) * t, 2)
                curv = p0.get("curv", 0.0) + (pt.get("curv", 0.0) - p0.get("curv", 0.0)) * t
            else:
                x, z, curv = pt["x"], pt["z"], pt.get("curv", 0.0)
        else:
            x, z, curv = pt["x"], pt["z"], pt.get("curv", 0.0)

        direction = "Right" if curv >= 0 else "Left"
        return {"x": x, "z": z, "curv": curv, "direction": direction}

    def get_reference_track(self, track_id: int):
        """Loads and returns a compact reference racing line (~600 pts max) for frontend rendering."""
        if track_id in self._cache:
            return self._cache[track_id]

        full_data = self._ensure_full_track(track_id)
        if not full_data:
            return []

        # Downsample if very dense (e.g., Austria has 5183 points) to keep WebSocket payload small
        max_pts = 600
        if len(full_data) > max_pts:
            step = max(1, len(full_data) // max_pts)
            compact = [
                {"dist": p["dist"], "x": p["x"], "z": p["z"]}
                for p in full_data[::step]
            ]
            if compact[-1]["dist"] != full_data[-1]["dist"]:
                compact.append({"dist": full_data[-1]["dist"], "x": full_data[-1]["x"], "z": full_data[-1]["z"]})
        else:
            compact = [{"dist": p["dist"], "x": p["x"], "z": p["z"]} for p in full_data]

        self._cache[track_id] = compact
        logger.info(f"Loaded {len(compact)} compact circuit points (from {len(full_data)}) for track_id {track_id}")
        return compact

    def get_corners(self, track_id: int):
        if track_id in self._corners_cache:
            return self._corners_cache[track_id]

        file_name = self.corner_file_map.get(track_id, "catalunya_2020_racingline_corners.json")
        file_path = os.path.join(self.circuit_data_dir, file_name)

        if not os.path.exists(file_path):
            logger.warning(f"Corner file not found: {file_path}")
            return []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            raw_corners = data.get("corners", [])
            enriched_corners = []
            for c in raw_corners:
                entry_info = self.interpolate_point(track_id, c.get("entry_dist", 0))
                apex_info = self.interpolate_point(track_id, c.get("apex_dist", 0))
                exit_info = self.interpolate_point(track_id, c.get("exit_dist", 0))
                enriched = dict(c)
                enriched["direction"] = c.get("direction") or apex_info["direction"]
                enriched["entry_x"] = entry_info["x"]
                enriched["entry_z"] = entry_info["z"]
                enriched["apex_x"] = apex_info["x"]
                enriched["apex_z"] = apex_info["z"]
                enriched["exit_x"] = exit_info["x"]
                enriched["exit_z"] = exit_info["z"]
                enriched_corners.append(enriched)

            self._corners_cache[track_id] = enriched_corners
            return enriched_corners
        except Exception as e:
            logger.error(f"Failed to load corners from {file_path}: {e}")
            return []
