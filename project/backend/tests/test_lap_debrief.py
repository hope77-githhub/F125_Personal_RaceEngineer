"""Lap debrief radio (state_mgmt/lap_debrief.py + engineer_brain.lap_debrief) and the practice timesheet order."""
import logging
import os
import sys
from types import SimpleNamespace as NS

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
logging.disable(logging.CRITICAL)
from state_mgmt import engineer_brain as b  # noqa: E402
from state_mgmt import lap_debrief as ld  # noqa: E402

# circuit corner list as in circuit_data/*_corners.json, on a 3000 m lap; turn 4 is a flat-out kink
CORNERS = [{"turn": t, "name": f"T{t}", "type": ty, "entry_dist": e, "apex_dist": a, "exit_dist": x}
           for t, ty, e, a, x in [(1, "corner", 300, 380, 460), (2, "corner", 800, 860, 920),
                                  (3, "corner", 1300, 1360, 1420), (4, "kink", 1600, 1650, 1700),
                                  (5, "corner", 2300, 2350, 2400)]]
APEX = {1: 90, 2: 120, 3: 150, 4: 280, 5: 200}


def lap(n, time_ms, apex_delta=None, brake_shift=None, vmax=300, pit=False):
    """Telemetry every 10 m: vmax on the straights, braking 60 m before each entry, a V down to the apex."""
    apex_delta, brake_shift = apex_delta or {}, brake_shift or {}
    pts = []
    for d in range(0, 3000, 10):
        speed, brake = vmax, 0
        for c in CORNERS:
            t, e, a, x = c["turn"], c["entry_dist"], c["apex_dist"], c["exit_dist"]
            apex = APEX[t] + apex_delta.get(t, 0)
            out = APEX[t] + 40
            if c["type"] != "kink" and e - 60 + brake_shift.get(t, 0) <= d < e + brake_shift.get(t, 0):
                brake = 80
            if e <= d <= a:
                speed = vmax - (vmax - apex) * (d - e) / (a - e)
            elif a < d <= x:
                speed = apex + (min(vmax, out) - apex) * (d - a) / (x - a)
        pts.append({"distance_m": float(d), "speed": round(speed), "brake": brake})
    return {"lap": n, "time_ms": time_ms, "telemetry_points": pts, "source": "live",
            "flags": {"sc": False, "pit": pit}}


# ----------------------------------------------------------------- analysis
def test_names_the_turn_that_lost_the_most_time_and_why():
    ref = lap(1, 80000)
    you = lap(2, 80600, apex_delta={3: -25}, brake_shift={3: 20})       # late on the brakes, slow apex at T3
    res = ld.analyze(you, ref, CORNERS, (1000, 2000))
    assert res["lap_delta"] == 0.6
    assert res["worst"]["turn"] == 3 and res["worst"]["cause"] == "late"
    assert res["sectors"][1] == max(res["sectors"])                        # T3 is in sector 2
    assert all(r["turn"] != 4 for r in res["corners"])                     # the kink belongs to the corner before


def test_causes_early_braking_and_slow_apex():
    ref = lap(1, 80000)
    assert ld.analyze(lap(2, 80300, apex_delta={2: -15}, brake_shift={2: -25}), ref, CORNERS)["worst"]["cause"] == "early"
    assert ld.analyze(lap(2, 80300, apex_delta={5: -20}), ref, CORNERS)["worst"]["cause"] == "apex"


def test_no_named_turn_when_the_laps_are_the_same():
    assert ld.analyze(lap(2, 80000), lap(1, 80000), CORNERS)["worst"] is None
    assert ld.analyze({"time_ms": 1, "telemetry_points": []}, lap(1, 80000), CORNERS) is None


# ----------------------------------------------------------------- what the engineer says, by session
def _analysis(delta, turn=3, loss=0.4, cause="late", sectors=(0.05, 0.4, 0.05)):
    worst = {"turn": turn, "name": "T", "loss": loss, "cause": cause}
    return {"lap_delta": delta, "sectors": list(sectors), "corners": [worst], "worst": worst}


