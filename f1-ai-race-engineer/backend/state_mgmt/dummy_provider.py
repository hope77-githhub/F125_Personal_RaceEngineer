import json
import random
import time

corners = [
    "Turn 1 (Abbey)", "Turn 2 (Farm)", "Turn 3 (Village)", "Turn 4 (The Loop)",
    "Turn 5 (Aintree)", "Turn 6 (Brooklands)", "Turn 7 (Luffield)", "Turn 8 (Woodcote)",
    "Turn 9 (Copse)", "Turn 10 (Maggotts)", "Turn 11 (Becketts)", "Turn 12 (Chapel)",
    "Turn 13 (Stowe)", "Turn 14 (Vale)", "Turn 15 (Club)", "Turn 16 (Chicane In)",
    "Turn 17 (Chicane Mid)", "Turn 18 (Club Exit)"
]

def generate_telemetry(corners, base_brake, base_throttle, time_diff_base):
    pts = []
    for i, c in enumerate(corners):
        b = max(0, min(100, base_brake + random.randint(-10, 10)))
        t = max(0, min(100, base_throttle + random.randint(-10, 10)))
        
        rb = max(0, min(100, b + random.randint(-5, 5)))
        rt = max(0, min(100, t + random.randint(-5, 5)))
        td = round(time_diff_base + random.uniform(-0.1, 0.1), 2)
        td_str = f"{td:+.2f}s " + ("(Faster)" if td < 0 else "(Slower)" if td > 0 else "(Equal)")
        
        lb = max(0, min(100, b + random.randint(-8, 8)))
        lt = max(0, min(100, t + random.randint(-8, 8)))
        ld = round(time_diff_base + random.uniform(0.0, 0.2), 2) 
        ld_str = f"{ld:+.2f}s " + ("(Faster)" if ld < 0 else "(Slower)" if ld > 0 else "(Equal)")

        pts.append({
            "distance": c,
            "brake": b,
            "throttle": t,
            "wear_diff": round(random.uniform(0.01, 0.1), 2),
            "time_diff_to_rival": td_str,
            "rival_brake": rb,
            "rival_throttle": rt,
            "wear_diff_leader": round(random.uniform(0.02, 0.15), 2),
            "time_diff_leader": ld_str,
            "leader_brake": lb,
            "leader_throttle": lt
        })
    return pts

def get_setup(fw, rw, bb):
    return {
        "front_wing": fw,
        "rear_wing": rw,
        "on_throttle_diff": f"{random.randint(50, 100)}%",
        "off_throttle_diff": f"{random.randint(50, 100)}%",
        "front_camber": f"{round(random.uniform(-3.5, -2.5), 2)}°",
        "rear_camber": f"{round(random.uniform(-2.0, -1.0), 2)}°",
        "front_toe": f"{round(random.uniform(0.0, 0.1), 2)}°",
        "rear_toe": f"{round(random.uniform(0.2, 0.5), 2)}°",
        "front_suspension": random.randint(1, 11),
        "rear_suspension": random.randint(1, 11),
        "front_anti_roll_bar": random.randint(1, 11),
        "rear_anti_roll_bar": random.randint(1, 11),
        "front_suspension_height": random.randint(1, 11),
        "rear_suspension_height": random.randint(1, 11),
        "brake_pressure": f"{random.randint(80, 100)}%",
        "brake_bias": bb,
        "engine_braking": f"{random.randint(50, 100)}%",
        "tyre_pressures": [round(random.uniform(22.0, 24.0), 1) for _ in range(4)],
        "ballast": random.randint(0, 11),
        "fuel_load": round(random.uniform(10.0, 110.0), 1)
    }

# Pre-generate some static lap history so we don't recreate it every frame
p1_lap_hist = [
    { "lap": 13, "time": "1:24.312", "delta": "-0.150", "avg_tyre_wear_lap": 1.2, "telemetry_points": generate_telemetry(corners, 85, 15, -0.05) },
    { "lap": 14, "time": "1:24.501", "delta": "+0.189", "avg_tyre_wear_lap": 1.5, "telemetry_points": generate_telemetry(corners, 85, 15, 0.0) }
]
p2_lap_hist = [
    { "lap": 13, "time": "1:24.400", "delta": "+0.100", "avg_tyre_wear_lap": 1.0, "telemetry_points": generate_telemetry(corners, 80, 20, 0.05) },
    { "lap": 14, "time": "1:24.450", "delta": "+0.050", "avg_tyre_wear_lap": 1.1, "telemetry_points": generate_telemetry(corners, 80, 20, 0.0) }
]
p3_lap_hist = [
    { "lap": 13, "time": "1:24.600", "delta": "+0.300", "avg_tyre_wear_lap": 1.4, "telemetry_points": generate_telemetry(corners, 90, 10, 0.1) }
]


p1_setup = get_setup(20, 15, "58%")
p2_setup = get_setup(18, 12, "56%")
p3_setup = get_setup(22, 18, "59%")

def get_dummy_payload(units="metric"):
    t = time.time()
    speed_p1 = 280 + 30 * __import__('math').sin(t)
    gear_p1 = max(1, min(8, int((speed_p1 / 320) * 8)))
    rpm_p1 = 10000 + 2000 * __import__('math').sin(t * 2)
    throttle = max(0, min(100, int(50 + 50 * __import__('math').sin(t))))
    brake = 0 if throttle > 10 else int(50 + 50 * __import__('math').cos(t))

    return {
        "status": "live",
        "circuit_environment": {
            "track_name": "Silverstone",
            "weather": "Sunny",
            "track_temp": 32,
            "air_temp": 24,
            "track_length": 5891,
            "total_laps": 52
        },
        "players": [
            {
                "id": "p_1",
                "name": "HAM (You)",
                "position": 1,
                "gap": "Leader",
                "current_lap": 14,
                "tyre_compound": "Soft (C3)",
                "strategy": "Plan A: Box Lap 18 for Hards. Current tyre degradation is slightly higher than expected in Sector 1. Suggest shifting brake bias forward to save rears.",
                "car_setup": p1_setup,
                "live_telemetry": { "speed": int(speed_p1), "gear": gear_p1, "rpm": int(rpm_p1), "throttle": throttle, "brake": brake, "tyre_wear": [15.2, 15.0, 16.5, 16.1] },
                "lap_history": p1_lap_hist
            },
            {
                "id": "p_2",
                "name": "VER",
                "position": 2,
                "gap": "+2.4s",
                "current_lap": 14,
                "tyre_compound": "Medium (C2)",
                "strategy": "Plan B: Going long. Expected Box Lap 25. He is braking earlier and smoother, saving 0.1% more tyre wear per lap at Turn 4.",
                "car_setup": p2_setup,
                "live_telemetry": { "speed": 315, "gear": 8, "rpm": 11800, "throttle": 100, "brake": 0, "tyre_wear": [12.1, 12.0, 13.5, 13.5] },
                "lap_history": p2_lap_hist
            },
            {
                "id": "p_3",
                "name": "NOR",
                "position": 3,
                "gap": "+4.1s",
                "current_lap": 14,
                "tyre_compound": "Soft (C3)",
                "strategy": "Aggressive 2-stop. High tyre wear detected. Might undercut on Lap 16.",
                "car_setup": p3_setup,
                "live_telemetry": { "speed": 305, "gear": 8, "rpm": 11200, "throttle": 100, "brake": 0, "tyre_wear": [18.2, 18.0, 19.5, 19.2] },
                "lap_history": p3_lap_hist
            }
        ]
    }
