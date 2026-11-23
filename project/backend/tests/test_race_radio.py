"""Race radio: setup brief before the start, tyre wear per lap and the tyre strategy call."""
import logging
import os
import sys
from types import SimpleNamespace as NS

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
logging.disable(logging.CRITICAL)
from state_mgmt import engineer_brain as b  # noqa: E402

SETUP = {"m_frontWing": 30, "m_rearWing": 28, "m_frontLeftTyrePressure": 25.0, "m_frontRightTyrePressure": 25.0,
         "m_rearLeftTyrePressure": 23.0, "m_rearRightTyrePressure": 23.0}


def test_brief_hot_dry_track():
    r = b.race_brief(0, 46, 32, 0, SETUP)
    assert r["keys"] == ["race_track_temp_46", "race_setup_hot"]
    assert "FL psi 25 → 24.6" in r["details"] and r["text"].startswith("Track temperature is forty six degrees.")


def test_brief_cool_with_rain_risk_and_expected():
    assert b.race_brief(1, 22, 18, 40, SETUP)["keys"] == ["race_track_temp_22", "race_setup_cool", "race_setup_rain_risk"]
    r = b.race_brief(2, 30, 24, 70, SETUP)
    assert r["keys"] == ["race_track_temp_30", "race_setup_normal", "race_setup_rain_expected"]
    assert "Front wing 30 → 35" in r["details"]


def test_brief_wet_track():
    assert b.race_brief(3, 20, 16, 90, SETUP)["keys"] == ["race_track_temp_20", "race_setup_wet_inters"]
    assert b.race_brief(5, 70, 16, 90, SETUP)["keys"] == ["race_track_temp_60", "race_setup_wet_full"]   # clamped


def test_tyre_report_rate_and_no_report_on_a_new_set():
    r = b.tyre_report([10.0, 11.0, 8.0, 8.0], 5, 6)
    assert r["keys"] == ["race_tyre_rate_2_2"] and r["strategy"] is None
    assert r["text"] == "Tyre wear per lap is two point two percent on this set."
    assert b.tyre_report([1.0, 1.0, 1.0, 1.0], 0, 2) is None
    assert b.tyre_report([0.5, 0.5, 0.5, 0.5], 4, 5) is None        # barely wearing


def test_strategy_manage_when_slightly_short_of_the_window():
    # 20% after 8 laps = 2.5%/lap -> 45% in 10 laps = lap 19; window at lap 21 -> 2 laps short
    r = b.tyre_report([20.0, 19.0, 14.0, 14.0], 8, 9, pit_ideal_lap=21, pit_latest_lap=25)
    assert r["strategy"] == "manage"
    assert r["keys"] == ["race_tyre_rate_2_5", "race_strategy_manage", "race_strategy_rears"]


def test_strategy_box_early_when_far_short():
    r = b.tyre_report([14.0, 14.0, 24.0, 22.0], 6, 7, pit_ideal_lap=25)   # 4%/lap -> 45% around lap 12
    assert r["strategy"] == "box_early"
    assert r["keys"] == ["race_tyre_rate_4_0", "race_strategy_box_early", "qa_box_in_5", "race_strategy_fronts"]


def test_no_strategy_when_the_tyres_reach_the_window_or_it_has_passed():
    assert b.tyre_report([10.0, 10.0, 9.0, 9.0], 10, 11, pit_ideal_lap=20)["strategy"] is None
    assert b.tyre_report([30.0, 30.0, 25.0, 25.0], 10, 22, pit_ideal_lap=20)["strategy"] is None
    assert b.tyre_report([30.0, 30.0, 25.0, 25.0], 10, 12, pit_ideal_lap=0)["strategy"] is None


def test_every_race_line_is_in_the_voice_list():
    lines = b.VOICE_LINES()
    for key in list(b.RACE_TEXT):
        assert f"race/{key}.mp3" in lines and b.line_url(key) == f"/voice/race/{key}.mp3"


