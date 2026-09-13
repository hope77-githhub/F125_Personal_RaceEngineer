import asyncio
import logging
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

def on_udp_packet_received(data: bytes):
    """Callback function when UDP listener receives a packet."""
    packet_id, parsed_packet = parse_packet(data)
    if parsed_packet:
        # Update the centralized state manager with the new packet
        state_manager.update(packet_id, parsed_packet)
        
        # Keep a basic track of what packets are received for debugging
        if not hasattr(state_manager, '_debug_packets_received'):
            state_manager._debug_packets_received = set()
            
        if packet_id not in state_manager._debug_packets_received:
            state_manager._debug_packets_received.add(packet_id)
            logger.info(f"First time successfully parsed packet ID: {packet_id}")

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    global udp_listener
    
    await websocket.accept()
    
    # Extract settings from query params
    query_params = websocket.query_params
    port = int(query_params.get("port", 20777))
    update_rate = int(query_params.get("rate", 60))
    units = query_params.get("units", "metric")
    
    logger.info(f"Client connected. Settings - Port: {port}, Rate: {update_rate}Hz, Units: {units}")
    
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
            
            # --- DEBUG DATA DUMP ---
            # Save the payload to a json file periodically to debug lap_history
            import json
            import time
            if getattr(state_manager, '_last_dump_time', 0) < time.time() - 5: # Dump every 5 seconds
                debug_dump = {
                    "payload": payload,
                    "internal_state": {
                        "current_laps": state_manager.current_laps,
                        "last_recorded_distance": state_manager.last_recorded_distance,
                        "lap_history_lens": {k: len(v) for k, v in state_manager.lap_history.items()}
                    }
                }
                with open("debug_payload.json", "w", encoding="utf-8") as f:
                    json.dump(debug_dump, f, ensure_ascii=False, indent=2)
                state_manager._last_dump_time = time.time()
            # -----------------------

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
