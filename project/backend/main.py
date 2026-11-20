import asyncio
import logging
import ctypes
import time
import json
import re
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from telemetry.listener import F1UDPListener
from telemetry.f1_types.router import parse_packet
from state_mgmt.manager import StateManager, TRACK_MAP, ENGINEER_VOICE_CLIPS
from state_mgmt.sessions import list_sessions, session_frame_refs, frame_session_uid, packet_session_uid
from state_mgmt import engineer_brain
from pydantic import BaseModel
from overlay_manager import OverlayManager
from telemetry.encoder import encode_packet

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
VOICE_DIR = os.path.join(BASE_DIR, "backend", "data", "voice")
if os.path.exists(VOICE_DIR):
    app.mount("/voice", StaticFiles(directory=VOICE_DIR), name="voice")
    logger.info(f"Mounted static voice directory from {VOICE_DIR}")



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
# TV overlay (project/overlay): separate Node/Electron program fed by our UDP stream
overlay_manager = OverlayManager(BASE_DIR)

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
    overlay_manager.forward(data)
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
                try:
                    sessions = list_sessions(item_path)
                except Exception as e:
                    logger.warning(f"Session index failed for {item}: {e}")
                    sessions = []
                circuits.append({
                    "id": item,
                    "name": raw_circuit_name,
                    "laps": laps,
                    "files": files,
                    # recorded files can mix sessions; replay one session at a time
                    "sessions": sessions,
                })
    return circuits


@app.get("/api/replays")
def get_replays_endpoint():
    return {"circuits": get_available_replays()}
@app.get("/api/corner_map/tracks")
def corner_map_tracks_endpoint():
    """Tracks that have a corner definition file in backend/circuit_data."""
    cdm = state_manager.circuit_data_manager
    return {"tracks": [
        {"track_id": tid, "name": TRACK_MAP.get(tid, f"Track {tid}"),
         "corners": len(cdm.get_corners(tid)), "file": cdm.corner_file_map[tid]}
        for tid in cdm.corner_track_ids()
    ]}


@app.get("/api/corner_map/{track_id}")
def corner_map_endpoint(track_id: int):
    data = state_manager.circuit_data_manager.get_corner_map(track_id)
    if data is None:
        return {"error": f"No corner data for track {track_id}"}
    data["name"] = TRACK_MAP.get(track_id, f"Track {track_id}")
    return data


@app.get("/api/voice/clips")
def get_voice_clips_endpoint():
    return {
        "persona": "redbull",
        "name": "Red Bull Engineer",
        "team": "Red Bull Racing",
        "clips": state_manager.load_voice_manifest()
    }


@app.post("/api/voice/test_trigger/{clip_id}")
def test_voice_trigger_endpoint(clip_id: str):
    event = state_manager.trigger_voice_clip(clip_id)
    return {"status": "triggered", "event": event}


# The manager the driver is currently looking at: a running replay, otherwise the live UDP state.
_active_replay_manager = None


class AskBody(BaseModel):
    text: str


class OverlayStartBody(BaseModel):
    window: bool = True
    halo: bool = True   # TV-pod halo HUD (off upstream by default; the game doesn't report the camera)


@app.get("/api/overlay/status")
def overlay_status_endpoint():
    return overlay_manager.status()


@app.post("/api/overlay/start")
async def overlay_start_endpoint(body: OverlayStartBody = OverlayStartBody()):
    """Start the TV overlay (server + transparent window). Also makes sure our UDP listener runs so
    live packets reach the overlay even before a live dashboard session is opened."""
    global udp_listener
    if udp_listener is None:
        udp_listener = F1UDPListener(port=20777, update_rate=60)
        try:
            udp_listener.start()
            asyncio.create_task(udp_listener.listen(on_udp_packet_received))
        except OSError as e:
            logger.warning(f"UDP 20777 not available for the overlay feed: {e}")
            udp_listener = None
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, overlay_manager.start, body.window, body.halo)


@app.post("/api/overlay/stop")
def overlay_stop_endpoint():
    return overlay_manager.stop()


@app.on_event("shutdown")
def _stop_overlay_on_shutdown():
    overlay_manager.stop()


@app.get("/api/qa/presets")
def qa_presets_endpoint():
    """Suggested driver questions (Korean / English) the engineer understands."""
    return {"presets": engineer_brain.PRESET_QUESTIONS}


@app.post("/api/ask")
async def ask_engineer_endpoint(body: AskBody):
    """Driver question -> spoken answer event (same shape as a radio voice_event).
    async so it runs on the event loop between replay frames, never concurrently with them."""
    mgr = _active_replay_manager or state_manager
    return {"event": mgr.answer_question(body.text)}