# ----------------------------------------------------------------- StateManager radio timing
def manager(session_type=15):
    from state_mgmt.manager import StateManager
    m = StateManager(auto_preload=False)
    m.player_car_index = 0
    lapd = NS(m_currentLapNum=1, m_currentLapTimeInMS=0, m_lapDistance=-50.0, m_carPosition=5,
              m_deltaToCarInFrontMSPart=0, m_deltaToCarInFrontMinutesPart=0)
    m.lap_data = NS(m_lapData=[lapd] + [NS(m_currentLapNum=1, m_carPosition=0)] * 21)
    m.session = NS(m_sessionType=session_type, m_weather=0, m_trackTemperature=44, m_airTemperature=30, m_numWeatherForecastSamples=0,
                   m_weatherForecastSamples=[], m_pitStopWindowIdealLap=21, m_pitStopWindowLatestLap=25,
                   m_totalLaps=50, m_trackLength=4000)
    m.car_status = NS(m_carStatusData=[NS(m_tyresAgeLaps=0, m_visualTyreCompound=17)] * 22)
    m.car_damage = NS(m_carDamageData=[NS(m_tyresWear=[0.0, 0.0, 0.0, 0.0])] * 22)
    m._player_setup_dict = lambda: SETUP
    m._triggered_voice_conditions.add("session_start")       # radio check already done
    return m, lapd


def test_race_brief_once_before_the_start():
    m, _ = manager()
    ev = m.evaluate_voice_triggers()
    assert ev["type"] == "race_brief" and ev["keys"][:2] == ["race_track_temp_44", "race_setup_hot"]
    m._last_voice_trigger_time = 0
    again = m.evaluate_voice_triggers()
    assert again is ev or again["type"] != "race_brief"


def test_no_race_brief_after_the_start_or_outside_a_race():
    m, lapd = manager()
    lapd.m_currentLapTimeInMS = 45000
    ev = m.evaluate_voice_triggers()
    assert not ev or ev.get("type") != "race_brief"
    m, _ = manager(session_type=1)
    ev = m.evaluate_voice_triggers()
    assert not ev or ev.get("type") != "race_brief"


def test_tyre_report_once_a_lap_with_strategy_at_most_every_three_laps():
    m, lapd = manager()
    m._triggered_voice_conditions.add("race_brief")
    lapd.m_currentLapTimeInMS, lapd.m_lapDistance = 30000, 900.0
    m.car_status = NS(m_carStatusData=[NS(m_tyresAgeLaps=8, m_visualTyreCompound=17)] * 22)
    m.car_damage = NS(m_carDamageData=[NS(m_tyresWear=[20.0, 19.0, 14.0, 14.0])] * 22)
    lapd.m_currentLapNum = 9
    ev = m.evaluate_voice_triggers()
    assert ev["type"] == "tyre_report" and "race_strategy_manage" in ev["keys"] and ev["badge"] == "STRATEGY"
    m._last_voice_trigger_time = 0
    assert m.evaluate_voice_triggers() is ev                 # same lap: nothing new
    lapd.m_currentLapNum = 10                                # next lap, same 3-lap block (9..11): rate only
    m._last_voice_trigger_time = 0
    ev2 = m.evaluate_voice_triggers()
    assert ev2["type"] == "tyre_report" and ev2["keys"] == ["race_tyre_rate_2_5"] and ev2["badge"] == "TYRES"
    lapd.m_currentLapNum, lapd.m_lapDistance = 12, 900.0     # new block, 3 laps more wear: strategy again
    m.car_status = NS(m_carStatusData=[NS(m_tyresAgeLaps=11, m_visualTyreCompound=17)] * 22)
    m.car_damage = NS(m_carDamageData=[NS(m_tyresWear=[27.5, 26.0, 19.0, 19.0])] * 22)
    m._last_voice_trigger_time = 0
    assert "race_strategy_manage" in m.evaluate_voice_triggers()["keys"]
