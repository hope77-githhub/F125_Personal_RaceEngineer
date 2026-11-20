"""
Bake all 39 full clips defined in backend/data/voice/manifest.json into backend/data/voice/clips/
"""
import os
import json
import asyncio
import edge_tts

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_PATH = os.path.join(BASE_DIR, "backend", "data", "voice", "manifest.json")
CLIPS_DIR = os.path.join(BASE_DIR, "backend", "data", "voice", "clips")
os.makedirs(CLIPS_DIR, exist_ok=True)

VOICE = "en-GB-RyanNeural"

async def bake_clip(filename, text):
    out_path = os.path.join(CLIPS_DIR, filename)
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        print(f"[EXISTS] {filename}")
        return
    print(f"[BAKING] {filename} -> '{text}'")
    tts = edge_tts.Communicate(text, VOICE, rate="+3%", pitch="+0Hz")
    await tts.save(out_path)
    print(f"[DONE] {filename} ({os.path.getsize(out_path)} bytes)")

async def main():
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    
    clips = manifest.get("clips", [])
    print(f"Total clips to check/bake: {len(clips)}")
    
    for clip in clips:
        fn = clip.get("filename")
        txt = clip.get("text")
        if fn and txt:
            await bake_clip(fn, txt)

    print("[SUCCESS] All manifest clips baked successfully!")

if __name__ == "__main__":
    asyncio.run(main())
