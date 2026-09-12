import json
import os
from pathlib import Path

# 1. Create settings.json
settings_path = Path("f1-ai-race-engineer/settings.json")
settings_content = {
    "UDP_IP": "0.0.0.0",
    "UDP_PORT": 20777,
    "ZMQ_ADDRESS": "tcp://127.0.0.1:5555",
    "AI_API_KEY": "YOUR_API_KEY_HERE",
    "AI_PROVIDER": "openai",
    "VOICE_ID": "alloy",
    "SYSTEM_PROMPT": "You are Bono, Lewis Hamilton's race engineer. Give concise, encouraging, and accurate telemetry feedback."
}
settings_path.parent.mkdir(parents=True, exist_ok=True)
with open(settings_path, "w", encoding="utf-8") as f:
    json.dump(settings_content, f, indent=4)

# 2. backend/main.py
backend_main_path = Path("f1-ai-race-engineer/backend/main.py")
backend_main_content = """import asyncio
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import zmq
from zmq.asyncio import Context
from telemetry.receiver import start_udp_listener

# Load Settings
SETTINGS_PATH = os.path.join(os.path.dirname(__file__), '..', 'settings.json')
with open(SETTINGS_PATH) as f:
    settings = json.load(f)

app = FastAPI()
zmq_context = Context()

@app.on_event("startup")
async def startup_event():
    # Setup ZMQ Publisher to send data to AI worker
    app.state.zmq_socket = zmq_context.socket(zmq.PUB)
    app.state.zmq_socket.bind(settings["ZMQ_ADDRESS"])
    print(f"[Backend] ZMQ Publisher bound to {settings['ZMQ_ADDRESS']}")
    
    # Start UDP listener as background task
    asyncio.create_task(start_udp_listener(app.state.zmq_socket, settings))

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("[Backend] Frontend WebSocket connected.")
    try:
        while True:
            await asyncio.sleep(1)
            # In a real app, broadcast live telemetry state to HUD here
            await websocket.send_json({"status": "live", "speed": 320, "gear": 8})
    except WebSocketDisconnect:
        print("[Backend] Frontend WebSocket disconnected.")
"""
backend_main_path.parent.mkdir(parents=True, exist_ok=True)
with open(backend_main_path, "w", encoding="utf-8") as f:
    f.write(backend_main_content)

# 3. backend/telemetry/receiver.py
receiver_path = Path("f1-ai-race-engineer/backend/telemetry/receiver.py")
receiver_content = """import asyncio
import socket
import json

async def start_udp_listener(zmq_socket, settings):
    loop = asyncio.get_event_loop()
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((settings["UDP_IP"], settings["UDP_PORT"]))
    sock.setblocking(False)

    print(f"[UDP Receiver] Listening for F1 Telemetry on {settings['UDP_IP']}:{settings['UDP_PORT']}")
    
    try:
        while True:
            # In a real implementation:
            # data, addr = await loop.sock_recv(sock, 2048)
            # parse_f1_packet(data)
            
            # Simulated event: Corner entry detected every 15 seconds
            await asyncio.sleep(15)
            event_data = {
                "event_type": "corner_entry",
                "telemetry": {
                    "speed": 300,
                    "tyre_wear": "15%"
                },
                "context": "Turn 1 approaching, hard braking required."
            }
            
            # Send to AI worker via ZeroMQ
            await zmq_socket.send_json(event_data)
            print(f"[UDP Receiver] Sent event to AI worker: {event_data['event_type']}")
    except asyncio.CancelledError:
        print("[UDP Receiver] Stopped.")
    finally:
        sock.close()
"""
receiver_path.parent.mkdir(parents=True, exist_ok=True)
with open(receiver_path, "w", encoding="utf-8") as f:
    f.write(receiver_content)

with open("f1-ai-race-engineer/backend/telemetry/__init__.py", "w") as f:
    f.write("")

# 4. ai_engineer/main.py
ai_main_path = Path("f1-ai-race-engineer/ai_engineer/main.py")
ai_main_content = """import json
import os
import time
import zmq

# Load Settings
SETTINGS_PATH = os.path.join(os.path.dirname(__file__), '..', 'settings.json')
with open(SETTINGS_PATH) as f:
    settings = json.load(f)

def call_ai_api(event_data):
    api_key = settings.get("AI_API_KEY")
    if not api_key or api_key == "YOUR_API_KEY_HERE":
        print(f"[AI Worker] API Key not set. Mocking AI Response for event: {event_data['event_type']}")
        return "Copy that, heavy braking into Turn 1, watch the front left lockup."
        
    print(f"[AI Worker] Calling AI Provider ({settings['AI_PROVIDER']}) to generate feedback...")
    # REAL IMPLEMENTATION:
    # 1. Use OpenAI LLM to generate response based on `settings["SYSTEM_PROMPT"]` and `event_data`
    # 2. Use TTS API (OpenAI / ElevenLabs) to convert text to speech
    
    # Simulated API delay
    time.sleep(1)
    generated_text = "Okay, brake balance is good. Mind the lockup into Turn 1."
    return generated_text

def play_audio(text):
    print(f"[Speaker] 🔊 Outputting Voice: '{text}'")
    # REAL IMPLEMENTATION: Play the downloaded audio stream via PyAudio or pygame

def main():
    context = zmq.Context()
    socket = context.socket(zmq.SUB)
    socket.connect(settings["ZMQ_ADDRESS"])
    socket.setsockopt_string(zmq.SUBSCRIBE, "")

    print(f"[AI Worker] Listening for telemetry events on {settings['ZMQ_ADDRESS']}...")
    
    while True:
        try:
            # Wait for event from backend
            message = socket.recv_json()
            print(f"\\n[AI Worker] Received Event: {message['event_type']}")
            
            # Generate AI text/audio
            text_response = call_ai_api(message)
            
            # Play through speaker
            play_audio(text_response)
            
        except KeyboardInterrupt:
            print("[AI Worker] Shutting down.")
            break

if __name__ == "__main__":
    main()
"""
ai_main_path.parent.mkdir(parents=True, exist_ok=True)
with open(ai_main_path, "w", encoding="utf-8") as f:
    f.write(ai_main_content)

# 5. requirements.txt
req_path = Path("f1-ai-race-engineer/requirements.txt")
with open(req_path, "w", encoding="utf-8") as f:
    f.write("fastapi\\nuvicorn\\npyzmq\\nwebsockets\\n")

print("Backend files generated.")