def test_practice_talks_only_about_big_losses_and_new_bests():
    r = b.lap_debrief("practice", _analysis(0.6), False)
    assert r["keys"] == ["lap_off_best_6", "loss_turn_3", "loss_cause_late"] and r["turn"] == 3
    assert r["text"] == ("That lap was zero point six seconds off your best. We lost the most time at turn three on that lap. "
                         "You were late on the brakes there.")
    assert b.lap_debrief("practice", _analysis(0.2, sectors=(0.1, 0.1, 0.0)), False) is None
    assert b.lap_debrief("practice", _analysis(-0.3), True, rank=3)["keys"] == ["lap_best", "practice_rank_3"]


def test_qualifying_debriefs_every_lap_with_sector_turn_and_focus():
    r = b.lap_debrief("qualifying", _analysis(0.35), False)
    assert r["keys"] == ["lap_off_best_4", "loss_sector_2", "loss_turn_3", "loss_cause_late"]
    again = b.lap_debrief("qualifying", _analysis(0.25), False, prev_turn=3)
    assert again["keys"] == ["lap_off_best_2", "loss_sector_2", "quali_focus_3", "loss_cause_late"]
    assert b.lap_debrief("qualifying", _analysis(0.05), False)["keys"] == ["lap_matched"]
    assert b.lap_debrief("qualifying", _analysis(-0.1), True)["keys"] == ["lap_best"]


def test_race_names_only_a_clear_turn():
    assert b.lap_debrief("race", _analysis(0.6, loss=0.3, cause="exit"), False)["keys"] == ["loss_turn_3", "loss_cause_exit"]
    assert b.lap_debrief("race", _analysis(0.6, loss=0.1), False) is None


def test_every_debrief_line_is_in_the_voice_list_and_no_braking_metres_are_left():
    lines = b.VOICE_LINES()
    for key in b.DEBRIEF_TEXT:
        assert f"debrief/{key}.mp3" in lines and b.line_url(key) == f"/voice/debrief/{key}.mp3"
    assert not any("brake_early" in k or "brake_late" in k or "qa_turn_" in k for k in lines)
    assert b.stint_projection([12.0, 12.0, 9.0, 9.0], 4)["keys"] == ["race_tyre_rate_3_0", "practice_stint_15"]


# ----------------------------------------------------------------- StateManager
def manager(session_type, laps, dist=300.0):
    from state_mgmt.manager import StateManager
    m = StateManager(auto_preload=False)
    m.player_car_index = 0
    m.session = NS(m_sessionType=session_type, m_sector2LapDistanceStart=1000.0, m_sector3LapDistanceStart=2000.0)
    lapd = NS(m_currentLapNum=len(laps) + 1, m_lapDistance=dist, m_carPosition=1, m_currentLapTimeInMS=5000)
    m.lap_data = NS(m_lapData=[lapd] + [NS(m_currentLapNum=1, m_carPosition=0)] * 21)
    m.lap_history[0] = laps
    m._debrief_corners = lambda: CORNERS
    m._player_setup_dict = lambda: {}
    m._triggered_voice_conditions.add("session_start")
    return m, lapd


def test_qualifying_debrief_after_the_lap_then_focus_on_the_same_turn():
    laps = [lap(1, 80000, pit=True), lap(2, 80000), lap(3, 80500, apex_delta={3: -25}, brake_shift={3: 20})]
    m, lapd = manager(5, laps)                                          # Q1, 300 m into lap 4
    ev = m.evaluate_voice_triggers()
    assert ev["type"] == "lap_debrief" and ev["keys"][0] == "lap_off_best_5"
    assert "loss_turn_3" in ev["keys"] and "loss_cause_late" in ev["keys"]
    m._last_voice_trigger_time = 0
    assert m.evaluate_voice_triggers() is ev                            # once per lap
    m.lap_history[0].append(lap(4, 80400, apex_delta={3: -25}, brake_shift={3: 20}))
    lapd.m_currentLapNum = 5
    m._last_voice_trigger_time = 0
    assert "quali_focus_3" in m.evaluate_voice_triggers()["keys"]


def test_no_debrief_outside_the_window_or_for_an_out_lap():
    m, _ = manager(5, [lap(1, 80000), lap(2, 80500, apex_delta={3: -25})], dist=2500.0)
    ev = m.evaluate_voice_triggers()
    assert not ev or ev.get("type") != "lap_debrief"
    m, _ = manager(5, [lap(1, 80000), lap(2, 80500, pit=True)])
    ev = m.evaluate_voice_triggers()
    assert not ev or ev.get("type") != "lap_debrief"


