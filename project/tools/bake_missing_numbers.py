import os
import sys
import asyncio
import edge_tts

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NUM_DIR = os.path.join(BASE_DIR, "backend", "data", "voice", "segments", "numbers")
os.makedirs(NUM_DIR, exist_ok=True)

# Missing decimal and integer words
DECIMALS_TO_GENERATE = [
    ("0_1.mp3", "zero point one"),
    ("0_2.mp3", "zero point two"),
    ("0_3.mp3", "zero point three"),
    ("0_4.mp3", "zero point four"),
    ("0_5.mp3", "zero point five"),
    ("0_6.mp3", "zero point six"),
    ("0_7.mp3", "zero point seven"),
    ("0_8.mp3", "zero point eight"),
    ("0_9.mp3", "zero point nine"),
    ("0.mp3", "zero"),
    ("1.mp3", "one"),
    ("2.mp3", "two"),
    ("3.mp3", "three"),
    ("4.mp3", "four"),
    ("5.mp3", "five"),
    ("6.mp3", "six"),
    ("7.mp3", "seven"),
    ("8.mp3", "eight"),
    ("9.mp3", "nine"),
    ("10.mp3", "ten"),
    ("11.mp3", "eleven"),
    ("12.mp3", "twelve"),
    ("13.mp3", "thirteen"),
    ("14.mp3", "fourteen"),
    ("15.mp3", "fifteen"),
    ("16.mp3", "sixteen"),
    ("17.mp3", "seventeen"),
    ("18.mp3", "eighteen"),
    ("19.mp3", "nineteen"),
    ("20.mp3", "twenty"),
    ("25.mp3", "twenty five"),
    ("30.mp3", "thirty"),
    ("35.mp3", "thirty five"),
    ("40.mp3", "forty"),
    # Common intervals
    ("1_0.mp3", "one point zero"),
    ("1_1.mp3", "one point one"),
    ("1_2.mp3", "one point two"),
    ("1_3.mp3", "one point three"),
    ("1_4.mp3", "one point four"),
    ("1_5.mp3", "one point five"),
    ("1_6.mp3", "one point six"),
    ("1_7.mp3", "one point seven"),
    ("1_8.mp3", "one point eight"),
    ("1_9.mp3", "one point nine"),
    ("2_0.mp3", "two point zero"),
    ("2_5.mp3", "two point five"),
    ("3_0.mp3", "three point zero"),
    ("4_0.mp3", "four point zero"),
    ("5_0.mp3", "five point zero"),
    ("10_0.mp3", "ten point zero"),
]

async def bake_numbers():
    print(f"Baking {len(DECIMALS_TO_GENERATE)} numbers...")
    for fname, text in DECIMALS_TO_GENERATE:
        out_path = os.path.join(NUM_DIR, fname)
        if not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            print(f"Generating {fname} -> '{text}'")
            comm = edge_tts.Communicate(text, "en-GB-RyanNeural", rate="+4%", pitch="-2Hz")
            await comm.save(out_path)
        else:
            print(f"Already exists: {fname}")
    print("[SUCCESS] All numbers baked!")

if __name__ == "__main__":
    asyncio.run(bake_numbers())
