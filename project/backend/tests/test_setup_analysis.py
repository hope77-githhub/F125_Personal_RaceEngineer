"""Practice setup analysis (state_mgmt/setup_analysis.py) on synthetic laps: our lap vs the fastest car."""
import os
import sys
from types import SimpleNamespace

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from state_mgmt import setup_analysis as sa  # noqa: E402

# corner map: (turn, entry, apex, exit) in metres on a 3000 m lap
CORNERS = [{"turn": t, "nom_entry_dist": e, "nom_apex_dist": a, "nom_exit_dist": x}
           for t, e, a, x in [(1, 300, 380, 460), (2, 800, 860, 920), (3, 1300, 1360, 1420),
                              (4, 1800, 1850, 1900), (5, 2300, 2350, 2400), (6, 2700, 2760, 2820)]]
# reference apex speeds: two slow, two medium, two fast corners
REF_APEX = {1: 90, 2: 100, 3: 150, 4: 170, 5: 230, 6: 250}
SETUP = {"m_frontWing": 30, "m_rearWing": 28, "m_onThrottle": 60, "m_frontAntiRollBar": 10, "m_rearAntiRollBar": 8,
         "m_frontLeftTyrePressure": 25.0, "m_frontRightTyrePressure": 25.0,
         "m_rearLeftTyrePressure": 23.0, "m_rearRightTyrePressure": 23.0}


def lap(vmax, apex_delta=None, exit_delta=None, brake_shift=0.0):
    """Telemetry every 10 m: vmax on the straights, a V down to the apex speed in each corner."""
    apex_delta, exit_delta = apex_delta or {}, exit_delta or {}
    pts = []
    for d in range(0, 3000, 10):
        speed, brake = vmax, 0
        for c in CORNERS:
            e, a, x, t = c["nom_entry_dist"], c["nom_apex_dist"], c["nom_exit_dist"], c["turn"]
            apex = REF_APEX[t] + apex_delta.get(t, 0)
            out = REF_APEX[t] + 40 + exit_delta.get(t, 0)
            if e - 60 + brake_shift <= d < e:
                brake = 80
            if e <= d <= a:
                speed = vmax - (vmax - apex) * (d - e) / (a - e)
            elif a < d <= x:
                speed = apex + (out - apex) * (d - a) / (x - a)
        pts.append({"distance_m": float(d), "speed": round(speed), "brake": brake})
    return {"time_ms": 80000, "telemetry_points": pts, "lap": 3}


def tyres(front=95.0, rear=95.0, fr=1.0, rr=1.0):
    return {"front_t": front, "rear_t": rear, "all_t": (front + rear) / 2, "front_rate": fr, "rear_rate": rr,
            "surf": [rear, rear, front, front], "max_wear": 10.0, "worst_rate": max(fr, rr), "laps": 3}


def area(res, name):
    return next(i for i in res["items"] if i["area"] == name)


def changes(res):
    return {c["field"]: (c["current"], c["suggested"]) for c in res["changes"]}


def test_faster_on_straights_slower_in_fast_corners_means_more_wing():
    you = lap(320, apex_delta={3: -6, 4: -6, 5: -8, 6: -8})
    res = sa.analyze(you, lap(312), tyres(), SETUP, CORNERS)
    assert area(res, "aero")["status"] == "change"
    assert changes(res)["m_frontWing"] == (30, 32) and changes(res)["m_rearWing"] == (28, 30)
    assert res["metrics"]["vmax"][2] == 8
    assert res["metrics"]["classes"]["fast"]["n"] == 2 and res["metrics"]["classes"]["slow"]["n"] == 2


def test_slower_on_straights_same_in_corners_means_less_wing():
    res = sa.analyze(lap(305), lap(313), tyres(), SETUP, CORNERS)
    assert changes(res)["m_frontWing"] == (30, 28) and changes(res)["m_rearWing"] == (28, 26)


def test_slower_everywhere_is_not_a_wing_problem():
    you = lap(305, apex_delta={t: -6 for t in REF_APEX})
    res = sa.analyze(you, lap(313), tyres(), SETUP, CORNERS)
    assert area(res, "aero")["status"] == "ok" and "m_frontWing" not in changes(res)


def test_hot_tyres_lower_all_pressures():
    res = sa.analyze(lap(312), lap(312), tyres(front=110, rear=108), SETUP, CORNERS)
    c = changes(res)
    assert c["m_frontLeftTyrePressure"] == (25.0, 24.6) and c["m_rearRightTyrePressure"] == (23.0, 22.6)
    assert area(res, "tyres")["status"] == "change"


def test_understeer_from_hot_fronts_and_apex_loss():
    you = lap(312, apex_delta={3: -5, 4: -5})          # medium-corner apex loss, exit fine
    res = sa.analyze(you, lap(312), tyres(front=102, rear=95), SETUP, CORNERS)
    assert area(res, "balance")["status"] == "change" and "understeer" in area(res, "balance")["title"]["en"]
    assert changes(res)["m_frontWing"] == (30, 32) and changes(res)["m_frontAntiRollBar"] == (10, 8)


def test_slow_corner_traction_opens_the_differential():
    you = lap(312, exit_delta={1: -7, 2: -7})
    res = sa.analyze(you, lap(312), tyres(rear=101, front=95), SETUP, CORNERS)
    assert area(res, "traction")["status"] == "change"
    assert changes(res)["m_onThrottle"] == (60, 55)


def test_braking_early_is_a_driving_note():
    res = sa.analyze(lap(312, brake_shift=-20), lap(312), tyres(), SETUP, CORNERS)
    note = area(res, "driving")
    assert note["status"] == "note" and "20 m" in note["evidence"]["en"]
    assert not res["changes"]


def test_waits_for_data():
    res = sa.analyze(lap(312), None, None, SETUP, CORNERS)
    assert area(res, "tyres")["status"] == "wait" and area(res, "aero")["status"] == "wait"
    assert res["metrics"] is None and res["changes"] == []


def test_suggestions_stay_inside_the_game_ranges():
    setup = {**SETUP, "m_frontWing": 50, "m_rearWing": 49}
    you = lap(320, apex_delta={3: -6, 4: -6, 5: -8, 6: -8})
    c = changes(sa.analyze(you, lap(312), tyres(), setup, CORNERS))
    assert "m_frontWing" not in c and c["m_rearWing"] == (49, 50)


def test_manager_builds_the_fp_ranking_in_practice_only():
    import logging
    logging.disable(logging.CRITICAL)
    from state_mgmt.manager import StateManager
    m = StateManager(auto_preload=False)
    m.session = SimpleNamespace(m_sessionType=1)         # practice 1
    m.player_car_index = 0
    for idx, vmax in ((0, 320), (1, 312), (2, 300)):
        entry = lap(vmax, apex_delta={3: -6, 4: -6, 5: -8, 6: -8} if idx == 0 else None)
        entry["time_ms"] = {0: 81000, 1: 80000, 2: 82000}[idx]
        entry["corners"] = CORNERS
        m.lap_history[idx] = [entry]
    m._player_setup_dict = lambda: SETUP
    res = m.practice_setup_analysis()
    assert [r["pos"] for r in res["ranking"]] == [1, 2, 3]
    assert res["you"]["pos"] == 2 and res["reference"]["idx"] == 1 and res["you"]["gap"] == 1.0
    assert ("m_frontWing", 30, 32) in [(c["field"], c["current"], c["suggested"]) for c in res["changes"]]
    assert m.practice_setup_analysis() is res            # cached until a lap changes
    m.session.m_sessionType = 15
    assert m.practice_setup_analysis() is None           # race: no practice analysis
