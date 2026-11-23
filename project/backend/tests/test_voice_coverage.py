"""Every radio line the engineer can reach, on every track and for every value, has a baked voice file.

Walks the value ranges the radio can produce (lap and sector losses, gaps to the top, timesheet positions, tyre
wear rates, stint lengths, turn numbers of all official corner maps, track temperatures ...) and checks that each
resulting line key has a sentence and an mp3 under backend/data/voice. Run after changing any spoken line.
"""
import glob
import json
import os
import sys

BACKEND = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND)
from state_mgmt import engineer_brain as b  # noqa: E402

VOICE = os.path.join(BACKEND, "data", "voice")


def baked(key):
    return os.path.exists(os.path.join(VOICE, b.line_url(key).replace("/voice/", "", 1)))


def assert_covered(keys):
    keys = set(keys)
    no_text = sorted(k for k in keys if b.line_text(k) is None)
    no_file = sorted(k for k in keys if not baked(k))
    assert not no_text, f"no sentence for {no_text[:10]}"
    assert not no_file, f"no voice file for {no_file[:10]} ({len(no_file)} in all)"


def steps(lo, hi, step):
    n = int(round((hi - lo) / step))
    return [round(lo + i * step, 3) for i in range(n + 1)]


def test_every_official_turn_number_can_be_named():
    turns = set()
    for f in glob.glob(os.path.join(BACKEND, "circuit_data", "*_corners.json")):
        turns |= {c["turn"] for c in json.load(open(f, encoding="utf-8"))["corners"]}
    assert max(turns) <= b.TURN_MAX
    keys = []
    for t in range(1, b.TURN_MAX + 1):
        keys += b._turn_keys({"turn": t, "cause": None}) + b._turn_keys({"turn": t}, "quali_focus")
    for cause in ("late", "early", "apex", "exit"):
        keys += b._turn_keys({"turn": 1, "cause": cause})
    assert_covered(keys)


def test_lap_debrief_lines_for_every_loss_position_and_gap():
    keys = ["lap_best", "lap_matched", "lap_invalid"] + [f"loss_sector_{s}" for s in (1, 2, 3)]
    keys += [b._off_best_key(d) for d in steps(0.05, 12.0, 0.05)]                     # up to well past 107 %
    keys += [f"gap_top_{b._tenths_key(g)}" for g in steps(0.05, 12.0, 0.05)]
    keys += [f"practice_rank_{n}" for n in range(1, 23)]                              # full 22-car grid
    assert_covered(keys)


def test_stint_and_tyre_wear_lines_for_every_rate():
    keys = []
    for age in range(3, 31):
        for worst in steps(0.5, 95.0, 0.5):
            r = b.stint_projection([worst, 0, 0, 0], age)
            keys += r["keys"] if r else []
    for rate in steps(0.25, 15.0, 0.05):
        r = b.tyre_report([rate * 4, 0, 0, 0], 4, 5)
        keys += r["keys"] if r else []
    assert_covered(keys)


def test_race_brief_and_answer_lines():
    keys = []
    for weather in range(6):
        for temp in range(0, 70, 1):
            for rain in (0, 35, 70):
                keys += b.race_brief(weather, temp, temp - 10, rain, {})["keys"]
    keys += list(b.SETUP_TEXT) + list(b.QA_TEXT) + list(b.NUMBERED_TEXT) + list(b.DEBRIEF_TEXT)
    assert_covered(keys)


def test_every_manifest_clip_the_triggers_emit_is_baked():
    clips = json.load(open(os.path.join(VOICE, "manifest.json"), encoding="utf-8"))["clips"]
    missing = [c["filename"] for c in clips if not os.path.exists(os.path.join(VOICE, "clips", c["filename"]))]
    assert not missing, missing
    ids = {c["id"] for c in clips}
    for comp in ("soft", "med", "hard", "inter", "wet"):
        assert {f"tyre_{comp}_deg_5pct", f"tyre_{comp}_deg_10pct"} <= ids
