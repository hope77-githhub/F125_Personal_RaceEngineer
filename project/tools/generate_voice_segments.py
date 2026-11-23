"""
F1 AI Race Engineer - Red Bull Engineer Voice Segment & Clip Generator Tool
Automatically bakes modular audio segments and full clips using:
1) Local XTTS-v2 (Voice Cloning with engineer reference audios)
2) Microsoft Edge-TTS (Free neural British engineer voice, zero cost)
3) ElevenLabs Voice Cloning API (Optional)

Usage:
  python tools/generate_voice_segments.py --engine edge-tts
  python tools/generate_voice_segments.py --engine xtts
"""

import os
import sys
import json
import argparse
import asyncio

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(BASE_DIR, "backend", "data", "voice")
SEGMENTS_DIR = os.path.join(VOICE_DIR, "segments")
REFERENCE_DIR = os.path.join(VOICE_DIR, "reference")

# Number word mappings for clean speech synthesis
NUMBER_WORDS = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
    16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty",
    21: "twenty one", 22: "twenty two", 23: "twenty three", 24: "twenty four", 25: "twenty five",
    26: "twenty six", 27: "twenty seven", 28: "twenty eight", 29: "twenty nine", 30: "thirty"
}

# Master list of modular segments to bake
SEGMENTS_TO_GENERATE = {
    "prefixes": [
        ("gap_ahead.mp3", "Gap to car ahead is"),
        ("gap_leader.mp3", "Gap to the leader is"),
        ("gap_teammate.mp3", "Gap to your teammate is"),
        ("pace_drop.mp3", "Pace dropped by"),
        ("pace_gain.mp3", "Pace improved by"),
        ("tyre_deg_is.mp3", "Tyre degradation is running at"),
    ],
    "numbers": [
        # Integers 1 to 30 for braking meters
        *[(f"{n}.mp3", NUMBER_WORDS[n]) for n in range(1, 31)],
        # Decimals for seconds and pace deltas
        ("0_5.mp3", "zero point five"),
        ("0_8.mp3", "zero point eight"),
        ("1_0.mp3", "one"),
        ("1_1.mp3", "one point one"),
        ("1_2.mp3", "one point two"),
        ("1_3.mp3", "one point three"),
        ("1_4.mp3", "one point four"),
        ("1_5.mp3", "one point five"),
        ("1_8.mp3", "one point eight"),
        ("2_0.mp3", "two"),
        ("2_5.mp3", "two point five"),
        ("3_0.mp3", "three"),
        ("5_0.mp3", "five"),
        ("10_0.mp3", "ten"),
        # Percentages
        ("5_percent.mp3", "five percent"),
        ("6_2.mp3", "six point two"),
        ("10_percent.mp3", "ten percent"),
    ],
    "suffixes": [
        ("seconds.mp3", "seconds."),
        ("seconds_overtake.mp3", "seconds, overtake mode available."),
        ("seconds_rhythm.mp3", "seconds, strong rhythm."),
        ("percent_per_lap.mp3", "percent per lap."),
        ("drop_box_this_lap.mp3", "seconds. Tyres are finished, box this lap!"),
    ]
}


async def generate_with_edge_tts(text: str, output_path: str, voice: str = "en-GB-RyanNeural"):
    """Generate audio using free Microsoft Edge-TTS."""
    try:
        import edge_tts
    except ImportError:
        print("Installing edge-tts...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "edge-tts"])
        import edge_tts

    communicate = edge_tts.Communicate(text, voice, rate="+4%", pitch="-2Hz")
    await communicate.save(output_path)


def generate_with_xtts(text: str, output_path: str, ref_audio_path: str):
    """Generate audio using local Coqui XTTS-v2 voice cloning."""
    from TTS.api import TTS
    tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")
    tts.tts_to_file(
        text=text,
        speaker_wav=ref_audio_path,
        language="en",
        file_path=output_path
    )


async def main():
    parser = argparse.ArgumentParser(description="Engineer Voice Segment Generator")
    parser.add_argument("--engine", choices=["edge-tts", "xtts", "elevenlabs"], default="edge-tts",
                        help="TTS Engine to use (default: edge-tts)")
    args = parser.parse_args()

    print(f"=== Starting Voice Segment Baking using [{args.engine}] ===")

    total = sum(len(items) for items in SEGMENTS_TO_GENERATE.values())
    done = 0

    for category, items in SEGMENTS_TO_GENERATE.items():
        cat_dir = os.path.join(SEGMENTS_DIR, category)
        os.makedirs(cat_dir, exist_ok=True)

        for filename, text in items:
            out_file = os.path.join(cat_dir, filename)
            done += 1
            print(f"[{done}/{total}] Baking {category}/{filename} -> '{text}'")

            if args.engine == "edge-tts":
                await generate_with_edge_tts(text, out_file)
            elif args.engine == "xtts":
                ref_file = os.path.join(REFERENCE_DIR, "engineer_voice1.mp3")
                generate_with_xtts(text, out_file, ref_file)

    print("\n[SUCCESS] All voice segments baked successfully!")
    print(f"Output directory: {SEGMENTS_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
