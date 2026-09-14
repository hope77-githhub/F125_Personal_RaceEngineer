import asyncio
import logging
import ctypes
import time
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from telemetry.listener import F1UDPListener
from telemetry.f1_types.router import parse_packet
from state_mgmt.manager import StateManager
from state_mgmt.dummy_provider import get_dummy_payload

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

# Global instances (will be managed per session eventually)
udp_listener = None
state_manager = StateManager()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEBUG_FILE_PATH = os.path.join(BASE_DIR, "docs", "debug_payload.json")

latest_raw_packets = {}
_last_raw_dump_time = 0

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
        # Update the centralized state manager with the new packet
        state_manager.update(packet_id, parsed_packet)
        
        # Save raw parsed data for debugging
        latest_raw_packets[f"packet_id_{packet_id}"] = ctypes_to_dict(parsed_packet)
        
        current_time = time.time()
        if current_time - _last_raw_dump_time > 0.2:  # Save log every 0.2 seconds (5Hz)
            try:
                os.makedirs(os.path.dirname(DEBUG_FILE_PATH), exist_ok=True)
                
                # 1. Update the snapshot file (overwrites)
                with open(DEBUG_FILE_PATH, "w", encoding="utf-8") as f:
                    json.dump(latest_raw_packets, f, ensure_ascii=False, indent=2)
                
                # 2. Append to a continuous timeseries log
                log_path = os.path.join(os.path.dirname(DEBUG_FILE_PATH), "raw_telemetry_log.jsonl")
                log_entry = {
                    "timestamp": current_time,
                    "data": latest_raw_packets.copy()
                }
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
                    
                _last_raw_dump_time = current_time
            except Exception as e:
                logger.error(f"Failed to dump raw payload: {e}")

async def replay_telemetry_loop(websocket, update_rate, units):
    import json
    import os
    import asyncio
    from state_mgmt.manager import StateManager
    
    class Dict2Obj:
        def __init__(self, d):
            for k, v in d.items():
                if isinstance(v, dict):
                    setattr(self, k, Dict2Obj(v))
                elif isinstance(v, list):
                    setattr(self, k, [Dict2Obj(i) if isinstance(i, dict) else i for i in v])
                else:
                    setattr(self, k, v)
                    
    log_path = os.path.join(BASE_DIR, "docs", "raw_telemetry_log.jsonl")
    if not os.path.exists(log_path):
        return

    replay_manager = StateManager()
    
    with open(log_path, 'r', encoding='utf-8') as f:
        for line in f:
            try:
                entry = json.loads(line)
                data = entry.get("data", {})
                for key, pkt_dict in data.items():
                    if key.startswith("packet_id_"):
                        packet_id = int(key.replace("packet_id_", ""))
                        packet_obj = Dict2Obj(pkt_dict)
                        replay_manager.update(packet_id, packet_obj)
                
                payload = replay_manager.get_frontend_payload(units=units)
                await websocket.send_json(payload)
                await asyncio.sleep(1.0 / update_rate)
            except Exception as e:
                logger.error(f"Replay error: {e}")
                break

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global udp_listener
    
    await websocket.accept()
    
    # Extract settings from query params
    query_params = websocket.query_params
    port = int(query_params.get("port", 20777))
    update_rate = int(query_params.get("rate", 60))
    units = query_params.get("units", "metric")
    replay = query_params.get("replay", "false").lower() == "true"
    
    logger.info(f"Client connected. Settings - Port: {port}, Rate: {update_rate}Hz, Units: {units}")
    
    if replay:
        logger.info("Starting Replay Mode")
        await replay_telemetry_loop(websocket, update_rate, units)
        return

    # 1. Start UDP Listener on the requested port
    if udp_listener is None or udp_listener.port != port:
        if udp_listener:
            udp_listener.stop()
        udp_listener = F1UDPListener(port=port, update_rate=update_rate)
        
        # We start the listener in the background, feeding packets into our StateManager
        asyncio.create_task(udp_listener.listen(on_udp_packet_received))
        udp_listener.start()
        
    try:
        while True:
            # 2. Get Data Payload
            # 🚨 Switched to REAL DATA for testing 🚨
            payload = state_manager.get_frontend_payload(units=units)
            # payload = get_dummy_payload(units=units)

            await websocket.send_json(payload)
            
            # Control loop rate based on user preference
            await asyncio.sleep(1.0 / update_rate)
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Stop the listener if the client disconnects
        if udp_listener:
            udp_listener.stop()
            udp_listener = None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
