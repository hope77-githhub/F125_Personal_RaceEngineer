import asyncio
import logging
import ctypes
import time
import json
import re
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from telemetry.listener import F1UDPListener
from telemetry.f1_types.router import parse_packet
from state_mgmt.manager import StateManager, TRACK_MAP

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEBUG_FILE_PATH = os.path.join(BASE_DIR, "docs", "debug_payload.json")


class Dict2Obj:
    def __init__(self, d):
        for k, v in d.items():
            if isinstance(v, dict):
                setattr(self, k, Dict2Obj(v))
            elif isinstance(v, list):
                setattr(self, k, [Dict2Obj(i) if isinstance(i, dict) else i for i in v])
            else:
                setattr(self, k, v)


udp_listener = None
state_manager = StateManager(auto_preload=True)

# Seed state_manager with debug_payload.json snapshot so live mode has immediate valid session state
if os.path.exists(DEBUG_FILE_PATH):
    try:
        with open(DEBUG_FILE_PATH, "r", encoding="utf-8") as f:
            seed_data = json.load(f)
        for key, pkt_dict in seed_data.items():
            if key.startswith("packet_id_") and isinstance(pkt_dict, dict):
                pid = int(key.replace("packet_id_", ""))
                state_manager.update(pid, Dict2Obj(pkt_dict))
        state_manager.preload_circuit_laps("circuit_Catalunya")
        logger.info("Seeded state_manager from debug_payload.json and preloaded Catalunya laps.")
    except Exception as e:
        logger.warning(f"Failed to seed state_manager from debug_payload.json: {e}")

latest_raw_packet_objs = {}
_last_raw_dump_time = 0.0


def ctypes_to_dict(obj):
    if isinstance(obj, ctypes.Array):
        return [ctypes_to_dict(item) for item in obj]
    elif hasattr(obj, '_fields_'):
        result = {}
        for field, _ in obj._fields_:
            val = getattr(obj, field)
            result[field] = ctypes_to_dict(val)
        return result
    elif isinstance(obj, bytes):
        return obj.decode('utf-8', errors='ignore').rstrip('\x00')
    else:
        return obj


def on_udp_packet_received(data: bytes):
    """Callback function when UDP listener receives a packet."""
    global _last_raw_dump_time
    packet_id, parsed_packet = parse_packet(data)
    if parsed_packet:
        state_manager.update(packet_id, parsed_packet)
        latest_raw_packet_objs[f"packet_id_{packet_id}"] = parsed_packet

        current_time = time.time()
        if current_time - _last_raw_dump_time > 0.2:  # Save log at 5Hz max
            _last_raw_dump_time = current_time
            try:
                os.makedirs(os.path.dirname(DEBUG_FILE_PATH), exist_ok=True)
                snapshot_dict = {k: ctypes_to_dict(v) for k, v in latest_raw_packet_objs.items()}

                with open(DEBUG_FILE_PATH, "w", encoding="utf-8") as f:
                    json.dump(snapshot_dict, f, ensure_ascii=False, indent=2)

                track_id = getattr(state_manager, 'current_track_id', -1)
                track_name_safe = "unknown"
                if track_id != -1:
                    try:
                        raw_name = TRACK_MAP.get(track_id, str(track_id))
                        track_name_safe = re.sub(r'[^a-zA-Z0-9_\-]', '_', raw_name)
                    except Exception:
                        track_name_safe = str(track_id)

                circuit_folder = f"circuit_{track_name_safe}"
                current_lap = 1
                try:
                    if getattr(state_manager, 'lap_data', None):
                        player_idx = parsed_packet.m_header.m_playerCarIndex
                        current_lap = state_manager.lap_data.m_lapData[player_idx].m_currentLapNum
                except Exception:
                    pass

                log_dir = os.path.join(BASE_DIR, "backend", "data", circuit_folder)
                os.makedirs(log_dir, exist_ok=True)

                log_path = os.path.join(log_dir, f"lap{current_lap}.jsonl")
                log_entry = {
                    "timestamp": current_time,
                    "data": snapshot_dict,
                }
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
            except Exception as e:
                logger.error(f"Failed to dump raw payload: {e}")


