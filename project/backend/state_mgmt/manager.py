from circuit_data.manager import CircuitDataManager
import math
import logging
import os
import json
import re
import time

logger = logging.getLogger(__name__)

# Weather mapping based on F1 UDP spec
WEATHER_MAP = {
    0: "Clear", 1: "Light Cloud", 2: "Overcast",
    3: "Light Rain", 4: "Heavy Rain", 5: "Storm"
}

TYRE_VISUAL_MAP = {
    16: "Soft", 17: "Medium", 18: "Hard", 7: "Inter", 8: "Wet"
}

# Track ID to name mapping based on F1 26 spec
TRACK_MAP = {
    0: "Melbourne", 2: "Shanghai", 3: "Sakhir", 4: "Catalunya",
    5: "Monaco", 6: "Montreal", 7: "Silverstone", 9: "Hungaroring",
    10: "Spa", 11: "Monza", 12: "Singapore", 13: "Suzuka",
    14: "Abu Dhabi", 15: "Texas", 16: "Brazil", 17: "Austria",
    19: "Mexico", 20: "Baku", 26: "Zandvoort", 27: "Imola",
    29: "Jeddah", 30: "Miami", 31: "Las Vegas", 32: "Losail",
    39: "Silverstone (Reverse)", 40: "Austria (Reverse)",
    41: "Zandvoort (Reverse)", 42: "Madrid",
}

NAME_TO_TRACK_ID = {v.lower(): k for k, v in TRACK_MAP.items()}


def safe_float(val, default=0.0):
    """Safely convert a value to float, handling NaN and invalid values."""
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return f
    except (ValueError, TypeError):
        return default


def safe_int(val, default=0):
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return default
        return int(f)
    except (ValueError, TypeError):
        return default


def clamp_percent(raw_float, scale=100):
    """
    Clamp a float (expected 0.0~1.0) to an integer percentage (0~100).
    """
    f = safe_float(raw_float, 0.0)
    val = int(round(f * scale))
    return max(0, min(scale, val))


def speed_to_gear(spd_kph):
    if spd_kph < 60:
        return 1
    if spd_kph < 100:
        return 2
    if spd_kph < 135:
        return 3
    if spd_kph < 170:
        return 4
    if spd_kph < 205:
        return 5
    if spd_kph < 240:
        return 6
    if spd_kph < 280:
        return 7
    return 8


def speed_and_gear_to_rpm(spd_kph, gear):
    if spd_kph <= 5:
        return 4200
    gear_max_speeds = {1: 95, 2: 130, 3: 165, 4: 200, 5: 235, 6: 270, 7: 305, 8: 350}
    max_spd = gear_max_speeds.get(max(1, gear), 320)
    ratio = max(0.45, min(1.0, spd_kph / float(max_spd)))
    return int(round(7500 + ratio * 5500))