async def replay_telemetry_loop(websocket: WebSocket, update_rate: int, units: str, circuit: str = "circuit_Catalunya", lap: str = "all", speed: float = 1.0, loop: bool = True, session: str = None):
    data_dir = os.path.join(BASE_DIR, "backend", "data")
    target_dir = os.path.join(data_dir, circuit)
    if not os.path.exists(target_dir):
        avail = [d for d in os.listdir(data_dir) if os.path.isdir(os.path.join(data_dir, d)) and d.startswith("circuit_")]
        if not avail:
            logger.error("No replay data directories found.")
            return
        target_dir = os.path.join(data_dir, avail[0])
        circuit = avail[0]

    # One session at a time: default to the session with the most recorded frames
    sessions = list_sessions(target_dir)
    if sessions and not any(x["uid"] == str(session) for x in sessions):
        session = max(sessions, key=lambda x: x["frames"])["uid"] if sessions else None
    session_meta = next((x for x in sessions if x["uid"] == str(session)), None)

    replay_manager = StateManager(auto_preload=False)
    replay_manager.preload_circuit_laps(circuit, session_uid=session)
    global _active_replay_manager
    _active_replay_manager = replay_manager

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

    session_lines = None  # {fpath: set(line_idx)} when replaying one session
    if session:
        refs = session_frame_refs(target_dir, session)
        session_lines = {}
        for fp, li in refs:
            session_lines.setdefault(fp, set()).add(li)
        lap_num_of = lambda fp: int(re.search(r"lap(\d+)\.jsonl", fp).group(1)) if re.search(r"lap(\d+)\.jsonl", fp) else 0
        files_to_play = sorted(session_lines, key=lap_num_of)
        logger.info(f"Replay session {session_meta['label'] if session_meta else session}: "
                    f"{len(refs)} frames in {len(files_to_play)} file(s)")

    if not files_to_play:
        logger.error(f"No valid replay files found in {target_dir} for lap={lap}")
        return

    logger.info(f"Replaying {len(files_to_play)} file(s) for {circuit}: {[os.path.basename(f) for f in files_to_play]} at speed {speed}x")
    delay = max(0.015, 0.2 / max(0.1, speed))
    overlay_sent_at = {}  # packet id -> last time it was forwarded to the TV overlay

    while True:
        sent_this_pass = 0
        for fpath in files_to_play:
            logger.info(f"Streaming {os.path.basename(fpath)}...")
            try:
                with open(fpath, 'r', encoding='utf-8') as f:
                    all_lines = f.readlines()
                    total_lines = len(all_lines)
                    last_frames = {}
                    last_p_dist = -9999.0

                    keep_lines = session_lines.get(fpath) if session_lines is not None else None
                    for line_idx, line in enumerate(all_lines):
                        if line_idx % 500 == 0:
                            await asyncio.sleep(0)  # filtered-out stretches must not starve the event loop
                        if keep_lines is not None and line_idx not in keep_lines:
                            continue
                        entry = json.loads(line)
                        data = entry.get("data", {})
                        if session and lap != "all":
                            try:
                                pi = int(data["packet_id_1"]["m_header"]["m_playerCarIndex"])
                                if str(data["packet_id_2"]["m_lapData"][pi]["m_currentLapNum"]) != str(lap):
                                    continue
                            except Exception:
                                continue

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
                        # 16 (2026 car telemetry 2: active aero / overtake) only feeds the TV overlay
                        for pid in (1, 4, 5, 7, 10, 11, 0, 6, 16, 2):
                            key = f"packet_id_{pid}"
                            pkt_dict = data.get(key)
                            # recorder snapshots can hold stale packets from a previous session
                            if session and packet_session_uid(pkt_dict) not in (None, str(session)):
                                continue
                            if pkt_dict and isinstance(pkt_dict, dict):
                                f_id = pkt_dict.get("m_header", {}).get("m_frameIdentifier")
                                if f_id is None or last_frames.get(pid) != f_id or line_idx == 0:
                                    last_frames[pid] = f_id
                                    if pid != 16:
                                        replay_manager.update(pid, Dict2Obj(pkt_dict))
                                    if overlay_manager.forwarding:
                                        overlay_manager.forward(encode_packet(pid, pkt_dict))
                                        overlay_sent_at[pid] = time.time()
                                elif (pid in (1, 4) and overlay_manager.forwarding
                                      and time.time() - overlay_sent_at.get(pid, 0) > 2.0):
                                    # Session / participants rarely change in a recording, so they would
                                    # be sent once; an overlay started a moment later would never get
                                    # driver names. Re-send them every 2 s, like the game does live.
                                    overlay_manager.forward(encode_packet(pid, pkt_dict))
                                    overlay_sent_at[pid] = time.time()

                        payload = replay_manager.get_frontend_payload(units=units)
                        if payload.get("status") == "live":
                            # Contextual voice evaluation during recorded replay
                            voice_ev = replay_manager.evaluate_voice_triggers(is_replay=True)
                            if voice_ev:
                                payload["voice_event"] = voice_ev
                            payload["voice_clips"] = replay_manager.load_voice_manifest()
                            payload["replay_info"] = {
                                "is_replay": True,
                                "circuit": circuit,
                                "session": session_meta,
                                "file": os.path.basename(fpath),
                                "frame": line_idx + 1,
                                "total_frames": total_lines,
                                "progress_pct": round(((line_idx + 1) / total_lines) * 100, 1),
                                "speed": speed,
                            }
                        await websocket.send_json(payload)
                        sent_this_pass += 1
                        await asyncio.sleep(delay)
            except WebSocketDisconnect:
                logger.info("WebSocket disconnected during replay")
                return
            except Exception as e:
                logger.error(f"Error during replay of {fpath}: {e}")
                return

        if not sent_this_pass:
            # e.g. a lap number the chosen session doesn't have: looping would spin forever
            logger.error(f"Replay: no frames match session={session} lap={lap} in {circuit}; stopping")
            try:
                await websocket.close()
            except Exception:
                pass
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
    session = query_params.get("session") or None

    logger.info(f"Client connected. Settings - Port: {port}, Rate: {update_rate}Hz, Units: {units}, Replay: {replay}")

    if replay:
        logger.info(f"Starting Replay Mode: circuit={circuit}, lap={lap}, speed={speed}x, loop={loop}")
        global _active_replay_manager
        try:
            await replay_telemetry_loop(websocket, update_rate, units, circuit=circuit, lap=lap, speed=speed, loop=loop, session=session)
        finally:
            _active_replay_manager = None
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



FRONTEND_DIST = os.path.join(BASE_DIR, "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
    logger.info(f"Mounted static frontend distribution from {FRONTEND_DIST}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