def get_available_replays():
    """Scan backend/data directory for available circuits and valid lap files."""
    data_dir = os.path.join(BASE_DIR, "backend", "data")
    if not os.path.exists(data_dir):
        return []

    circuits = []
    for item in sorted(os.listdir(data_dir)):
        item_path = os.path.join(data_dir, item)
        if os.path.isdir(item_path) and item.startswith("circuit_") and item != "circuit_unknown":
            raw_circuit_name = item.replace("circuit_", "")
            # Check if pre-parsed cache exists to know which laps are complete
            valid_lap_nums = None
            cache_file = os.path.join(item_path, "_parsed_laps_cache_v3.json")
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, "r", encoding="utf-8") as cf:
                        c_data = json.load(cf)
                    valid_lap_nums = {l["lap"] for l in c_data.get("loaded_laps", [])}
                except Exception:
                    valid_lap_nums = None

            laps = []
            files = []
            for fname in sorted(os.listdir(item_path)):
                if fname.startswith("lap") and fname.endswith(".jsonl"):
                    fpath = os.path.join(item_path, fname)
                    fsize = os.path.getsize(fpath)
                    if fsize > 1_000_000:  # Only full lap files (> 1MB)
                        match = re.search(r'lap(\d+)\.jsonl', fname)
                        lap_num = int(match.group(1)) if match else 0
                        if valid_lap_nums is not None and lap_num not in valid_lap_nums:
                            continue
                        laps.append(lap_num)
                        files.append({
                            "lap": lap_num,
                            "filename": fname,
                            "rel_path": f"{item}/{fname}",
                            "size_mb": round(fsize / (1024 * 1024), 2),
                        })
            if files:
                files.sort(key=lambda x: x["lap"])
                laps.sort()
                circuits.append({
                    "id": item,
                    "name": raw_circuit_name,
                    "laps": laps,
                    "files": files,
                })
    return circuits


@app.get("/api/replays")
def get_replays_endpoint():
    return {"circuits": get_available_replays()}


