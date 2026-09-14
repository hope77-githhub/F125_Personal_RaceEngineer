import json
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
            print(f"\n[AI Worker] Received Event: {message['event_type']}")
            
            # Generate AI text/audio
            text_response = call_ai_api(message)
            
            # Play through speaker
            play_audio(text_response)
            
        except KeyboardInterrupt:
            print("[AI Worker] Shutting down.")
            break

if __name__ == "__main__":
    main()