def test_practice_timesheet_follows_the_game_not_the_recorded_laps():
    from state_mgmt.manager import StateManager
    m = StateManager(auto_preload=False)
    m.player_car_index = 0
    m.session = NS(m_sessionType=1)
    # recorded: car 1 has a fast lap 2 that the game deleted (track limits); its official best is lap 1
    m.lap_history[0] = [lap(1, 81000), lap(2, 80500)]
    m.lap_history[1] = [lap(1, 81200), lap(2, 79000)]
    m.lap_history[2] = [lap(1, 80800)]
    hist = lambda best, times: NS(m_bestLapTimeLapNum=best, m_numLaps=len(times),  # noqa: E731
                                  m_lapHistoryData=[NS(m_lapTimeInMS=t) for t in times])
    m.session_history = {0: hist(2, [81000, 80500]), 1: hist(1, [81200, 79000]), 2: hist(1, [80800])}
    pos = {0: 1, 1: 3, 2: 2}
    m.lap_data = NS(m_lapData=[NS(m_carPosition=pos.get(i, 0), m_currentLapNum=3) for i in range(22)])
    res = m.practice_setup_analysis()
    assert [(r["idx"], r["best"]) for r in res["ranking"]] == [(0, "1:20.500"), (2, "1:20.800"), (1, "1:21.200")]
    assert res["you"]["pos"] == 1 and res["reference"]["idx"] == 2
    # another car improving changes the order straight away (no stale cache)
    m.session_history[1] = hist(3, [81200, 79000, 80100])
    pos.update({1: 1, 0: 2, 2: 3})
    m.lap_history[1].append(lap(3, 80100))
    m.lap_data = NS(m_lapData=[NS(m_carPosition=pos.get(i, 0), m_currentLapNum=3) for i in range(22)])
    assert [r["idx"] for r in m.practice_setup_analysis()["ranking"]] == [1, 0, 2]


# ----------------------------------------------------------------- coverage: every track and situation
def steer_lap(n, time_ms):
    """lap() plus steering: right-handers 1, 3, 5, left-hander 2, kink 4 barely steered."""
    out = lap(n, time_ms)
    for p in out["telemetry_points"]:
        p["steer"] = 0.0
        for c in CORNERS:
            if c["entry_dist"] <= p["distance_m"] <= c["exit_dist"]:
                p["steer"] = 0.05 if c["type"] == "kink" else (-0.4 if c["turn"] == 2 else 0.4)
    return out


def test_learns_corners_from_steering_for_tracks_without_corner_data():
    learned = ld.learn_corners(steer_lap(1, 80000)["telemetry_points"])
    assert [c["direction"] for c in learned] == ["Right", "Left", "Right", "Right"]
    assert [c["turn"] for c in learned] == [1, 2, 3, 4]
    assert 300 <= learned[0]["entry_dist"] and learned[0]["exit_dist"] <= 470


def test_manager_uses_and_shares_a_learned_turn_map(tmp_path):
    laps = [steer_lap(1, 80000), steer_lap(2, 80500)]
    laps[1]["telemetry_points"] = lap(2, 80500, apex_delta={3: -25}, brake_shift={3: 20})["telemetry_points"]
    m, _ = manager(5, laps)
    del m._debrief_corners                                   # use the real lookup
    m.OVERLAY_TURN_DIR = str(tmp_path)
    m.circuit_data_manager.has_corner_data = lambda tid: False
    m.current_track_id = 42                                  # Madrid: no official corner data
    corners = m._debrief_corners()
    assert len(corners) == 4 and (tmp_path / "42.json").exists()   # written for the overlay's TURN box too
    ev = m.evaluate_voice_triggers()
    assert ev["type"] == "lap_debrief" and "loss_turn_3" in ev["keys"]