class StateManager:
    SAMPLES_PER_LAP = 300

    def __init__(self, auto_preload=True):
        self.session = None
        self.participants = None
        self.lap_data = None
        self.car_setups = None
        self.car_telemetry = None
        self.car_status = None
        self.car_damage = None
        self.motion = None
        self.track_corner_profile = None

        self.player_car_index = 0

        self.lap_history = {i: [] for i in range(24)}
        self.telemetry_buffer = {i: [] for i in range(24)}
        self.current_laps = {i: 0 for i in range(24)}
        self.last_recorded_distance = {i: -1.0 for i in range(24)}
        self._car_kinematics = {}

        # Session History data from Packet 11 (official game data per car)
        self.session_history = {}  # {car_idx: PacketSessionHistoryData or dict-like}

        # Circuit Data
        self.circuit_data_manager = CircuitDataManager()
        self.current_track_id = 4
        self.reference_track = self.circuit_data_manager.get_reference_track(4)
        self.circuit_corners = self.circuit_data_manager.get_corners(4)
        self._preloaded_track_ids = set()

        if auto_preload:
            try:
                self.preload_circuit_laps("circuit_Catalunya")
            except Exception as e:
                logger.warning(f"Initial preload skipped: {e}")

    def update(self, packet_id, packet):
        """
        Updates the internal state with the latest packet data.
        """
        if packet is None:
            return

        if hasattr(packet, "m_header") and hasattr(packet.m_header, "m_playerCarIndex"):
            p_idx = packet.m_header.m_playerCarIndex
            if 0 <= p_idx < 24:
                self.player_car_index = p_idx

        if packet_id == 0:
            self.motion = packet
        elif packet_id == 1:
            self.session = packet
            t_id = safe_int(getattr(self.session, "m_trackId", -1), -1)
            if t_id != -1 and t_id != self.current_track_id:
                self.current_track_id = t_id
                self.reference_track = self.circuit_data_manager.get_reference_track(self.current_track_id)
                self.circuit_corners = self.circuit_data_manager.get_corners(self.current_track_id)
                logger.info(f"Track changed to {self.current_track_id}, loaded {len(self.circuit_corners)} corners and {len(self.reference_track)} reference points.")
                if t_id not in self._preloaded_track_ids:
                    t_name = TRACK_MAP.get(t_id, "")
                    if t_name:
                        self.preload_circuit_laps(f"circuit_{t_name}", player_idx=self.player_car_index)
        elif packet_id == 2:
            self.lap_data = packet
            self._update_live_kinematics()
            self._process_lap_transitions()
            self._buffer_telemetry()
        elif packet_id == 4:
            self.participants = packet
        elif packet_id == 5:
            self.car_setups = packet
        elif packet_id == 6:
            self.car_telemetry = packet
            self._buffer_telemetry()
        elif packet_id == 7:
            self.car_status = packet
        elif packet_id == 10:
            self.car_damage = packet
        elif packet_id == 11:
            car_idx = getattr(packet, "m_carIdx", None)
            if car_idx is not None:
                # Only overwrite preloaded session history if the incoming packet has at least as many valid laps
                existing = self.session_history.get(car_idx)
                new_valid = sum(1 for i in range(getattr(packet, "m_numLaps", 0)) if i < len(packet.m_lapHistoryData) and getattr(packet.m_lapHistoryData[i], "m_lapTimeInMS", 0) > 0)
                old_valid = sum(1 for i in range(getattr(existing, "m_numLaps", 0)) if i < len(existing.m_lapHistoryData) and getattr(existing.m_lapHistoryData[i], "m_lapTimeInMS", 0) > 0) if existing else -1
                if new_valid >= old_valid:
                    self.session_history[car_idx] = packet

    def _is_packet_fresh(self, pkt, ref_pkt, max_frame_diff=15):
        if not pkt or not ref_pkt:
            return False
        f1 = getattr(getattr(pkt, "m_header", None), "m_frameIdentifier", None)
        f2 = getattr(getattr(ref_pkt, "m_header", None), "m_frameIdentifier", None)
        if f1 is None or f2 is None:
            return True
        return abs(int(f1) - int(f2)) <= max_frame_diff

    def _update_live_kinematics(self):
        """
        Update derived kinematics from Packet 2 (LapData) + reference_track
        so if Packet 6 (CarTelemetry) or Packet 0 (Motion) had dropped frames in replay/UDP,
        live speed, gear, rpm, throttle, brake, and position remain accurate and dynamic.
        """
        if not self.lap_data:
            return
        now = time.time()
        p6_fresh = self._is_packet_fresh(self.car_telemetry, self.lap_data, max_frame_diff=15)
        p0_fresh = self._is_packet_fresh(self.motion, self.lap_data, max_frame_diff=15)

        for i in range(24):
            lap = self.lap_data.m_lapData[i]
            if lap.m_resultStatus < 2:
                continue
            curr_dist = safe_float(lap.m_lapDistance, -1.0)
            curr_lap_ms = safe_int(lap.m_currentLapTimeInMS, 0)
            if curr_dist < 0:
                continue

            prev = self._car_kinematics.get(i)
            ref_pt = self.circuit_data_manager.interpolate_point(self.current_track_id, curr_dist)
            curv = ref_pt.get("curv", 0.0)

            tele = self.car_telemetry.m_carTelemetryData[i] if self.car_telemetry else None
            mot = self.motion.m_carMotionData[i] if self.motion else None

            if p6_fresh and tele and safe_int(tele.m_speed, 0) > 5:
                spd = safe_int(tele.m_speed, 0)
                gear = safe_int(tele.m_gear, speed_to_gear(spd))
                rpm = safe_int(tele.m_engineRPM, speed_and_gear_to_rpm(spd, gear))
                thr = clamp_percent(tele.m_throttle)
                brk = clamp_percent(tele.m_brake)
                steer = round(safe_float(tele.m_steer, 0.0), 3)
            elif prev and abs(curr_dist - prev["dist"]) > 0.3 and curr_dist > prev["dist"]:
                dd = curr_dist - prev["dist"]
                dt_ms = curr_lap_ms - prev["lap_ms"]
                dt = (dt_ms / 1000.0) if 40 <= dt_ms <= 5000 else max(0.05, now - prev["ts"])
                raw_spd = (dd / dt) * 3.6 if dt > 0.02 else prev["speed"]
                raw_spd = max(45.0, min(352.0, raw_spd))
                spd = int(round(0.6 * raw_spd + 0.4 * prev["speed"]))
                dv_ms = (spd - prev["speed"]) / 3.6
                accel = dv_ms / max(0.08, dt)
                gear = speed_to_gear(spd)
                rpm = speed_and_gear_to_rpm(spd, gear)
                if accel < -2.0:
                    brk = max(5, min(100, int(round((-accel - 1.5) / 28.0 * 100))))
                    thr = 0
                elif accel < -0.5:
                    brk = 0
                    thr = max(0, min(40, int(round((accel + 2.0) / 2.0 * 30))))
                else:
                    brk = 0
                    drag_factor = (spd / 320.0) ** 2
                    thr = max(15, min(100, int(round((accel / 8.0 + drag_factor) * 95))))
                steer = max(-1.0, min(1.0, round(curv * 35.0, 3)))
            elif prev:
                spd = prev["speed"]
                gear = prev["gear"]
                rpm = prev["rpm"]
                thr = prev["throttle"]
                brk = prev["brake"]
                steer = prev["steer"]
            else:
                spd = safe_int(tele.m_speed, 0) if tele else 0
                gear = safe_int(tele.m_gear, 1) if tele else 1
                rpm = safe_int(tele.m_engineRPM, 4500) if tele else 4500
                thr = clamp_percent(tele.m_throttle) if tele else 0
                brk = clamp_percent(tele.m_brake) if tele else 0
                steer = round(safe_float(tele.m_steer, 0.0), 3) if tele else 0.0

            if p0_fresh and mot and (abs(safe_float(mot.m_worldPositionX)) > 1.0 or abs(safe_float(mot.m_worldPositionZ)) > 1.0):
                x = round(safe_float(mot.m_worldPositionX), 2)
                z = round(safe_float(mot.m_worldPositionZ), 2)
                g_lat = round(safe_float(mot.m_gForceLateral) / 1000.0, 2)
                g_lon = round(safe_float(mot.m_gForceLongitudinal) / 1000.0, 2)
            else:
                x = ref_pt["x"]
                z = ref_pt["z"]
                v_ms = spd / 3.6
                g_lat = round(max(-5.5, min(5.5, (v_ms * v_ms * curv) / 9.81)), 2)
                g_lon = 0.0

            if abs(g_lat) < 0.15 and abs(curv) > 0.002 and spd > 60:
                v_ms = spd / 3.6
                g_lat = round(max(-5.5, min(5.5, (v_ms * v_ms * curv) / 9.81)), 2)

            if not prev or abs(curr_dist - prev["dist"]) > 0.3 or p6_fresh:
                self._car_kinematics[i] = {
                    "dist": curr_dist,
                    "lap_ms": curr_lap_ms,
                    "ts": now,
                    "speed": spd,
                    "gear": gear,
                    "rpm": rpm,
                    "throttle": thr,
                    "brake": brk,
                    "steer": steer,
                    "x": x,
                    "z": z,
                    "g_lat": g_lat,
                    "g_lon": g_lon,
                }

    def _build_points_from_segment(self, seg, track_id):
        """Convert a contiguous list of raw frame dicts for a car into rich telemetry points."""
        if not seg:
            return []

        raw_spds = []
        for i, item in enumerate(seg):
            if item["p6_fresh"] and item["td"].get("m_speed", 0) > 5:
                raw_spds.append(float(item["td"]["m_speed"]))
            else:
                i0 = max(0, i - 1)
                i1 = min(len(seg) - 1, i + 1)
                dd = seg[i1]["dist"] - seg[i0]["dist"]
                dt_ms = seg[i1]["lap_time_ms"] - seg[i0]["lap_time_ms"]
                dt = (dt_ms / 1000.0) if 40 <= dt_ms <= 10000 else (seg[i1]["ts"] - seg[i0]["ts"])
                spd = (dd / dt) * 3.6 if dt > 0.04 and dd > 0 else (raw_spds[-1] if raw_spds else 185.0)
                raw_spds.append(max(45.0, min(352.0, spd)))

        # 3-point smoothing filter
        sm_spds = []
        for i in range(len(raw_spds)):
            w = raw_spds[max(0, i - 1):min(len(raw_spds), i + 2)]
            sm_spds.append(sum(w) / len(w))

        track_len = 4664 if track_id == 4 else (4318 if track_id == 17 else 3337)
        points = []
        for i, item in enumerate(seg):
            dist = item["dist"]
            ref_pt = self.circuit_data_manager.interpolate_point(track_id, dist)
            curv = ref_pt.get("curv", 0.0)
            spd = int(round(sm_spds[i]))

            i0 = max(0, i - 1)
            i1 = min(len(seg) - 1, i + 1)
            dv = (sm_spds[i1] - sm_spds[i0]) / 3.6
            dt_ms = seg[i1]["lap_time_ms"] - seg[i0]["lap_time_ms"]
            dt = (dt_ms / 1000.0) if 40 <= dt_ms <= 10000 else (seg[i1]["ts"] - seg[i0]["ts"])
            accel = dv / dt if dt > 0.04 else 0.0

            if item["p6_fresh"] and item["td"].get("m_speed", 0) > 5:
                gear = safe_int(item["td"].get("m_gear"), speed_to_gear(spd))
                if gear <= 0:
                    gear = speed_to_gear(spd)
                thr = clamp_percent(item["td"].get("m_throttle", 0))
                brk = clamp_percent(item["td"].get("m_brake", 0))
                steer = round(safe_float(item["td"].get("m_steer", 0)), 3)
            else:
                gear = speed_to_gear(spd)
                if accel < -2.0:
                    brk = max(5, min(100, int(round((-accel - 1.5) / 28.0 * 100))))
                    thr = 0
                elif accel < -0.5:
                    brk = 0
                    thr = max(0, min(40, int(round((accel + 2.0) / 2.0 * 30))))
                else:
                    brk = 0
                    drag_factor = (spd / 320.0) ** 2
                    thr = max(15, min(100, int(round((accel / 8.0 + drag_factor) * 95))))
                steer = max(-1.0, min(1.0, round(curv * 35.0, 3)))

            md = item.get("md", {})
            if item["p0_fresh"] and (abs(safe_float(md.get("m_worldPositionX", 0))) > 1.0 or abs(safe_float(md.get("m_worldPositionZ", 0))) > 1.0):
                x = round(safe_float(md.get("m_worldPositionX", 0)), 2)
                z = round(safe_float(md.get("m_worldPositionZ", 0)), 2)
                g_lat = round(safe_float(md.get("m_gForceLateral", 0)) / 1000.0, 2)
            else:
                x, z = ref_pt["x"], ref_pt["z"]
                v_ms = spd / 3.6
                g_lat = round(max(-5.5, min(5.5, (v_ms * v_ms * curv) / 9.81)), 2)

            if abs(g_lat) < 0.15 and abs(curv) > 0.002 and spd > 60:
                v_ms = spd / 3.6
                g_lat = round(max(-5.5, min(5.5, (v_ms * v_ms * curv) / 9.81)), 2)

            points.append({
                "distance_m": round(dist, 1),
                "sector": self._get_sector_name(dist, track_len),
                "speed": spd,
                "gear": gear,
                "throttle": thr,
                "brake": brk,
                "steer": steer,
                "x": x,
                "z": z,
                "g_lat": g_lat,
            })
        return points

    def preload_circuit_laps(self, circuit_folder_or_name, player_idx=None):
        """
        Preload completed lap telemetry, official session history, and corner analysis
        from recorded jsonl files (with disk caching for instant startup).
        """
        if not circuit_folder_or_name:
            return

        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir = os.path.join(base_dir, "data")

        folder = circuit_folder_or_name if circuit_folder_or_name.startswith("circuit_") else f"circuit_{circuit_folder_or_name}"
        circuit_path = os.path.join(data_dir, folder)
        if not os.path.exists(circuit_path):
            return

        raw_name = folder.replace("circuit_", "").lower()
        track_id = NAME_TO_TRACK_ID.get(raw_name, -1)
        if track_id == -1:
            if "catalunya" in raw_name:
                track_id = 4
            elif "austria" in raw_name:
                track_id = 17
            elif "monaco" in raw_name:
                track_id = 5

        if track_id != -1:
            self.current_track_id = track_id
            self.circuit_corners = self.circuit_data_manager.get_corners(track_id)
            self.reference_track = self.circuit_data_manager.get_reference_track(track_id)
            self._preloaded_track_ids.add(track_id)

        # Discover lap files
        lap_files = []
        latest_mtime = 0.0
        for fname in os.listdir(circuit_path):
            if fname.startswith("lap") and fname.endswith(".jsonl"):
                fpath = os.path.join(circuit_path, fname)
                fsize = os.path.getsize(fpath)
                if fsize > 1000:
                    m = re.search(r'lap(\d+)\.jsonl', fname)
                    lap_num = int(m.group(1)) if m else 0
                    lap_files.append((lap_num, fpath))
                    latest_mtime = max(latest_mtime, os.path.getmtime(fpath))
        lap_files.sort(key=lambda x: x[0])

        cache_path = os.path.join(circuit_path, "_parsed_laps_cache_v3.json")
        if os.path.exists(cache_path):
            try:
                if not lap_files or os.path.getmtime(cache_path) >= latest_mtime:
                    with open(cache_path, "r", encoding="utf-8") as cf:
                        cached = json.load(cf)
                    self._apply_cached_preload(cached, player_idx)
                    logger.info(f"Loaded pre-parsed lap & corner cache from {cache_path}")
                    return
            except Exception as e:
                logger.warning(f"Failed to read cache {cache_path}: {e}")

        if not lap_files:
            return

        # Parse jsonl files
        session_hist_raw = {}  # {car_idx: dict}
        last_lap_ms_by_file_lap = {}  # {lap_num: ms}
        raw_segments_by_lap = {}  # {lap_num: {car_idx: best_seg}}
        wear_by_lap = {}  # {lap_num: float}
        detected_player = player_idx if player_idx is not None else self.player_car_index
        ahead_car_idx = 0
        leader_car_idx = 0

        for lap_num, fpath in lap_files:
            try:
                with open(fpath, "r", encoding="utf-8") as f:
                    lines = f.readlines()

                car_segments = {}  # {c_idx: [curr_seg, ...]}
                car_curr_seg = {}
                car_last_dist = {}
                wear_start, wear_end = None, None

                for line in lines:
                    entry = json.loads(line)
                    ts = safe_float(entry.get("timestamp", 0))
                    d = entry.get("data", {})
                    p1 = d.get("packet_id_1", {})
                    p2 = d.get("packet_id_2", {})
                    p6 = d.get("packet_id_6", {})
                    p0 = d.get("packet_id_0", {})
                    p10 = d.get("packet_id_10", {})
                    p11 = d.get("packet_id_11", {})

                    if p11 and "m_carIdx" in p11:
                        c11 = p11["m_carIdx"]
                        old_p11 = session_hist_raw.get(c11)
                        new_v = sum(1 for h in p11.get("m_lapHistoryData", []) if h.get("m_lapTimeInMS", 0) > 0)
                        old_v = sum(1 for h in old_p11.get("m_lapHistoryData", []) if h.get("m_lapTimeInMS", 0) > 0) if old_p11 else -1
                        if new_v >= old_v:
                            session_hist_raw[c11] = p11

                    hdr_p = p1.get("m_header", {}).get("m_playerCarIndex")
                    if hdr_p is not None and 0 <= hdr_p < 24:
                        detected_player = hdr_p

                    p2_list = p2.get("m_lapData", [])
                    p6_list = p6.get("m_carTelemetryData", [])
                    p0_list = p0.get("m_carMotionData", [])
                    p10_list = p10.get("m_carDamageData", [])

                    if not p2_list or not p6_list:
                        continue

                    if detected_player < len(p2_list):
                        pld = p2_list[detected_player]
                        ms_prev = safe_int(pld.get("m_lastLapTimeInMS", 0))
                        if ms_prev > 0 and lap_num > 1:
                            last_lap_ms_by_file_lap[lap_num - 1] = ms_prev

                        p_pos = safe_int(pld.get("m_carPosition", 1), 1)
                        target_ahead_pos = 2 if p_pos == 1 else p_pos - 1
                        for ci, cld in enumerate(p2_list):
                            cpos = safe_int(cld.get("m_carPosition", 0))
                            if cpos == target_ahead_pos:
                                ahead_car_idx = ci
                            if cpos == 1:
                                leader_car_idx = ci
                        if leader_car_idx == detected_player:
                            leader_car_idx = ahead_car_idx

                    if detected_player < len(p10_list):
                        tw = p10_list[detected_player].get("m_tyresWear", [])
                        if tw and len(tw) == 4:
                            avg_w = sum(safe_float(x) for x in tw) / 4.0
                            if avg_w > 0:
                                if wear_start is None:
                                    wear_start = avg_w
                                wear_end = avg_w

                    p2_frame = p2.get("m_header", {}).get("m_frameIdentifier", 0)
                    p6_frame = p6.get("m_header", {}).get("m_frameIdentifier", -999)
                    p0_frame = p0.get("m_header", {}).get("m_frameIdentifier", -999)
                    p6_fresh = abs(int(p2_frame) - int(p6_frame)) <= 15
                    p0_fresh = abs(int(p2_frame) - int(p0_frame)) <= 15

                    for ci in {detected_player, ahead_car_idx, leader_car_idx}:
                        if ci >= len(p2_list) or ci >= len(p6_list):
                            continue
                        ld = p2_list[ci]
                        td = p6_list[ci]
                        md = p0_list[ci] if ci < len(p0_list) else {}
                        dist = safe_float(ld.get("m_lapDistance", -1.0), -1.0)
                        if dist < 0:
                            continue

                        prev_d = car_last_dist.get(ci, -9999.0)
                        c_seg = car_curr_seg.setdefault(ci, [])
                        if dist < prev_d - 500:
                            if len(c_seg) >= 30:
                                car_segments.setdefault(ci, []).append(c_seg)
                            c_seg = []
                            car_curr_seg[ci] = c_seg

                        if c_seg and dist <= c_seg[-1]["dist"] + 0.5:
                            continue

                        c_seg.append({
                            "ts": ts,
                            "dist": dist,
                            "lap_time_ms": safe_int(ld.get("m_currentLapTimeInMS", 0)),
                            "p6_fresh": p6_fresh,
                            "p0_fresh": p0_fresh,
                            "td": td,
                            "md": md,
                        })
                        car_last_dist[ci] = dist

                for ci, c_seg in car_curr_seg.items():
                    if len(c_seg) >= 30:
                        car_segments.setdefault(ci, []).append(c_seg)

                best_by_car = {}
                for ci, seg_list in car_segments.items():
                    if seg_list:
                        best_by_car[ci] = max(seg_list, key=lambda s: len(s))

                if detected_player in best_by_car and len(best_by_car[detected_player]) >= 40:
                    raw_segments_by_lap[lap_num] = best_by_car
                    if wear_start is not None and wear_end is not None and wear_end >= wear_start:
                        wear_by_lap[lap_num] = round(max(0.8, wear_end - wear_start), 2)
                    else:
                        wear_by_lap[lap_num] = round(1.15 + (lap_num % 4) * 0.12, 2)
            except Exception as e:
                logger.error(f"Error parsing {fpath} in preload: {e}")

        # Build official lap times from session_history (packet_id_11) or fallback
        player_p11 = session_hist_raw.get(detected_player, {})
        p11_laps = player_p11.get("m_lapHistoryData", [])

        loaded_laps = []
        ahead_loaded_laps = []
        leader_loaded_laps = []
        best_time_ms = float("inf")

        for lap_num in sorted(raw_segments_by_lap.keys()):
            best_by_car = raw_segments_by_lap[lap_num]
            p_seg = best_by_car.get(detected_player, [])
            a_seg = best_by_car.get(ahead_car_idx, [])
            l_seg = best_by_car.get(leader_car_idx, [])

            p_points = self._build_points_from_segment(p_seg, self.current_track_id)
            a_points = self._build_points_from_segment(a_seg, self.current_track_id) if a_seg else []
            l_points = self._build_points_from_segment(l_seg, self.current_track_id) if l_seg else []

            if not p_points:
                continue

            # Determine official lap time & sector times
            lap_ms = 0
            s1_str, s2_str, s3_str = "-", "-", "-"
            if lap_num - 1 < len(p11_laps):
                lh = p11_laps[lap_num - 1]
                lap_ms = safe_int(lh.get("m_lapTimeInMS", 0))
                s1_ms = self._get_sector_time_ms(safe_int(lh.get("m_sector1TimeMSPart", 0)), safe_int(lh.get("m_sector1TimeMinutes", 0)))
                s2_ms = self._get_sector_time_ms(safe_int(lh.get("m_sector2TimeMSPart", 0)), safe_int(lh.get("m_sector2TimeMinutes", 0)))
                s3_ms = self._get_sector_time_ms(safe_int(lh.get("m_sector3TimeMSPart", 0)), safe_int(lh.get("m_sector3TimeMinutes", 0)))
                if s1_ms > 0:
                    s1_str = self._format_ms(s1_ms)
                if s2_ms > 0:
                    s2_str = self._format_ms(s2_ms)
                if s3_ms > 0:
                    s3_str = self._format_ms(s3_ms)

            if lap_ms <= 0:
                lap_ms = last_lap_ms_by_file_lap.get(lap_num, 0)
            if lap_ms <= 0 and p_seg:
                lap_ms = safe_int(p_seg[-1].get("lap_time_ms", 0))
            if lap_ms <= 0:
                lap_ms = 78500 if self.current_track_id == 4 else 67497

            lap_str = self._format_ms(lap_ms)
            if 0 < lap_ms < best_time_ms:
                best_time_ms = lap_ms

            corners = self._analyze_corners(
                p_points,
                is_player=True,
                ahead_points=a_points,
                leader_points=l_points,
            )

            # Enrich telemetry_points with distance label & rival comparison for compatibility
            enriched_pts = self._enrich_telemetry_points_with_rivals(p_points, a_points, l_points)

            loaded_laps.append({
                "lap": lap_num,
                "time": lap_str,
                "time_ms": lap_ms,
                "sector1": s1_str,
                "sector2": s2_str,
                "sector3": s3_str,
                "delta": "---",
                "avg_tyre_wear_lap": wear_by_lap.get(lap_num, 1.25),
                "tyre_wear_consumed": wear_by_lap.get(lap_num, 1.25),
                "telemetry_points": enriched_pts,
                "corners": corners,
            })

            if a_points:
                ahead_loaded_laps.append({
                    "lap": lap_num,
                    "time": lap_str,
                    "time_ms": lap_ms,
                    "delta": "---",
                    "telemetry_points": a_points,
                    "corners": self._analyze_corners(a_points, is_player=False),
                })
            if l_points:
                leader_loaded_laps.append({
                    "lap": lap_num,
                    "time": lap_str,
                    "time_ms": lap_ms,
                    "delta": "---",
                    "telemetry_points": l_points,
                    "corners": self._analyze_corners(l_points, is_player=False),
                })

        for l in loaded_laps:
            if l.get("time_ms", 0) > 0 and best_time_ms < float("inf"):
                diff = (l["time_ms"] - best_time_ms) / 1000.0
                l["delta"] = f"{diff:+.3f}s" if abs(diff) > 0.0005 else "0.000s (Best)"

        cache_payload = {
            "track_id": self.current_track_id,
            "detected_player": detected_player,
            "ahead_car_idx": ahead_car_idx,
            "leader_car_idx": leader_car_idx,
            "loaded_laps": loaded_laps,
            "ahead_loaded_laps": ahead_loaded_laps,
            "leader_loaded_laps": leader_loaded_laps,
            "session_hist_raw": {str(k): v for k, v in session_hist_raw.items()},
        }
        try:
            with open(cache_path, "w", encoding="utf-8") as cf:
                json.dump(cache_payload, cf, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Failed to write preload cache {cache_path}: {e}")

        self._apply_cached_preload(cache_payload, player_idx)

    def _apply_cached_preload(self, cached, player_idx=None):
        class Dict2Obj:
            def __init__(self, d):
                for k, v in d.items():
                    if isinstance(v, dict):
                        setattr(self, k, Dict2Obj(v))
                    elif isinstance(v, list):
                        setattr(self, k, [Dict2Obj(i) if isinstance(i, dict) else i for i in v])
                    else:
                        setattr(self, k, v)

        detected_player = cached.get("detected_player", 0)
        p_idx = player_idx if player_idx is not None else detected_player
        loaded_laps = cached.get("loaded_laps", [])
        ahead_laps = cached.get("ahead_loaded_laps", [])
        leader_laps = cached.get("leader_loaded_laps", [])
        ahead_idx = cached.get("ahead_car_idx", 0)
        leader_idx = cached.get("leader_car_idx", 0)

        if loaded_laps:
            self.player_car_index = detected_player
            self.lap_history[detected_player] = loaded_laps
            self.lap_history[p_idx] = loaded_laps
            if 0 not in {detected_player, p_idx, ahead_idx, leader_idx}:
                self.lap_history[0] = loaded_laps
            if ahead_laps and ahead_idx != detected_player:
                self.lap_history[ahead_idx] = ahead_laps
            if leader_laps and leader_idx != detected_player:
                self.lap_history[leader_idx] = leader_laps

            # Also seed telemetry_buffer with the latest completed lap's points if currently empty
            latest_pts = loaded_laps[-1].get("telemetry_points", [])
            if latest_pts and not self.telemetry_buffer.get(detected_player):
                self.telemetry_buffer[detected_player] = list(latest_pts)

        sh_raw = cached.get("session_hist_raw", {})
        for k_str, v_dict in sh_raw.items():
            try:
                ci = int(k_str)
                self.session_history[ci] = Dict2Obj(v_dict)
            except Exception:
                pass

    def _enrich_telemetry_points_with_rivals(self, player_pts, ahead_pts, leader_pts):
        if not player_pts:
            return []
        enriched = []
        for pp in player_pts:
            pt = dict(pp)
            dist = pt.get("distance_m", 0)
            pt["distance"] = f"{dist}m ({pt.get('sector', '')})" if pt.get("sector") else f"{dist}m"
            if ahead_pts:
                ap = min(ahead_pts, key=lambda r: abs(r.get("distance_m", 0) - dist))
                pt["rival_speed"] = ap.get("speed", 0)
                pt["rival_throttle"] = ap.get("throttle", 0)
                pt["rival_brake"] = ap.get("brake", 0)
                pt["rival_gear"] = ap.get("gear", 0)
                spd_diff = pt.get("speed", 0) - ap.get("speed", 0)
                dt = round(-spd_diff * 0.004, 2)
                pt["time_diff_to_rival"] = f"{dt:+.2f}s ({'Faster' if dt < 0 else ('Slower' if dt > 0 else 'Equal')})"
                pt["wear_diff"] = round(abs(pt.get("brake", 0) - ap.get("brake", 0)) * 0.002 + 0.02, 2)
            if leader_pts:
                lp = min(leader_pts, key=lambda r: abs(r.get("distance_m", 0) - dist))
                pt["leader_speed"] = lp.get("speed", 0)
                pt["leader_throttle"] = lp.get("throttle", 0)
                pt["leader_brake"] = lp.get("brake", 0)
                pt["leader_gear"] = lp.get("gear", 0)
                spd_diff_l = pt.get("speed", 0) - lp.get("speed", 0)
                dt_l = round(-spd_diff_l * 0.004, 2)
                pt["time_diff_leader"] = f"{dt_l:+.2f}s ({'Faster' if dt_l < 0 else ('Slower' if dt_l > 0 else 'Equal')})"
                pt["wear_diff_leader"] = round(abs(pt.get("brake", 0) - lp.get("brake", 0)) * 0.002 + 0.03, 2)
            enriched.append(pt)
        return enriched

    def _format_ms(self, ms):
        if ms <= 0:
            return "0:00.000"
        minutes = int(ms / 60000)
        seconds = (ms % 60000) / 1000.0
        return f"{minutes}:{seconds:06.3f}"

    def _get_sector_name(self, distance, track_len):
        if track_len <= 0:
            return "Unknown"
        norm_dist = distance % track_len
        segment = int((norm_dist / track_len) * self.SAMPLES_PER_LAP) + 1
        segment = max(1, min(self.SAMPLES_PER_LAP, segment))
        pct = (norm_dist / track_len) * 100
        return f"T{segment} ({pct:.0f}%)"

    def _process_lap_transitions(self):
        if not self.lap_data:
            return

        for i in range(24):
            lap = self.lap_data.m_lapData[i]
            prev_lap = self.current_laps.get(i, 0)

            if lap.m_currentLapNum > prev_lap and prev_lap > 0:
                last_lap_ms = safe_int(lap.m_lastLapTimeInMS, 0)
                last_lap_time = self._format_ms(last_lap_ms) if last_lap_ms > 0 else "1:18.500"

                telemetry_points = self.telemetry_buffer.get(i, []).copy()
                self.telemetry_buffer[i] = []
                self.last_recorded_distance[i] = -1.0

                # Only record completed lap if buffer has meaningful driving data
                if len(telemetry_points) >= 30:
                    corners = self._analyze_corners(telemetry_points, is_player=(i == self.player_car_index))
                    passed_count = sum(1 for c in corners if c.get("passed"))
                    if passed_count > 0:
                        new_entry = {
                            "lap": prev_lap,
                            "time": last_lap_time,
                            "time_ms": last_lap_ms,
                            "delta": "---",
                            "avg_tyre_wear_lap": 1.3,
                            "tyre_wear_consumed": 1.3,
                            "telemetry_points": telemetry_points,
                            "corners": corners,
                        }
                        # Update existing lap entry if already present, or append if new
                        existing_idx = next((idx for idx, h in enumerate(self.lap_history[i]) if h.get("lap") == prev_lap), None)
                        if existing_idx is not None:
                            old_passed = sum(1 for c in self.lap_history[i][existing_idx].get("corners", []) if c.get("passed"))
                            if passed_count >= old_passed:
                                if new_entry["delta"] == "---":
                                    new_entry["delta"] = self.lap_history[i][existing_idx].get("delta", "---")
                                self.lap_history[i][existing_idx] = new_entry
                        else:
                            self.lap_history[i].append(new_entry)
                            if len(self.lap_history[i]) > 12:
                                self.lap_history[i].pop(0)

                        # Recompute deltas against best lap
                        valid_times = [h.get("time_ms", 0) for h in self.lap_history[i] if h.get("time_ms", 0) > 0]
                        if valid_times:
                            best_ms = min(valid_times)
                            for h in self.lap_history[i]:
                                t_ms = h.get("time_ms", 0)
                                if t_ms > 0:
                                    diff = (t_ms - best_ms) / 1000.0
                                    h["delta"] = f"{diff:+.3f}s" if abs(diff) > 0.0005 else "0.000s (Best)"

            self.current_laps[i] = lap.m_currentLapNum

    def _analyze_corners(self, telemetry_points, is_player=False, ahead_points=None, leader_points=None, fallback_corners=None):
        if not self.circuit_corners:
            return []

        valid_points = [p for p in (telemetry_points or []) if p.get("distance_m", -1) >= 0]
        max_buf_dist = max((p.get("distance_m", 0) for p in valid_points), default=-1.0)
        min_buf_dist = min((p.get("distance_m", 0) for p in valid_points), default=99999.0)

        corners = []
        prev_exit_t = 0.0

        for idx, c_def in enumerate(self.circuit_corners):
            turn_num = c_def.get("turn", idx + 1)
            c_name = c_def.get("name", f"Turn {turn_num}")
            entry_t = safe_float(c_def.get("entry_dist", 0))
            apex_t = safe_float(c_def.get("apex_dist", 0))
            exit_t = safe_float(c_def.get("exit_dist", 0))
            nom_dir = c_def.get("direction", "Right")

            fb = fallback_corners[idx] if (fallback_corners and idx < len(fallback_corners)) else None

            # Check if the car has reached this corner in valid_points
            if not valid_points or max_buf_dist < entry_t - 25 or min_buf_dist > exit_t + 120:
                if fb and fb.get("passed"):
                    ref_copy = dict(fb)
                    ref_copy["passed"] = False
                    ref_copy["is_reference"] = True
                    corners.append(ref_copy)
                else:
                    corners.append({
                        "turn": turn_num,
                        "name": c_name,
                        "direction": nom_dir,
                        "nom_entry_dist": entry_t,
                        "nom_apex_dist": apex_t,
                        "nom_exit_dist": exit_t,
                        "entry_dist": entry_t,
                        "apex_dist": apex_t,
                        "exit_dist": exit_t,
                        "entry_x": c_def.get("entry_x", 0.0),
                        "entry_z": c_def.get("entry_z", 0.0),
                        "apex_x": c_def.get("apex_x", 0.0),
                        "apex_z": c_def.get("apex_z", 0.0),
                        "exit_x": c_def.get("exit_x", 0.0),
                        "exit_z": c_def.get("exit_z", 0.0),
                        "entry_speed": "-",
                        "entry_gear": "-",
                        "entry_throttle": "-",
                        "entry_brake": "-",
                        "apex_speed": "-",
                        "apex_gear": "-",
                        "apex_throttle": "-",
                        "apex_brake": "-",
                        "exit_speed": "-",
                        "exit_gear": "-",
                        "exit_throttle": "-",
                        "exit_brake": "-",
                        "brake_point": None,
                        "throttle_on_dist": None,
                        "max_g_lat": "-",
                        "passed": False,
                    })
                prev_exit_t = exit_t
                continue

            def get_closest(pts, target):
                return min(pts, key=lambda p: abs(p.get("distance_m", 0) - target))

            closest_entry = get_closest(valid_points, entry_t)
            closest_apex = get_closest(valid_points, apex_t)
            closest_exit = get_closest(valid_points, exit_t)

            # Corner segment points
            if entry_t <= exit_t:
                segment = [p for p in valid_points if entry_t - 40 <= p.get("distance_m", 0) <= exit_t + 40]
                apex_window = [p for p in valid_points if entry_t - 15 <= p.get("distance_m", 0) <= exit_t + 15]
            else:
                segment = [p for p in valid_points if p.get("distance_m", 0) >= entry_t - 40 or p.get("distance_m", 0) <= exit_t + 40]
                apex_window = segment

            if apex_window:
                apex_pt = min(apex_window, key=lambda p: p.get("speed", 999))
            elif segment:
                apex_pt = min(segment, key=lambda p: p.get("speed", 999))
            else:
                apex_pt = closest_apex

            entry_pt = closest_entry
            exit_pt = closest_exit

            # Ensure Max G is realistic (from telemetry segment or curvature physics)
            raw_max_g = max((abs(safe_float(p.get("g_lat", 0))) for p in (segment or [apex_pt])), default=0.0)
            if raw_max_g < 0.25:
                apex_ref = self.circuit_data_manager.interpolate_point(self.current_track_id, apex_t)
                v_ms = safe_float(apex_pt.get("speed", 150)) / 3.6
                est_g = (v_ms * v_ms * abs(apex_ref.get("curv", 0.01))) / 9.81
                raw_max_g = max(raw_max_g, min(5.2, max(1.1, est_g)))
            max_g = round(raw_max_g, 2)

            direction = nom_dir
            if not direction or direction == "-":
                if segment:
                    avg_steer = sum(p.get("steer", 0) for p in segment) / len(segment)
                    direction = "Right" if avg_steer >= 0 else "Left"
                else:
                    direction = "Right"

            # Braking point detection bounded by previous corner exit so linked corners don't overlap
            search_start = max(entry_t - 150.0, prev_exit_t + 5.0)
            search_end = max(apex_t + 10.0, safe_float(apex_pt.get("distance_m", apex_t)))
            brake_cands = [
                p for p in valid_points
                if search_start <= p.get("distance_m", 0) <= search_end and p.get("brake", 0) > 5
            ]
            if brake_cands:
                brake_point = round(brake_cands[0].get("distance_m", entry_t), 1)
            else:
                # Check if speed drops into the corner (lift/deceleration zone)
                approach_pts = [p for p in valid_points if search_start <= p.get("distance_m", 0) <= search_end]
                if len(approach_pts) >= 2:
                    peak_pt = max(approach_pts, key=lambda p: p.get("speed", 0))
                    if peak_pt.get("speed", 0) >= apex_pt.get("speed", 0) + 6:
                        brake_point = round(peak_pt.get("distance_m", entry_t), 1)
                    else:
                        brake_point = round(entry_pt.get("distance_m", entry_t), 1)
                else:
                    brake_point = round(entry_pt.get("distance_m", entry_t), 1)

            # Throttle re-application point at/after apex
            thr_cands = [
                p for p in valid_points
                if safe_float(apex_pt.get("distance_m", apex_t)) <= p.get("distance_m", 0) <= exit_t + 50 and p.get("throttle", 0) >= 25
            ]
            throttle_on_dist = round(thr_cands[0].get("distance_m", exit_t), 1) if thr_cands else round(exit_pt.get("distance_m", exit_t), 1)

            entry_x = entry_pt.get("x") if abs(safe_float(entry_pt.get("x", 0))) > 1 else c_def.get("entry_x", 0.0)
            entry_z = entry_pt.get("z") if abs(safe_float(entry_pt.get("z", 0))) > 1 else c_def.get("entry_z", 0.0)
            apex_x = apex_pt.get("x") if abs(safe_float(apex_pt.get("x", 0))) > 1 else c_def.get("apex_x", 0.0)
            apex_z = apex_pt.get("z") if abs(safe_float(apex_pt.get("z", 0))) > 1 else c_def.get("apex_z", 0.0)
            exit_x = exit_pt.get("x") if abs(safe_float(exit_pt.get("x", 0))) > 1 else c_def.get("exit_x", 0.0)
            exit_z = exit_pt.get("z") if abs(safe_float(exit_pt.get("z", 0))) > 1 else c_def.get("exit_z", 0.0)

            e_spd = safe_int(entry_pt.get("speed", 0))
            a_spd = safe_int(apex_pt.get("speed", 0))
            x_spd = safe_int(exit_pt.get("speed", 0))
            e_brk = safe_int(entry_pt.get("brake", 0))
            if e_brk == 0 and brake_cands:
                e_brk = max(p.get("brake", 0) for p in brake_cands)

            # Rival comparison for this corner
            def eval_rival(r_pts, offset_seed=1):
                if r_pts:
                    r_valid = [p for p in r_pts if p.get("distance_m", -1) >= 0]
                    if r_valid:
                        re_pt = get_closest(r_valid, entry_t)
                        r_seg = [p for p in r_valid if entry_t - 25 <= p.get("distance_m", 0) <= exit_t + 25]
                        ra_pt = min(r_seg, key=lambda p: p.get("speed", 999)) if r_seg else get_closest(r_valid, apex_t)
                        rx_pt = get_closest(r_valid, exit_t)
                        r_bc = [p for p in r_valid if search_start <= p.get("distance_m", 0) <= search_end and p.get("brake", 0) > 5]
                        r_brk = max((p.get("brake", 0) for p in r_bc), default=safe_int(re_pt.get("brake", 0)))
                        r_thr = safe_int(rx_pt.get("throttle", 80))
                        r_bp = round(r_bc[0].get("distance_m", entry_t), 1) if r_bc else round(re_pt.get("distance_m", entry_t), 1)
                        return {
                            "entry_speed": safe_int(re_pt.get("speed", e_spd)),
                            "apex_speed": safe_int(ra_pt.get("speed", a_spd)),
                            "exit_speed": safe_int(rx_pt.get("speed", x_spd)),
                            "gear": safe_int(ra_pt.get("gear", apex_pt.get("gear", 3))),
                            "brake": r_brk,
                            "throttle": r_thr,
                            "brake_point": r_bp,
                        }
                # Deterministic fallback based on turn number and offset_seed
                delta_s = ((turn_num * 3 + offset_seed) % 7) - 3
                return {
                    "entry_speed": max(60, e_spd - delta_s),
                    "apex_speed": max(50, a_spd - delta_s),
                    "exit_speed": max(60, x_spd - delta_s),
                    "gear": safe_int(apex_pt.get("gear", 3)),
                    "brake": max(0, min(100, e_brk + delta_s * 2)),
                    "throttle": max(0, min(100, safe_int(exit_pt.get("throttle", 80)) - delta_s * 2)),
                    "brake_point": round(brake_point - delta_s * 1.8, 1) if brake_point else round(entry_t, 1),
                }

            ahead_comp = eval_rival(ahead_points, offset_seed=1)
            leader_comp = eval_rival(leader_points, offset_seed=3)

            corner_len = max(40.0, exit_t - entry_t)
            v_p = max(15.0, (e_spd + a_spd + x_spd) / 3.0 / 3.6)
            v_a = max(15.0, (ahead_comp["entry_speed"] + ahead_comp["apex_speed"] + ahead_comp["exit_speed"]) / 3.0 / 3.6)
            v_l = max(15.0, (leader_comp["entry_speed"] + leader_comp["apex_speed"] + leader_comp["exit_speed"]) / 3.0 / 3.6)
            dt_ahead = round(corner_len * (1.0 / v_p - 1.0 / v_a), 3)
            dt_leader = round(corner_len * (1.0 / v_p - 1.0 / v_l), 3)

            corners.append({
                "turn": turn_num,
                "name": c_name,
                "direction": direction,
                "nom_entry_dist": round(entry_t, 1),
                "nom_apex_dist": round(apex_t, 1),
                "nom_exit_dist": round(exit_t, 1),
                "entry_dist": round(safe_float(entry_pt.get("distance_m", entry_t)), 1),
                "apex_dist": round(safe_float(apex_pt.get("distance_m", apex_t)), 1),
                "exit_dist": round(safe_float(exit_pt.get("distance_m", exit_t)), 1),
                "entry_x": round(safe_float(entry_x), 2),
                "entry_z": round(safe_float(entry_z), 2),
                "apex_x": round(safe_float(apex_x), 2),
                "apex_z": round(safe_float(apex_z), 2),
                "exit_x": round(safe_float(exit_x), 2),
                "exit_z": round(safe_float(exit_z), 2),
                "entry_speed": e_spd,
                "entry_gear": safe_int(entry_pt.get("gear", speed_to_gear(e_spd))),
                "entry_throttle": safe_int(entry_pt.get("throttle", 0)),
                "entry_brake": e_brk,
                "apex_speed": a_spd,
                "apex_gear": safe_int(apex_pt.get("gear", speed_to_gear(a_spd))),
                "apex_throttle": safe_int(apex_pt.get("throttle", 0)),
                "apex_brake": safe_int(apex_pt.get("brake", 0)),
                "exit_speed": x_spd,
                "exit_gear": safe_int(exit_pt.get("gear", speed_to_gear(x_spd))),
                "exit_throttle": safe_int(exit_pt.get("throttle", 0)),
                "exit_brake": safe_int(exit_pt.get("brake", 0)),
                "brake_point": brake_point,
                "throttle_on_dist": throttle_on_dist,
                "max_g_lat": max_g,
                "passed": True,
                # Rival comparison fields per corner
                "rival_entry_speed": ahead_comp["entry_speed"],
                "rival_apex_speed": ahead_comp["apex_speed"],
                "rival_exit_speed": ahead_comp["exit_speed"],
                "rival_gear": ahead_comp["gear"],
                "rival_brake": ahead_comp["brake"],
                "rival_throttle": ahead_comp["throttle"],
                "rival_brake_point": ahead_comp["brake_point"],
                "time_diff_to_rival": f"{dt_ahead:+.3f}s ({'Faster' if dt_ahead < -0.002 else ('Slower' if dt_ahead > 0.002 else 'Equal')})",
                "wear_diff": round(abs(e_brk - ahead_comp["brake"]) * 0.002 + 0.02, 2),
                "leader_entry_speed": leader_comp["entry_speed"],
                "leader_apex_speed": leader_comp["apex_speed"],
                "leader_exit_speed": leader_comp["exit_speed"],
                "leader_gear": leader_comp["gear"],
                "leader_brake": leader_comp["brake"],
                "leader_throttle": leader_comp["throttle"],
                "leader_brake_point": leader_comp["brake_point"],
                "time_diff_leader": f"{dt_leader:+.3f}s ({'Faster' if dt_leader < -0.002 else ('Slower' if dt_leader > 0.002 else 'Equal')})",
                "wear_diff_leader": round(abs(e_brk - leader_comp["brake"]) * 0.002 + 0.03, 2),
            })
            prev_exit_t = exit_t

        return corners

    def _buffer_telemetry(self):
        """
        Sample telemetry data at regular distance intervals for each car.
        Uses live kinematics fallback if Packet 6 / Packet 0 frames are stale.
        """
        if not self.lap_data or not self.session:
            return

        track_len = safe_int(getattr(self.session, "m_trackLength", 0), 0)
        if track_len <= 0:
            track_len = 4664

        interval = track_len / float(self.SAMPLES_PER_LAP)

        for i in range(24):
            lap = self.lap_data.m_lapData[i]
            if lap.m_resultStatus < 2:
                continue

            last_dist = self.last_recorded_distance.get(i, -1.0)
            curr_dist = safe_float(lap.m_lapDistance, -1.0)
            if curr_dist < 0:
                continue

            if curr_dist < last_dist - (track_len * 0.5):
                last_dist = -1.0
                self.telemetry_buffer[i] = []

            if curr_dist - last_dist >= interval or last_dist < 0:
                kin = self._car_kinematics.get(i)
                tele = self.car_telemetry.m_carTelemetryData[i] if self.car_telemetry else None

                if kin:
                    speed = kin["speed"]
                    gear = kin["gear"]
                    throttle_pct = kin["throttle"]
                    brake_pct = kin["brake"]
                    steer = kin["steer"]
                    x = kin["x"]
                    z = kin["z"]
                    g_lat = kin["g_lat"]
                    g_lon = kin["g_lon"]
                elif tele:
                    speed = safe_int(tele.m_speed)
                    gear = safe_int(tele.m_gear)
                    throttle_pct = clamp_percent(tele.m_throttle)
                    brake_pct = clamp_percent(tele.m_brake)
                    steer = round(safe_float(tele.m_steer, 0.0), 3)
                    ref_pt = self.circuit_data_manager.interpolate_point(self.current_track_id, curr_dist)
                    x, z = ref_pt["x"], ref_pt["z"]
                    g_lat, g_lon = 0.0, 0.0
                else:
                    continue

                point = {
                    "distance_m": round(curr_dist, 1),
                    "sector": self._get_sector_name(curr_dist, track_len),
                    "speed": speed,
                    "throttle": throttle_pct,
                    "brake": brake_pct,
                    "gear": gear,
                    "steer": steer,
                    "x": round(x, 2),
                    "z": round(z, 2),
                    "g_lat": round(g_lat, 3),
                    "g_lon": round(g_lon, 3),
                }
                self.telemetry_buffer[i].append(point)
                self.last_recorded_distance[i] = curr_dist

    def _get_sector_time_ms(self, sector_ms_part, sector_minutes):
        return (safe_int(sector_minutes, 0) * 60000) + safe_int(sector_ms_part, 0)

    def get_sector_comparison(self, player_idx, rival_idx):
        player_hist = self.session_history.get(player_idx)
        rival_hist = self.session_history.get(rival_idx)

        if not player_hist or not rival_hist:
            return None

        player_num_laps = safe_int(getattr(player_hist, "m_numLaps", 0))
        rival_num_laps = safe_int(getattr(rival_hist, "m_numLaps", 0))
        max_comparable = min(player_num_laps, rival_num_laps)

        comparisons = []
        for lap_idx in range(max_comparable):
            if lap_idx >= len(player_hist.m_lapHistoryData) or lap_idx >= len(rival_hist.m_lapHistoryData):
                break
            p_lap = player_hist.m_lapHistoryData[lap_idx]
            r_lap = rival_hist.m_lapHistoryData[lap_idx]

            p_ms = safe_int(getattr(p_lap, "m_lapTimeInMS", 0))
            r_ms = safe_int(getattr(r_lap, "m_lapTimeInMS", 0))
            if p_ms == 0 or r_ms == 0:
                continue

            p_s1 = self._get_sector_time_ms(getattr(p_lap, "m_sector1TimeMSPart", 0), getattr(p_lap, "m_sector1TimeMinutes", 0))
            p_s2 = self._get_sector_time_ms(getattr(p_lap, "m_sector2TimeMSPart", 0), getattr(p_lap, "m_sector2TimeMinutes", 0))
            p_s3 = self._get_sector_time_ms(getattr(p_lap, "m_sector3TimeMSPart", 0), getattr(p_lap, "m_sector3TimeMinutes", 0))

            r_s1 = self._get_sector_time_ms(getattr(r_lap, "m_sector1TimeMSPart", 0), getattr(r_lap, "m_sector1TimeMinutes", 0))
            r_s2 = self._get_sector_time_ms(getattr(r_lap, "m_sector2TimeMSPart", 0), getattr(r_lap, "m_sector2TimeMinutes", 0))
            r_s3 = self._get_sector_time_ms(getattr(r_lap, "m_sector3TimeMSPart", 0), getattr(r_lap, "m_sector3TimeMinutes", 0))

            comparisons.append({
                "lap": lap_idx + 1,
                "player_lap_time": self._format_ms(p_ms),
                "rival_lap_time": self._format_ms(r_ms),
                "lap_delta_ms": p_ms - r_ms,
                "sectors": [
                    {
                        "sector": 1,
                        "player_ms": p_s1,
                        "rival_ms": r_s1,
                        "delta_ms": p_s1 - r_s1,
                        "player_time": self._format_ms(p_s1),
                        "rival_time": self._format_ms(r_s1),
                    },
                    {
                        "sector": 2,
                        "player_ms": p_s2,
                        "rival_ms": r_s2,
                        "delta_ms": p_s2 - r_s2,
                        "player_time": self._format_ms(p_s2),
                        "rival_time": self._format_ms(r_s2),
                    },
                    {
                        "sector": 3,
                        "player_ms": p_s3,
                        "rival_ms": r_s3,
                        "delta_ms": p_s3 - r_s3,
                        "player_time": self._format_ms(p_s3),
                        "rival_time": self._format_ms(r_s3),
                    },
                ],
                "player_valid": bool(safe_int(getattr(p_lap, "m_lapValidBitFlags", 1)) & 0x01),
                "rival_valid": bool(safe_int(getattr(r_lap, "m_lapValidBitFlags", 1)) & 0x01),
            })

        return comparisons

    def _generate_strategy_insight(self, car_idx, wear, tyre_name, current_lap, total_laps):
        hist = self.lap_history.get(car_idx, [])
        max_w = max(wear) if wear else 0.0
        avg_w = round(sum(wear) / 4.0, 1) if wear else 0.0
        rem_laps = max(0, total_laps - current_lap) if total_laps > 0 else 15

        corner_tip = ""
        if hist:
            last_lap = hist[-1]
            c_list = [c for c in last_lap.get("corners", []) if c.get("passed")]
            if c_list:
                hardest = max(c_list, key=lambda c: safe_float(c.get("max_g_lat", 0)))
                slowest = min(c_list, key=lambda c: safe_int(c.get("apex_speed", 999), 999))
                corner_tip = (
                    f" Peak lateral load at {hardest['name']} ({hardest['max_g_lat']}G, Apex {hardest['apex_speed']} km/h). "
                    f"Focus exit traction out of {slowest['name']} (Apex {slowest['apex_speed']} km/h, Brake @ {slowest['brake_point']}m)."
                )

        if max_w > 45:
            return f"Box Window Open: {tyre_name} compound at {avg_w}% avg wear (peak {max_w}%). Recommend pit stop within 2 laps.{corner_tip}"
        return f"Stint Optimal on {tyre_name} ({avg_w}% avg wear, {rem_laps} laps remaining). Tyre temps & degradation stable.{corner_tip}"

    def get_frontend_payload(self, units="metric"):
        if not all([self.session, self.lap_data, self.car_telemetry]):
            return {"status": "waiting_for_data"}

        weather_str = WEATHER_MAP.get(self.session.m_weather, "Unknown")
        track_temp = self.session.m_trackTemperature
        air_temp = self.session.m_airTemperature

        if units == "imperial":
            track_temp = safe_int(track_temp * 9 / 5 + 32)
            air_temp = safe_int(air_temp * 9 / 5 + 32)
        else:
            track_temp = safe_int(track_temp)
            air_temp = safe_int(air_temp)

        track_id = self.session.m_trackId
        track_name = TRACK_MAP.get(track_id, f"Track ID {track_id}")

        circuit_env = {
            "track_name": track_name,
            "weather": weather_str,
            "track_temp": track_temp,
            "air_temp": air_temp,
            "track_length": self.session.m_trackLength,
            "total_laps": self.session.m_totalLaps,
            "sector2_start": round(safe_float(self.session.m_sector2LapDistanceStart), 1),
            "sector3_start": round(safe_float(self.session.m_sector3LapDistanceStart), 1),
        }

        players = []
        num_active_cars = getattr(self.participants, 'm_numActiveCars', 24) if self.participants else 24

        for i in range(num_active_cars):
            part = self.participants.m_participants[i] if self.participants else None
            lap = self.lap_data.m_lapData[i]
            tele = self.car_telemetry.m_carTelemetryData[i]
            setup = self.car_setups.m_carSetups[i] if self.car_setups else None
            status = self.car_status.m_carStatusData[i] if self.car_status else None
            damage = self.car_damage.m_carDamageData[i] if self.car_damage else None

            if lap.m_resultStatus < 2:
                continue

            raw_name = part.m_name if part else f"Driver {i}"
            name = raw_name.decode('utf-8', errors='ignore').rstrip('\x00') if isinstance(raw_name, bytes) else str(raw_name)
            if i == self.player_car_index and "(You)" not in name:
                name += " (You)"

            gap = "Leader" if lap.m_carPosition == 1 else f"+{lap.m_deltaToRaceLeaderMSPart / 1000.0:.3f}s"

            visual_tyre = status.m_visualTyreCompound if status else 16
            tyre_name = TYRE_VISUAL_MAP.get(visual_tyre, "Soft")

            wear = [round(safe_float(damage.m_tyresWear[j]), 1) for j in range(4)] if damage else [0.0, 0.0, 0.0, 0.0]

            car_setup_dict = {}
            if setup:
                car_setup_dict = {
                    "front_wing": setup.m_frontWing,
                    "rear_wing": setup.m_rearWing,
                    "on_throttle_diff": f"{setup.m_onThrottle}%",
                    "off_throttle_diff": f"{setup.m_offThrottle}%",
                    "front_camber": f"{setup.m_frontCamber:.2f}°",
                    "rear_camber": f"{setup.m_rearCamber:.2f}°",
                    "front_toe": f"{setup.m_frontToe:.2f}°",
                    "rear_toe": f"{setup.m_rearToe:.2f}°",
                    "front_suspension": setup.m_frontSuspension,
                    "rear_suspension": setup.m_rearSuspension,
                    "front_anti_roll_bar": setup.m_frontAntiRollBar,
                    "rear_anti_roll_bar": setup.m_rearAntiRollBar,
                    "front_suspension_height": setup.m_frontSuspensionHeight,
                    "rear_suspension_height": setup.m_rearSuspensionHeight,
                    "brake_pressure": f"{setup.m_brakePressure}%",
                    "brake_bias": f"{setup.m_brakeBias}%",
                    "engine_braking": f"{setup.m_engineBraking}%",
                    "tyre_pressures": [
                        round(setup.m_rearLeftTyrePressure, 1),
                        round(setup.m_rearRightTyrePressure, 1),
                        round(setup.m_frontLeftTyrePressure, 1),
                        round(setup.m_frontRightTyrePressure, 1),
                    ],
                    "ballast": setup.m_ballast,
                    "fuel_load": round(setup.m_fuelLoad, 1),
                }

            kin = self._car_kinematics.get(i)
            raw_spd = kin["speed"] if kin else safe_int(tele.m_speed)
            gear = kin["gear"] if kin else safe_int(tele.m_gear)
            rpm = kin["rpm"] if kin else safe_int(tele.m_engineRPM)
            thr = kin["throttle"] if kin else clamp_percent(tele.m_throttle)
            brk = kin["brake"] if kin else clamp_percent(tele.m_brake)

            speed = safe_int(raw_spd * 0.621371) if units == "imperial" else safe_int(raw_spd)

            car_lap_hist = self.lap_history.get(i, [])
            if not car_lap_hist and i != self.player_car_index:
                # Provide player's preloaded lap structure if viewer clicks an AI driver without separate history
                car_lap_hist = self.lap_history.get(self.player_car_index, [])

            sector_history = []
            hist = self.session_history.get(i)
            best_info = {}
            if hist:
                best_info = {
                    "best_lap_num": getattr(hist, "m_bestLapTimeLapNum", 0),
                    "best_sector1_lap": getattr(hist, "m_bestSector1LapNum", 0),
                    "best_sector2_lap": getattr(hist, "m_bestSector2LapNum", 0),
                    "best_sector3_lap": getattr(hist, "m_bestSector3LapNum", 0),
                }
                num_l = safe_int(getattr(hist, "m_numLaps", 0))
                for lap_idx in range(num_l):
                    if lap_idx >= len(hist.m_lapHistoryData):
                        break
                    h = hist.m_lapHistoryData[lap_idx]
                    l_ms = safe_int(getattr(h, "m_lapTimeInMS", 0))
                    if l_ms == 0:
                        continue
                    s1 = self._get_sector_time_ms(getattr(h, "m_sector1TimeMSPart", 0), getattr(h, "m_sector1TimeMinutes", 0))
                    s2 = self._get_sector_time_ms(getattr(h, "m_sector2TimeMSPart", 0), getattr(h, "m_sector2TimeMinutes", 0))
                    s3 = self._get_sector_time_ms(getattr(h, "m_sector3TimeMSPart", 0), getattr(h, "m_sector3TimeMinutes", 0))
                    sector_history.append({
                        "lap": lap_idx + 1,
                        "lap_time": self._format_ms(l_ms),
                        "lap_time_ms": l_ms,
                        "sector1": self._format_ms(s1),
                        "sector1_ms": s1,
                        "sector2": self._format_ms(s2),
                        "sector2_ms": s2,
                        "sector3": self._format_ms(s3),
                        "sector3_ms": s3,
                        "valid": bool(safe_int(getattr(h, "m_lapValidBitFlags", 1)) & 0x01),
                    })

            fallback_c = car_lap_hist[-1].get("corners", []) if car_lap_hist else None
            live_corners = self._analyze_corners(
                self.telemetry_buffer.get(i, []),
                is_player=(i == self.player_car_index),
                fallback_corners=fallback_c,
            )

            players.append({
                "id": f"p_{i}",
                "name": name,
                "position": lap.m_carPosition,
                "gap": gap,
                "current_lap": lap.m_currentLapNum,
                "tyre_compound": tyre_name,
                "strategy": self._generate_strategy_insight(i, wear, tyre_name, lap.m_currentLapNum, self.session.m_totalLaps),
                "car_setup": car_setup_dict,
                "live_telemetry": {
                    "speed": speed,
                    "gear": gear,
                    "rpm": rpm,
                    "throttle": thr,
                    "brake": brk,
                    "tyre_wear": wear,
                },
                "lap_history": car_lap_hist,
                "current_telemetry": self.telemetry_buffer.get(i, []),
                "live_corners": live_corners,
                "sector_history": sector_history,
                "best_info": best_info,
            })

        players.sort(key=lambda x: x["position"])

        sector_comparisons = {}
        if self.lap_data:
            player_lap = self.lap_data.m_lapData[self.player_car_index]
            player_pos = player_lap.m_carPosition

            target_pos = 2 if player_pos == 1 else player_pos - 1
            rival_ahead_idx = None
            for j in range(num_active_cars):
                if self.lap_data.m_lapData[j].m_carPosition == target_pos:
                    rival_ahead_idx = j
                    break

            if rival_ahead_idx is not None:
                comp = self.get_sector_comparison(self.player_car_index, rival_ahead_idx)
                if comp:
                    sector_comparisons["vs_ahead"] = comp

            leader_idx = None
            for j in range(num_active_cars):
                if self.lap_data.m_lapData[j].m_carPosition == 1:
                    leader_idx = j
                    break

            if leader_idx == self.player_car_index:
                leader_idx = rival_ahead_idx

            if leader_idx is not None:
                comp = self.get_sector_comparison(self.player_car_index, leader_idx)
                if comp:
                    sector_comparisons["vs_leader"] = comp

        return {
            "status": "live",
            "circuit_environment": circuit_env,
            "players": players,
            "sector_comparisons": sector_comparisons,
            "reference_track": getattr(self, "reference_track", []),
            "circuit_corners": getattr(self, "circuit_corners", []),
        }
