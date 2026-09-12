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

class StateManager:
    def __init__(self):
        # We store the latest packet data for each type
        self.session = None
        self.participants = None
        self.lap_data = None
        self.car_setups = None
        self.car_telemetry = None
        self.car_status = None
        self.car_damage = None
        
        # Player index (0-23) identifying our car
        self.player_car_index = 0
        
        # In-memory track of lap history per car
        self.lap_history = {i: [] for i in range(24)}
        self.telemetry_buffer = {i: [] for i in range(24)}

    def update(self, packet_id, packet):
        """
        Updates the internal state with the latest packet data.
        """
        if packet is None:
            return

        # Always update player index from header
        self.player_car_index = packet.m_header.m_playerCarIndex

        if packet_id == 1:
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

    def _process_lap_transitions(self):
        # Logic to detect when a car crosses the finish line 
        # and store its previous lap data into self.lap_history.
        # This will be fully implemented in a later iteration.
        pass

    def _buffer_telemetry(self):
        # Logic to store telemetry points at specific corners for analysis.
        pass

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
            track_temp = int(track_temp * 9/5 + 32)
            air_temp = int(air_temp * 9/5 + 32)
            
        circuit_env = {
            "track_name": f"Track ID {self.session.m_trackId}", # We can map this to names later
            "weather": weather_str,
            "track_temp": track_temp,
            "air_temp": air_temp,
            "track_length": self.session.m_trackLength,
            "total_laps": self.session.m_totalLaps
        }

        # 2. Players Data
        players = []
        
        # We process all active cars (or just the top few, or the player + rivals)
        # For the dashboard, we usually want at least the player and cars around them.
        # We will parse all 24 cars and let frontend handle it.
        num_active_cars = getattr(self.participants, 'm_numActiveCars', 24) if self.participants else 24
        
        for i in range(num_active_cars):
            # Safe getters for each struct
            part = self.participants.m_participants[i] if self.participants else None
            lap = self.lap_data.m_lapData[i]
            tele = self.car_telemetry.m_carTelemetryData[i]
            setup = self.car_setups.m_carSetups[i] if self.car_setups else None
            status = self.car_status.m_carStatusData[i] if self.car_status else None
            damage = self.car_damage.m_carDamageData[i] if self.car_damage else None

            # Skip cars that are not active (result status 0 = invalid)
            if lap.m_resultStatus == 0:
                continue
                
            name = part.m_name.decode('utf-8') if part else f"Driver {i}"
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
                    "tyre_pressures": [round(setup.m_rearLeftTyrePressure, 1), round(setup.m_rearRightTyrePressure, 1), round(setup.m_frontLeftTyrePressure, 1), round(setup.m_frontRightTyrePressure, 1)],
                    "ballast": setup.m_ballast,
                    "fuel_load": round(setup.m_fuelLoad, 1)
                }

            speed = tele.m_speed
            if units == "imperial":
                speed = int(speed * 0.621371)

            players.append({
                "id": f"p_{i}",
                "name": name,
                "position": lap.m_carPosition,
                "gap": gap,
                "current_lap": lap.m_currentLapNum,
                "tyre_compound": tyre_name,
                "strategy": "AI Analysis Pending...", # Real AI logic goes here later
                "car_setup": car_setup_dict,
                "live_telemetry": {
                    "speed": speed,
                    "gear": tele.m_gear,
                    "rpm": tele.m_engineRPM,
                    "throttle": int(tele.m_throttle * 100),
                    "brake": int(tele.m_brake * 100),
                    "tyre_wear": wear
                },
                "lap_history": self.lap_history[i]
            })

        # Sort players by position
        players.sort(key=lambda x: x["position"])

        return {
            "status": "live",
            "circuit_environment": circuit_env,
            "players": players
        }