def test_deleted_laps_are_called_in_qualifying_and_never_a_reference():
    bad = lap(3, 79000)
    bad["flags"]["invalid"] = True
    m, _ = manager(5, [lap(1, 80000, pit=True), lap(2, 80000), bad])
    assert m.evaluate_voice_triggers()["keys"] == ["lap_invalid"]
    slow_bad = lap(3, 80900)
    slow_bad["flags"]["invalid"] = True
    m, _ = manager(1, [lap(1, 80000), lap(2, 80600), slow_bad])   # practice: a deleted non-best lap is not worth a call
    ev = m.evaluate_voice_triggers()
    assert not ev or ev.get("type") != "lap_debrief"
    m, _ = manager(1, [lap(1, 80000), lap(2, 80600), bad])        # ... but a deleted best lap is
    assert m.evaluate_voice_triggers()["keys"] == ["lap_invalid"]
    ev = None
    assert not ev or ev.get("type") != "lap_debrief"
    bad2 = lap(2, 79000)
    bad2["flags"]["invalid"] = True
    m, _ = manager(5, [lap(1, 80000), bad2, lap(3, 80300, apex_delta={3: -15})])
    assert m.evaluate_voice_triggers()["keys"][0] == "lap_off_best_3"   # compared with lap 1, not the deleted one


def test_first_push_lap_gives_the_position_and_gap_to_the_top():
    m, _ = manager(5, [lap(1, 80000, pit=True), lap(2, 81200)])
    hist = lambda t: NS(m_bestLapTimeLapNum=1, m_numLaps=1, m_lapHistoryData=[NS(m_lapTimeInMS=t)])  # noqa: E731
    m.session_history = {0: hist(81200), 1: hist(80800), 2: hist(80000)}
    m.lap_data.m_lapData = [NS(m_currentLapNum=3, m_lapDistance=300.0, m_carPosition=3, m_currentLapTimeInMS=5000),
                            NS(m_carPosition=2), NS(m_carPosition=1)] + [NS(m_carPosition=0)] * 19
    assert m.evaluate_voice_triggers()["keys"] == ["practice_rank_3", "gap_top_12"]


def test_time_trial_debriefs_like_qualifying():
    m, _ = manager(18, [lap(1, 80000), lap(2, 80400, apex_delta={3: -25}, brake_shift={3: 20})])
    ev = m.evaluate_voice_triggers()
    assert ev["type"] == "lap_debrief" and ev["keys"][0] == "lap_off_best_4"


def test_big_values_stay_true():
    assert b._off_best_key(5.4) == "lap_off_best_50" and b._off_best_key(11) == "lap_off_best_80"
    assert b.stint_projection([3.0, 0, 0, 0], 6)["keys"][-1] == "practice_stint_long"       # 0.5 %/lap
    assert b.stint_projection([60.0, 0, 0, 0], 5)["keys"] == ["race_tyre_rate_10_0", "practice_stint_short"]
    assert b.tyre_report([34.0, 0, 0, 0], 4, 5)["keys"][0] == "race_tyre_rate_8_0"           # 8.5 %/lap


def test_wet_tyres_and_incidents():
    from state_mgmt.manager import StateManager
    m = StateManager(auto_preload=False)
    m.player_car_index = 0
    m.session = NS(m_sessionType=15, m_sector2LapDistanceStart=1000.0, m_sector3LapDistanceStart=2000.0,
                   m_weather=3, m_trackTemperature=20, m_airTemperature=15, m_numWeatherForecastSamples=0,
                   m_weatherForecastSamples=[], m_safetyCarStatus=0)
    m.lap_data = NS(m_lapData=[NS(m_currentLapNum=4, m_lapDistance=2500.0, m_currentLapTimeInMS=40000,
                                  m_carPosition=3, m_deltaToCarInFrontMSPart=0)] + [NS(m_carPosition=0)] * 21)
    m.car_status = NS(m_carStatusData=[NS(m_visualTyreCompound=7, m_tyresAgeLaps=3)] * 22)     # intermediates
    m.car_damage = NS(m_carDamageData=[NS(m_tyresWear=[10.0, 10.0, 10.0, 10.0])] * 22)
    laps = [lap(1, 90000), lap(2, 90000), lap(3, 95000)]                                       # lap 3: a spin
    for h, w in zip(laps, (0.0, 3.0, 9.0)):
        h["tyres_wear"] = [w] * 4
    m.lap_history[0] = laps
    m._player_setup_dict = lambda: {}
    m._triggered_voice_conditions.update({"session_start", "race_brief"})
    ev = m.evaluate_voice_triggers()
    assert ev["id"] == "tyre_inter_deg_5pct"
    m._last_voice_trigger_time = 0
    ev = m.evaluate_voice_triggers()
    assert not ev or "box" not in ev.get("id", "")                                             # 5 s slower: no box call