async def replay_telemetry_loop(websocket: WebSocket, update_rate: int, units: str, circuit: str = "circuit_Catalunya", lap: str = "all", speed: float = 1.0, loop: bool = True):
    data_dir = os.path.join(BASE_DIR, "backend", "data")
    target_dir = os.path.join(data_dir, circuit)
    if not os.path.exists(target_dir):
        avail = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d)) and d.startswith("circuit_")]
        if not avail:
            logger.error("No replay data directories found.")
            return
        target_dir = os.path.join(data_dir, avail[0])
        circuit = avail[0]

    replay_manager = StateManager(auto_preload=False)
    replay_manager.preload_circuit_laps(circuit)

    valid_lap_nums = {l["lap"] for l in replay_manager.lap_history.get(replay_manager.player_car_index, [])}

    files_to_play = []
    if lap == "all":
        all_laps = []
        for fname in os.listdir(target_dir):
            if fname.startswith("lap") and fname.endswith(".jsonl"):
                fpath = os.path.join(target_dir, fname)
                fsize = os.path.getsize(fpath)
                if fsize > 1_000_000:
                    match = re.search(r'lap(\d+)\.jsonl', fname)
                    lap_num = int(match.group(1)) if match else 0
                    if not valid_lap_nums or lap_num in valid_lap_nums:
                        all_laps.append((lap_num, fpath))
        all_laps.sort(key=lambda x: x[0])
        files_to_play = [p for _, p in all_laps]
    else:
        target_file = os.path.join(target_dir, f"lap{lap}.jsonl" if not str(lap).endswith(".jsonl") else str(lap))
        if os.path.exists(target_file):
            files_to_play = [target_file]

    if not files_to_play:
        logger.error(f"No valid replay files found in {target_dir} for lap={lap}")
        return

    logger.info(f"Replaying {len(files_to_play)} file(s) for {circuit}: {[os.path.basename(f) for f in files_to_play]} at speed {speed}x")
    delay = max(0.015, 0.2 / max(0.1, speed))

    while True:
        for fpath in files_to_play:
            logger.info(f"Streaming {os.path.basename(fpath)}...")
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    all_lines = f.readlines()
                    total_lines = len(all_lines)
                    last_frames = {}
                    last_p_dist = -9999.0

                    for line_idx, line in enumerate(all_lines):
                        entry = json.loads(line)
                        data = entry.get("data", {})

                        # Check if player car distance changed so we skip parked garage frames
                        p1 = data.get("packet_id_1", {})
                        p2 = data.get("packet_id_2", {})
                        p_idx = p1.get("m_header", {}).get("m_playerCarIndex", replay_manager.player_car_index)
                        p2_list = p2.get("m_lapData", [])
                        if p_idx < len(p2_list):
                            curr_d = float(p2_list[p_idx].get("m_lapDistance", -1.0))
                            if line_idx > 2 and abs(curr_d - last_p_dist) < 0.3:
                                continue
                            last_p_dist = curr_d

                        # Update packets in deterministic order (session & participants before lap_data & telemetry)
                        for pid in (1, 4, 5, 7, 10, 11, 0, 6, 2):
                            key = f"packet_id_{pid}"
                            pkt_dict = data.get(key)
                            if pkt_dict and isinstance(pkt_dict, dict):
                                f_id = pkt_dict.get("m_header", {}).get("m_frameIdentifier")
                                if f_id is None or last_frames.get(pid) != f_id or line_idx == 0:
                                    last_frames[pid] = f_id
                                    replay_manager.update(pid, Dict2Obj(pkt_dict))

                        payload = replay_manager.get_frontend_payload(units=units)
                        if payload.get("status") == "live":
                            payload["replay_info"] = {
                                "is_replay": True,
                                "circuit": circuit,
                                "file": os.path.basename(fpath),
                                "frame": line_idx + 1,
                                "total_frames": total_lines,
                                "progress_pct": round(((line_idx + 1) / total_lines) * 100, 1),
                                "speed": speed,
                            }
                        await websocket.send_json(payload)
                        await asyncio.sleep(delay)
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected during replay")
                return
            except Exception as e:
                logger.error(f"Error during replay of {fpath}: {e}")
                return

        if not loop:
            break
        logger.info("Replay sequence finished, looping from beginning...")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global udp_listener

    await websocket.accept()

    query_params = websocket.query_params
    port = int(query_params.get("port", 20777))
    update_rate = int(query_params.get("rate", 60))
    units = query_params.get("units", "metric")
    replay = query_params.get("replay", "false").lower() == "true"
    circuit = query_params.get("circuit", "circuit_Catalunya")
    lap = query_params.get("lap", "all")
    try:
        speed = float(query_params.get("speed", 1.0))
    except (ValueError, TypeError):
        speed = 1.0
    loop = query_params.get("loop", "true").lower() == "true"

    logger.info(f"Client connected. Settings - Port: {port}, Rate: {update_rate}Hz, Units: {units}, Replay: {replay}")

    if replay:
        logger.info(f"Starting Replay Mode: circuit={circuit}, lap={lap}, speed={speed}x, loop={loop}")
        await replay_telemetry_loop(websocket, update_rate, units, circuit=circuit, lap=lap, speed=speed, loop=loop)
        return

    if udp_listener is None or udp_listener.port != port:
        if udp_listener:
            udp_listener.stop()
        udp_listener = F1UDPListener(port=port, update_rate=update_rate)
        udp_listener.start()
        asyncio.create_task(udp_listener.listen(on_udp_packet_received))

    try:
        while True:
            payload = state_manager.get_frontend_payload(units=units)
            await websocket.send_json(payload)
            await asyncio.sleep(1.0 / max(1, min(60, update_rate)))
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        if udp_listener:
            udp_listener.stop()
            udp_listener = None


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
