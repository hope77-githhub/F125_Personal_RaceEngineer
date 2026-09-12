import asyncio
import json
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from telemetry.listener import F1UDPListener
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
        # We start the listener in the background, though we don't process its packets yet
        # asyncio.create_task(udp_listener.listen(lambda data: print(f"Received {len(data)} bytes")))
        udp_listener.start()
        
    try:
        while True:
            # 2. Get Dummy Data (Simulating Phase 1)
            # In Phase 2, this will be replaced by: payload = state_manager.get_latest_payload()
            payload = get_dummy_payload(units=units)
            
            await websocket.send_json(payload)
            
            # Control loop rate based on user preference
            await asyncio.sleep(1.0 / update_rate)
            
    except WebSocketDisconnect:
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # For now, we stop the listener if the client disconnects
        if udp_listener:
            udp_listener.stop()
            udp_listener = None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
