"""Recording retention (state_mgmt/recordings.py) on lap files in the recorder's own line format."""
import json
import os
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from state_mgmt.recordings import Recordings  # noqa: E402

OLD, NEW, DEMO = "1111111111111111111", "2222222222222222222", "3333333333333333333"


def frame(uid, lap=1, pad=2000):
    hdr = {"m_packetFormat": 2026, "m_gameYear": 25, "m_packetId": 2, "m_sessionUID": int(uid),
           "m_frameIdentifier": 7, "m_playerCarIndex": 0}
    data = {"packet_id_1": {"m_header": {**hdr, "m_packetId": 1}, "m_sessionType": 15, "m_trackId": 17},
            "packet_id_2": {"m_header": hdr, "m_lapData": [{"m_currentLapNum": lap, "m_lapDistance": 12.5}]},
            "packet_id_6": {"m_header": {**hdr, "m_packetId": 6}, "pad": "x" * pad}}
    return data, json.dumps({"timestamp": 1.0, "data": data}, ensure_ascii=False) + "\n"


def setup_circuit(tmp_path, lines):
    folder = tmp_path / "circuit_Austria"
    folder.mkdir()
    with open(folder / "lap1.jsonl", "w", encoding="utf-8") as f:
        f.writelines(lines)
    for name in (f"_parsed_laps_cache_v3_{OLD}.json", f"_parsed_laps_cache_v3_{NEW}.json",
                 f"_parsed_laps_cache_v3_{DEMO}.json", "_parsed_laps_cache_v3.json", "_sessions_index_v1.json"):
        (folder / name).write_text("{}", encoding="utf-8")
    return folder


def uids_in(path):
    with open(path, encoding="utf-8") as f:
        return [str(json.loads(l)["data"]["packet_id_2"]["m_header"]["m_sessionUID"]) for l in f]


def test_new_session_removes_the_earlier_ones(tmp_path):
    folder = setup_circuit(tmp_path, [frame(OLD)[1]] * 30 + [frame(NEW)[1]] * 5)
    rec = Recordings(str(tmp_path))
    rec.note_frame("circuit_Austria", frame(OLD)[0])            # app was recording the old session
    rec.note_frame("circuit_Austria", frame(NEW)[0])            # a new session starts -> background cleanup
    for t in threading.enumerate():
        if t.name == "recordings-purge":
            t.join(10)
    assert uids_in(folder / "lap1.jsonl") == [NEW] * 5
    assert not (folder / f"_parsed_laps_cache_v3_{OLD}.json").exists()
    for kept in (f"_parsed_laps_cache_v3_{NEW}.json", f"_parsed_laps_cache_v3_{DEMO}.json",
                 "_parsed_laps_cache_v3.json", "_sessions_index_v1.json"):
        assert (folder / kept).exists(), kept
    assert OLD not in rec.sessions and NEW in rec.sessions


def test_app_close_removes_all_recordings(tmp_path):
    folder = setup_circuit(tmp_path, [frame(OLD)[1]] * 10 + [frame(NEW)[1]] * 10)
    (folder / "lap2.jsonl").write_text(frame(NEW, lap=2)[1] * 3, encoding="utf-8")
    rec = Recordings(str(tmp_path))
    freed = rec.purge()
    assert not list(folder.glob("lap*.jsonl"))
    assert freed > 0
    assert not (folder / f"_parsed_laps_cache_v3_{OLD}.json").exists()
    assert not (folder / f"_parsed_laps_cache_v3_{NEW}.json").exists()
    assert (folder / f"_parsed_laps_cache_v3_{DEMO}.json").exists()      # not one of the recorded sessions
    assert (folder / "_parsed_laps_cache_v3.json").exists()
    assert rec.status()["total_mb"] == 0


def test_keep_switch_keeps_everything(tmp_path):
    folder = setup_circuit(tmp_path, [frame(OLD)[1]] * 10)
    rec = Recordings(str(tmp_path))
    rec.set_keep(True)
    assert Recordings(str(tmp_path)).keep is True                    # remembered
    assert rec.purge() == 0.0
    rec.note_frame("circuit_Austria", frame(OLD)[0])
    rec.note_frame("circuit_Austria", frame(NEW)[0])
    assert uids_in(folder / "lap1.jsonl") == [OLD] * 10


def test_lines_recorded_during_cleanup_are_kept(tmp_path):
    folder = setup_circuit(tmp_path, [frame(OLD, pad=20000)[1]] * 1500)
    rec = Recordings(str(tmp_path))
    path = str(folder / "lap1.jsonl")
    line = frame(NEW)[1]
    done = threading.Event()

    def recorder():
        for _ in range(300):
            rec.append(path, line)
        done.set()

    rt = threading.Thread(target=recorder)
    rt.start()
    rec.purge(keep_uid=NEW)
    rt.join(10)
    assert done.is_set()
    got = uids_in(path)
    assert got.count(NEW) == 300 and OLD not in got
