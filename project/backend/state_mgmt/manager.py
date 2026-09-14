import math
import logging

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
    This prevents garbage values from uninitialized memory or padding errors.
    """
    f = safe_float(raw_float, 0.0)
    val = int(f * scale)
    return max(0, min(scale, val))


class StateManager:
    # Number of telemetry sample points per lap (controls resolution)
    # More points = more granular corner-by-corner analysis
    SAMPLES_PER_LAP = 300  # ~every 0.67% of track = ~every 22m on Monaco (3.3km)

    def __init__(self):
        # We store the latest packet data for each type
        self.session = None
        self.participants = None
        self.lap_data = None
        self.car_setups = None
        self.car_telemetry = None
        self.car_status = None
        self.car_damage = None
        self.motion = None
        self.track_corner_profile = None
        
        # Player index (0-23) identifying our car
        self.player_car_index = 0
        
        # In-memory track of lap history per car
        self.lap_history = {i: [] for i in range(24)}
        # Telemetry buffer: stores raw telemetry samples during current lap
        self.telemetry_buffer = {i: [] for i in range(24)}
        self.current_laps = {i: 0 for i in range(24)}
        self.last_recorded_distance = {i: -1.0 for i in range(24)}

        # Session History data from Packet 11 (official game data per car)
        self.session_history = {}  # {car_idx: PacketSessionHistoryData}

    def update(self, packet_id, packet):
        """
        Updates the internal state with the latest packet data.
        """
        if packet is None:
            return

        # Always update player index from header
        self.player_car_index = packet.m_header.m_playerCarIndex

        if packet_id == 0:
            self.motion = packet
        elif packet_id == 1:
            self.session = packet
        elif packet_id == 2:
            self.lap_data = packet
            self._process_lap_transitions()
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
            # Session History is per-car (cycling). Store by car index.
            car_idx = packet.m_carIdx
            self.session_history[car_idx] = packet

    def _format_ms(self, ms):
        if ms == 0: return "0:00.000"
        minutes = int(ms / 60000)
        seconds = (ms % 60000) / 1000.0
        return f"{minutes}:{seconds:06.3f}"

    def _get_sector_name(self, distance, track_len):
        """
        Convert a distance value to a human-readable sector/corner name.
        Handles negative distances (before start/finish line).
        """
        if track_len <= 0:
            return "Unknown"
        
        # Normalize distance to 0~track_len range
        norm_dist = distance % track_len if distance >= 0 else (distance % track_len)
        
        # Calculate which segment (1-indexed out of SAMPLES_PER_LAP)
        segment = int((norm_dist / track_len) * self.SAMPLES_PER_LAP) + 1
        segment = max(1, min(self.SAMPLES_PER_LAP, segment))
        
        # Calculate percentage through the lap
        pct = (norm_dist / track_len) * 100
        
        return f"T{segment} ({pct:.0f}%)"

    def _process_lap_transitions(self):
        if not self.lap_data: return
        
        for i in range(24):
            lap = self.lap_data.m_lapData[i]
            prev_lap = self.current_laps.get(i, 0)
            
            # Car has crossed the finish line and started a new lap
            if lap.m_currentLapNum > prev_lap and prev_lap > 0:
                last_lap_time = self._format_ms(lap.m_lastLapTimeInMS)
                
                # Clone buffer and reset it
                telemetry_points = self.telemetry_buffer.get(i, []).copy()
                self.telemetry_buffer[i] = []
                self.last_recorded_distance[i] = -1.0
                
                self.lap_history[i].append({
                    "lap": prev_lap,
                    "time": last_lap_time,
                    "delta": "---",  # Will be calculated later
                    "telemetry_points": telemetry_points,
                    "corners": self._analyze_corners(telemetry_points, is_player=(i == self.player_car_index))
                })
                
                # Limit history to last 10 laps to save memory and network bandwidth
                if len(self.lap_history[i]) > 10:
                    self.lap_history[i].pop(0)
                    
            self.current_laps[i] = lap.m_currentLapNum

    def _analyze_corners(self, telemetry_points, is_player=False):
        if not telemetry_points:
            return []

        # 1. Do dynamic detection
        corners = []
        in_corner = False
        current_corner = []
        # Define corner by Braking zone
        BRAKE_THRESHOLD = 5.0  # 5% brake

        for pt in telemetry_points:
            is_braking = pt.get("brake", 0) > BRAKE_THRESHOLD
            
            if is_braking:
                if not in_corner:
                    in_corner = True
                current_corner.append(pt)
            else:
                if in_corner:
                    in_corner = False
                    if len(current_corner) >= 1:
                        corners.append(self._process_corner_segment(current_corner))
                    current_corner = []
                    
        if in_corner and len(current_corner) >= 1:
            corners.append(self._process_corner_segment(current_corner))
            
        # 2. Update master profile if it's the player and they got a decent number of corners
        if is_player and len(corners) > 5:
            # Player defines the master corner profile for this session!
            self.track_corner_profile = [
                {"entry_dist": c["entry_dist"], "exit_dist": c["exit_dist"], "direction": c["direction"]} 
                for c in corners
            ]
            return corners
            
        # 3. For AI/other cars (or if player hasn't completed a lap yet), apply the master profile if it exists
        if self.track_corner_profile:
            return self._apply_corner_profile(telemetry_points)
            
        # Fallback if no master profile exists yet
        return corners

    def _apply_corner_profile(self, telemetry_points):
        corners = []
        for c_def in self.track_corner_profile:
            # Allow a small buffer of 10m to catch the entry/exit points
            segment = [pt for pt in telemetry_points if c_def["entry_dist"] - 10 <= pt.get("distance_m", 0) <= c_def["exit_dist"] + 10]
            if segment:
                corners.append(self._process_corner_segment(segment, override_direction=c_def["direction"]))
        return corners

    def _process_corner_segment(self, segment, override_direction=None):
        apex_pt = min(segment, key=lambda p: p.get("speed", 999))
        entry_pt = segment[0]
        exit_pt = segment[-1]
        
        if override_direction:
            direction = override_direction
        else:
            avg_steer = sum(p.get("steer", 0) for p in segment) / len(segment)
            direction = "Right" if avg_steer > 0 else "Left"
            
        return {
            "direction": direction,
            "entry_dist": entry_pt.get("distance_m", 0),
            "apex_dist": apex_pt.get("distance_m", 0),
            "exit_dist": exit_pt.get("distance_m", 0),
            "entry_x": entry_pt.get("x", 0),
            "entry_z": entry_pt.get("z", 0),
            "entry_speed": entry_pt.get("speed", 0),
            "apex_speed": apex_pt.get("speed", 0),
            "exit_speed": exit_pt.get("speed", 0),
            "max_g_lat": round(max((abs(p.get("g_lat", 0)) for p in segment), default=0), 2)
        }

    def _buffer_telemetry(self):
        """
        Sample telemetry data at regular distance intervals for each car.
        This stores the RAW clamped values, not formatted strings.
        """
        if not self.lap_data or not self.session or not self.car_telemetry: 
            return
            
        track_len = self.session.m_trackLength
        if track_len == 0: 
            track_len = 5000  # Fallback
            
        # Sample interval in meters
        interval = track_len / float(self.SAMPLES_PER_LAP)
        
        for i in range(24):
            lap = self.lap_data.m_lapData[i]
            tele = self.car_telemetry.m_carTelemetryData[i]
            
            # Skip invalid/inactive cars
            if lap.m_resultStatus < 2:  # 0=invalid, 1=inactive
                continue
            
            last_dist = self.last_recorded_distance.get(i, -1.0)
            curr_dist = safe_float(lap.m_lapDistance, 0.0)
            
            # If crossed finish line (distance reset), reset tracking
            if curr_dist < last_dist - (track_len * 0.5):
                last_dist = -1.0
                
            if curr_dist - last_dist >= interval or last_dist < 0:
                # Clamp throttle and brake to 0~100 (raw float is 0.0~1.0)
                throttle_pct = clamp_percent(tele.m_throttle)
                brake_pct = clamp_percent(tele.m_brake)
                speed = safe_int(tele.m_speed)
                gear = safe_int(tele.m_gear)
                steer = round(safe_float(tele.m_steer, 0.0), 3)
                
                x, z = 0.0, 0.0
                g_lat, g_lon = 0.0, 0.0
                if self.motion:
                    motion_data = self.motion.m_carMotionData[i]
                    x = safe_float(motion_data.m_worldPositionX)
                    z = safe_float(motion_data.m_worldPositionZ)
                    # Quantized G-forces (divide by 1000.0 to get real Gs)
                    g_lat = motion_data.m_gForceLateral / 1000.0
                    g_lon = motion_data.m_gForceLongitudinal / 1000.0
                
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

    def _build_rival_comparison(self, player_idx, rival_idx, lap_num):
        """
        Build corner-by-corner comparison between player and rival for a specific lap.
        Matches telemetry points by distance (nearest-neighbor matching).
        """
        player_history = self.lap_history.get(player_idx, [])
        rival_history = self.lap_history.get(rival_idx, [])
        
        # Find the specific lap data for both cars
        player_lap = None
        rival_lap = None
        
        for h in player_history:
            if h["lap"] == lap_num:
                player_lap = h
                break
        
        for h in rival_history:
            if h["lap"] == lap_num:
                rival_lap = h
                break
        
        if not player_lap or not rival_lap:
            return None
        
        # Cross-reference: for each player telemetry point, find nearest rival point
        player_points = player_lap.get("telemetry_points", [])
        rival_points = rival_lap.get("telemetry_points", [])
        
        if not player_points or not rival_points:
            return None
        
        comparison = []
        for pp in player_points:
            # Find closest rival point by distance
            best_rp = min(rival_points, 
                         key=lambda rp: abs(rp.get("distance_m", 0) - pp.get("distance_m", 0)))
            
            comparison.append({
                "sector": pp.get("sector", ""),
                "distance_m": pp.get("distance_m", 0),
                "player_speed": pp.get("speed", 0),
                "player_throttle": pp.get("throttle", 0),
                "player_brake": pp.get("brake", 0),
                "player_gear": pp.get("gear", 0),
                "player_steer": pp.get("steer", 0),
                "rival_speed": best_rp.get("speed", 0),
                "rival_throttle": best_rp.get("throttle", 0),
                "rival_brake": best_rp.get("brake", 0),
                "rival_gear": best_rp.get("gear", 0),
                "rival_steer": best_rp.get("steer", 0),
            })
        
        return comparison

    def _get_sector_time_ms(self, sector_ms_part, sector_minutes):
        """Convert sector time parts to total milliseconds."""
        return (sector_minutes * 60000) + sector_ms_part

    def get_sector_comparison(self, player_idx, rival_idx):
        """
        Compare sector times between player and rival using official Session History data.
        Returns list of lap comparisons with sector breakdowns.
        """
        player_hist = self.session_history.get(player_idx)
        rival_hist = self.session_history.get(rival_idx)
        
        if not player_hist or not rival_hist:
            return None
        
        player_num_laps = player_hist.m_numLaps
        rival_num_laps = rival_hist.m_numLaps
        
        # Compare laps that both have completed
        max_comparable = min(player_num_laps, rival_num_laps)
        
        comparisons = []
        for lap_idx in range(max_comparable):
            p_lap = player_hist.m_lapHistoryData[lap_idx]
            r_lap = rival_hist.m_lapHistoryData[lap_idx]
            
            # Skip laps with 0 time (not completed yet)
            if p_lap.m_lapTimeInMS == 0 or r_lap.m_lapTimeInMS == 0:
                continue
            
            p_s1 = self._get_sector_time_ms(p_lap.m_sector1TimeMSPart, p_lap.m_sector1TimeMinutes)
            p_s2 = self._get_sector_time_ms(p_lap.m_sector2TimeMSPart, p_lap.m_sector2TimeMinutes)
            p_s3 = self._get_sector_time_ms(p_lap.m_sector3TimeMSPart, p_lap.m_sector3TimeMinutes)
            
            r_s1 = self._get_sector_time_ms(r_lap.m_sector1TimeMSPart, r_lap.m_sector1TimeMinutes)
            r_s2 = self._get_sector_time_ms(r_lap.m_sector2TimeMSPart, r_lap.m_sector2TimeMinutes)
            r_s3 = self._get_sector_time_ms(r_lap.m_sector3TimeMSPart, r_lap.m_sector3TimeMinutes)
            
            comparisons.append({
                "lap": lap_idx + 1,
                "player_lap_time": self._format_ms(p_lap.m_lapTimeInMS),
                "rival_lap_time": self._format_ms(r_lap.m_lapTimeInMS),
                "lap_delta_ms": p_lap.m_lapTimeInMS - r_lap.m_lapTimeInMS,
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
                "player_valid": bool(p_lap.m_lapValidBitFlags & 0x01),
                "rival_valid": bool(r_lap.m_lapValidBitFlags & 0x01),
            })
        
        return comparisons

    def get_frontend_payload(self, units="metric"):
        """
        Builds the JSON payload expected by the React frontend.
        If we don't have enough data yet, we can return a "waiting" status.
        """
        # If we haven't received the basic packets, return waiting status
        if not all([self.session, self.lap_data, self.car_telemetry]):
            return {"status": "waiting_for_data"}

        # 1. Circuit Environment
        weather_str = WEATHER_MAP.get(self.session.m_weather, "Unknown")
        track_temp = self.session.m_trackTemperature
        air_temp = self.session.m_airTemperature
        
        if units == "imperial":
            track_temp = safe_int(track_temp * 9/5 + 32)
            air_temp = safe_int(air_temp * 9/5 + 32)
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

        # 2. Players Data
        players = []
        
        num_active_cars = getattr(self.participants, 'm_numActiveCars', 24) if self.participants else 24
        
        for i in range(num_active_cars):
            # Safe getters for each struct
            part = self.participants.m_participants[i] if self.participants else None
            lap = self.lap_data.m_lapData[i]
            tele = self.car_telemetry.m_carTelemetryData[i]
            setup = self.car_setups.m_carSetups[i] if self.car_setups else None
            status = self.car_status.m_carStatusData[i] if self.car_status else None
            damage = self.car_damage.m_carDamageData[i] if self.car_damage else None

            # Skip cars that are not active (result status 0 = invalid, 1 = inactive)
            if lap.m_resultStatus < 2:
                continue
                
            raw_name = part.m_name if part else f"Driver {i}"
            name = raw_name.decode('utf-8') if isinstance(raw_name, bytes) else raw_name
            if i == self.player_car_index:
                name += " (You)"

            # Delta string
            gap = "Leader" if lap.m_carPosition == 1 else f"+{lap.m_deltaToRaceLeaderMSPart / 1000.0:.3f}s"

            # Tyre Compound
            visual_tyre = status.m_visualTyreCompound if status else 0
            tyre_name = TYRE_VISUAL_MAP.get(visual_tyre, "Unknown")

            # Tyre Wear
            wear = [round(damage.m_tyresWear[j], 1) for j in range(4)] if damage else [0, 0, 0, 0]
            
            # Setup formatting
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
                        round(setup.m_frontRightTyrePressure, 1)
                    ],
                    "ballast": setup.m_ballast,
                    "fuel_load": round(setup.m_fuelLoad, 1)
                }

            speed = tele.m_speed
            if units == "imperial":
                speed = safe_int(speed * 0.621371)
            else:
                speed = safe_int(speed)

            # Build lap history with rival comparison for player's car
            enriched_lap_history = []
            for lap_entry in self.lap_history[i]:
                entry_copy = dict(lap_entry)
                # Keep the raw telemetry_points as-is (already proper values)
                enriched_lap_history.append(entry_copy)

            # Build official sector history from Session History packet
            sector_history = []
            hist = self.session_history.get(i)
            best_info = {}
            if hist:
                best_info = {
                    "best_lap_num": hist.m_bestLapTimeLapNum,
                    "best_sector1_lap": hist.m_bestSector1LapNum,
                    "best_sector2_lap": hist.m_bestSector2LapNum,
                    "best_sector3_lap": hist.m_bestSector3LapNum,
                }
                for lap_idx in range(hist.m_numLaps):
                    h = hist.m_lapHistoryData[lap_idx]
                    if h.m_lapTimeInMS == 0:
                        continue
                    s1 = self._get_sector_time_ms(h.m_sector1TimeMSPart, h.m_sector1TimeMinutes)
                    s2 = self._get_sector_time_ms(h.m_sector2TimeMSPart, h.m_sector2TimeMinutes)
                    s3 = self._get_sector_time_ms(h.m_sector3TimeMSPart, h.m_sector3TimeMinutes)
                    sector_history.append({
                        "lap": lap_idx + 1,
                        "lap_time": self._format_ms(h.m_lapTimeInMS),
                        "lap_time_ms": h.m_lapTimeInMS,
                        "sector1": self._format_ms(s1),
                        "sector1_ms": s1,
                        "sector2": self._format_ms(s2),
                        "sector2_ms": s2,
                        "sector3": self._format_ms(s3),
                        "sector3_ms": s3,
                        "valid": bool(h.m_lapValidBitFlags & 0x01),
                    })

            players.append({
                "id": f"p_{i}",
                "name": name,
                "position": lap.m_carPosition,
                "gap": gap,
                "current_lap": lap.m_currentLapNum,
                "tyre_compound": tyre_name,
                "strategy": "AI Analysis Pending...",
                "car_setup": car_setup_dict,
                "live_telemetry": {
                    "speed": speed,
                    "gear": safe_int(tele.m_gear),
                    "rpm": safe_int(tele.m_engineRPM),
                    "throttle": clamp_percent(tele.m_throttle),
                    "brake": clamp_percent(tele.m_brake),
                    "tyre_wear": wear
                },
                "lap_history": enriched_lap_history,
                "current_telemetry": self.telemetry_buffer[i],
                "sector_history": sector_history,
                "best_info": best_info
            })

        # Sort players by position
        players.sort(key=lambda x: x["position"])

        # Build sector comparison: player vs car directly ahead and vs leader
        sector_comparisons = {}
        if self.lap_data:
            player_lap = self.lap_data.m_lapData[self.player_car_index]
            player_pos = player_lap.m_carPosition
            
            # Find car ahead (position - 1). If player is P1, use P2 as rival.
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
            
            # Find leader (position 1)
            leader_idx = None
            for j in range(num_active_cars):
                if self.lap_data.m_lapData[j].m_carPosition == 1:
                    leader_idx = j
                    break
            
            # If player is the leader, compare against P2 as well (so it's not empty)
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
            "sector_comparisons": sector_comparisons
        }
