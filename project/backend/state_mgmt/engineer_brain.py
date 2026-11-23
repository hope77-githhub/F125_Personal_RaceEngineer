"""
Race-engineer "brain": setup advice, lap debriefs, race radio and answers to driver questions.

* SETUP_RULES implement docs/SETUP_GUIDE.md (keep both in sync).
* Every spoken line is a pre-baked file (voice/setup/*, voice/qa/*); VOICE_LINES() lists them all
  so the voice baker can generate exactly what the engine can say. Numbers are baked per value
  (gap 0.2-9.9 s, tenths 1-30, laps 1-30 …) so answers are spoken as whole natural sentences.
* Answers return a list of line keys (played back to back) plus English / Korean display text.
"""
import math

# ----------------------------------------------------------------------------- number words
_ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
         "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
         "nineteen"]
_TENS = {2: "twenty", 3: "thirty", 4: "forty", 5: "fifty", 6: "sixty", 7: "seventy", 8: "eighty", 9: "ninety"}


def int_words(n):
    n = int(n)
    if n < 20:
        return _ONES[n]
    t, o = divmod(n, 10)
    return _TENS[t] if o == 0 else f"{_TENS[t]} {_ONES[o]}"


def tenths_words(n):
    """1 -> 'one tenth', 3 -> 'three tenths', 12 -> 'one point two seconds', 10 -> 'one second'."""
    n = int(n)
    if n < 10:
        return "one tenth" if n == 1 else f"{_ONES[n]} tenths"
    whole, frac = divmod(n, 10)
    if frac == 0:
        return "one second" if whole == 1 else f"{_ONES[whole]} seconds"
    return f"{_ONES[whole]} point {_ONES[frac]} seconds"


def value_key(v):
    """Same key style as voice/phrases: 0.8 -> '0_8', 12 -> '12_0'."""
    return str(round(float(v), 1)).replace(".", "_")


# ----------------------------------------------------------------------------- spoken lines
SETUP_TEXT = {
    "setup_tyres_hot": ("Tyre temperatures are running high. Try dropping all four tyre pressures by zero point four psi.",
                        "타이어 온도가 높습니다. 4바퀴 공기압을 0.4 psi씩 낮춰 보세요."),
    "setup_tyres_cold": ("Tyres are running cold. Add zero point four psi to bring them into the window.",
                         "타이어가 차갑습니다. 공기압을 0.4 psi 올려 작동 온도로 맞추세요."),
    "setup_fronts_hot": ("The fronts are overheating. Drop the front pressures by zero point four psi and soften the front anti-roll bar by two.",
                         "앞타이어가 과열됩니다. 앞 공기압 −0.4 psi, 프런트 안티롤바 −2를 권장합니다."),
    "setup_rears_hot": ("The rears are overheating on exit. Drop the rear pressures by zero point four psi and take five percent off the on-throttle differential.",
                        "탈출 때 뒤타이어가 과열됩니다. 뒤 공기압 −0.4 psi, On-throttle 디퍼렌셜 −5%를 권장합니다."),
    "setup_front_limited": ("The car is front limited. Try two clicks more front wing, or soften the front anti-roll bar by two.",
                            "앞타이어가 먼저 닳는 앞 제한 상태입니다. 프런트 윙 +2 또는 프런트 안티롤바 −2를 권장합니다."),
    "setup_rear_limited": ("The rears are wearing faster than the fronts. Take five percent off the on-throttle differential and add one click of rear wing.",
                           "뒤타이어가 더 빨리 닳습니다. On-throttle 디퍼렌셜 −5%, 리어 윙 +1을 권장합니다."),
    "setup_balance_ok": ("The balance looks good. No setup change needed for now.",
                         "밸런스가 좋습니다. 지금은 셋업을 바꿀 필요가 없습니다."),
    # from the practice comparison with the fastest car (setup_analysis rules); "downforce": the voice
    # cannot say "wing" clearly
    "setup_understeer": ("The front is sliding wide in the medium speed corners. Add some front downforce and soften the front anti-roll bar.",
                         "중속 코너에서 언더스티어가 납니다. 프런트 윙을 올리고 프런트 안티롤바를 부드럽게 하세요."),
    "setup_oversteer": ("The rear is stepping out on us. Add a little rear downforce and soften the rear anti-roll bar.",
                        "리어가 미끄러집니다. 리어 윙을 조금 올리고 리어 안티롤바를 부드럽게 하세요."),
    "setup_traction": ("We are losing traction out of the slow corners. Take five percent off the on-throttle differential.",
                       "저속 코너 탈출에서 트랙션이 부족합니다. On-throttle 디퍼렌셜을 5% 낮추세요."),
    "setup_more_downforce": ("We are quick on the straights but slow through the fast corners. Add two clicks of downforce, front and rear.",
                             "직선은 빠른데 고속 코너에서 느립니다. 앞뒤 윙을 2클릭씩 올리세요."),
    "setup_less_downforce": ("We are losing time on the straights. Take two clicks of downforce off, front and rear.",
                             "직선에서 시간을 잃고 있습니다. 앞뒤 윙을 2클릭씩 내리세요."),
}

QA_TEXT = {
    "qa_say_again": ("Say again, I did not copy. Ask me about pace, tyres, the gap or the setup.",
                     "잘 못 들었습니다. 페이스, 타이어, 갭, 셋업에 대해 물어봐 주세요."),
    "qa_no_data": ("Give me one more lap of data and I will have an answer for you.",
                   "한 랩만 더 데이터를 주시면 답해 드리겠습니다."),
    "qa_not_race": ("That one is for the race. In this session, focus on your own laps.",
                    "그건 레이스에서 의미 있는 질문입니다. 이번 세션은 본인 랩에 집중하세요."),
    "qa_leading": ("You are leading the race. Keep this rhythm and manage the tyres to the flag.",
                   "레이스를 리드하고 있습니다. 이 리듬을 유지하며 타이어를 관리하세요."),
    "qa_no_car_ahead": ("There is no car ahead of you. You are leading.",
                        "앞차가 없습니다. 선두입니다."),
    "qa_win_unrealistic": ("Winning is not realistic from here. Focus on the car ahead, one place at a time.",
                           "현재로선 우승이 어렵습니다. 한 계단씩, 앞차에 집중하세요."),
    "qa_catch_never": ("At this rate we will not catch him before the flag. We need more pace.",
                       "지금 페이스로는 체커 전까지 따라잡기 어렵습니다. 페이스가 더 필요합니다."),
    "qa_sector_faster": ("You are faster than him in every sector.",
                         "모든 섹터에서 앞차보다 빠릅니다."),
    "qa_tip_overtake": ("Stay within one second at the detection point for overtake mode, and push on the exit of the last corner.",
                   "감지 지점에서 1초 이내를 유지해 오버테이크 모드를 쓰고, 마지막 코너 탈출에 집중하세요."),
    "qa_tip_older_tyres": ("He is on older tyres. Push now while he is struggling.",
                           "앞차 타이어가 더 오래됐습니다. 지금 밀어붙이세요."),
    "qa_lost_nothing": ("Last lap was your best lap. Keep doing exactly that.",
                        "지난 랩이 베스트 랩입니다. 그대로 유지하세요."),
    "qa_temps_ok": ("Tyre temperatures are in the window.",
                    "타이어 온도는 적정 범위입니다."),
    "qa_temps_fronts_hot": ("The fronts are running hot.", "앞타이어 온도가 높습니다."),
    "qa_temps_rears_hot": ("The rears are running hot.", "뒤타이어 온도가 높습니다."),
    "qa_temps_cold": ("The tyres are running cold.", "타이어가 차갑습니다."),
    "qa_tyres_to_end": ("The tyres will make it to the end. No stop needed.",
                        "타이어가 끝까지 버팁니다. 피트스톱이 필요 없습니다."),
    "qa_box_now": ("Box this lap, box this lap. The tyres are done.",
                   "이번 랩에 피트인하세요. 타이어가 다 됐습니다."),
}


def _numbered_lines():
    """{key: (english, korean)} for every value-specific answer sentence."""
    out = {}
    for n in range(1, 31):
        out[f"qa_need_tenths_{n}"] = (f"To win, you need to find {tenths_words(n)} a lap on the leader.",
                                      f"우승하려면 선두보다 랩당 {n / 10:.1f}초 빨라야 합니다.")
        out[f"qa_catch_laps_{n}"] = (("At this rate you will be on him next lap." if n == 1 else
                                      f"At this rate you will catch him in {int_words(n)} laps."),
                                     f"지금 페이스면 {n}랩 안에 따라잡습니다.")
        out[f"qa_box_in_{n}"] = (("We are looking at boxing next lap." if n == 1 else
                                  f"We are looking at boxing in {int_words(n)} laps."),
                                 f"{n}랩 뒤 피트인을 예상합니다.")
    for n in range(1, 21):
        out[f"qa_closing_{n}"] = (f"You are closing by {tenths_words(n)} a lap.",
                                  f"랩당 {n / 10:.1f}초씩 좁히고 있습니다.")
        out[f"qa_pulling_{n}"] = (f"He is pulling away by {tenths_words(n)} a lap.",
                                  f"앞차가 랩당 {n / 10:.1f}초씩 멀어지고 있습니다.")
        for s in (1, 2, 3):
            out[f"qa_lost_s{s}_{n}"] = (f"Last lap you lost {tenths_words(n)} in sector {_ONES[s]}.",
                                        f"지난 랩 섹터 {s}에서 {n / 10:.1f}초 잃었습니다.")
    for s in (1, 2, 3):
        out[f"qa_sector_lose_{s}"] = (f"You are losing most time to him in sector {_ONES[s]}.",
                                      f"앞차에게 섹터 {s}에서 가장 많이 잃고 있습니다.")
    for n in range(5, 100, 5):
        out[f"qa_tyre_wear_{n}"] = (f"Tyre wear is {int_words(n)} percent on the worst tyre.",
                                    f"가장 많이 닳은 타이어 마모는 {n}%입니다.")
    leader_values = [round(t / 10, 1) for t in range(2, 100)] + [float(v) for v in range(10, 41)]
    for g in leader_values:
        spoken = (int_words(int(g)) if g >= 10 else
                  (f"{_ONES[int(g)]} point {_ONES[int(round(g * 10)) % 10]}" if round(g * 10) % 10 else _ONES[int(g)]))
        out[f"gap_leader_{value_key(g)}"] = (f"Gap to the leader is {spoken} seconds.",
                                             f"선두와의 갭은 {g:g}초입니다.")
    return out


NUMBERED_TEXT = _numbered_lines()


def _decimal_words(v):
    """2.1 -> 'two point one', 3.0 -> 'three', 0.4 -> 'zero point four' (v < 10)."""
    whole, tenth = int(v), int(round(v * 10)) % 10
    return f"{_ONES[whole]} point {_ONES[tenth]}" if tenth else _ONES[whole]


# Race radio (voice/race/*): pre-race setup brief, tyre wear per lap, tyre strategy. Numbers sit in the middle
# of each sentence: the engineer voice swallows a number at the very end.
RACE_TEXT = {
    "race_setup_hot": ("It is hot today. Take zero point four psi out of all four tyres and look after the rears in the first stint.",
                       "덥습니다. 타이어 공기압을 4바퀴 모두 0.4 psi 낮추고, 첫 스틴트에서는 뒤타이어를 아끼세요."),
    "race_setup_cool": ("It is cool today. Raise the tyre pressures by zero point four psi, and take care on the first laps.",
                        "쌀쌀합니다. 타이어 공기압을 0.4 psi 올리고, 첫 몇 랩은 조심하세요."),
    "race_setup_normal": ("Temperatures are normal today. Keep the tyre pressures as they are.",
                          "오늘 온도는 보통입니다. 타이어 공기압은 그대로 두세요."),
    # the engineer voice cannot say "wing" clearly: "downforce" instead
    "race_setup_rain_risk": ("There is a chance of showers later in the race. A bit more downforce will help if they come.",
                             "레이스 중 비가 올 가능성이 있습니다. 다운포스를 조금 올려 두면 비가 와도 대응하기 쉽습니다."),
    "race_setup_rain_expected": ("We expect a wet race. Add downforce, about five clicks front and rear, and raise the ride height a little.",
                                 "레이스 중 비가 예상됩니다. 앞뒤 윙을 5클릭 정도 올려 다운포스를 늘리고, 차고를 조금 높이세요."),
    "race_setup_wet_inters": ("The track is wet. Start on the intermediates, and run extra downforce with a higher ride height.",
                              "트랙이 젖어 있습니다. 인터미디어트로 시작하고, 다운포스를 올리고 차고를 높이세요."),
    "race_setup_wet_full": ("It is raining hard. Start on the full wets, with maximum downforce and soft suspension.",
                            "비가 많이 옵니다. 풀 웨트로 시작하고, 다운포스는 최대로, 서스펜션은 부드럽게 하세요."),
    "race_strategy_manage": ("At this rate the tyres will not reach the pit window. Look after them now: smooth on the throttle and lift a little before the big stops.",
                             "지금 마모 속도면 피트 윈도우까지 타이어가 못 버팁니다. 지금부터 관리하세요. 가속은 부드럽게, 큰 브레이킹 전에는 살짝 리프트하세요."),
    "race_strategy_box_early": ("At this rate the tyres will not make the pit window. We will box early.",
                                "지금 마모 속도면 피트 윈도우까지 타이어가 못 버팁니다. 일찍 피트인합니다."),
    "race_strategy_rears": ("The rears are going first. Be gentle on the throttle out of the slow corners.",
                            "뒤타이어가 먼저 닳고 있습니다. 저속 코너 탈출 때 가속을 부드럽게 하세요."),
    "race_strategy_fronts": ("The fronts are going first. Take it easy on them through the long turns.",
                             "앞타이어가 먼저 닳고 있습니다. 긴 코너에서는 앞타이어를 아끼세요."),
}
TRACK_TEMPS = range(10, 61)
WEAR_RATES = [round(t / 10, 1) for t in range(3, 61)] + [7.0, 8.0, 9.0, 10.0]   # % per lap: 0.3 .. 6.0, then whole


def _rate_key(rate):
    """Wear rate -> a baked race_tyre_rate_* value: tenths up to 6 %/lap, whole numbers 7 .. 10 above."""
    r = round(rate, 1)
    return value_key(_clamp(r, WEAR_RATES[0], 6.0) if r <= 6.0 else float(_clamp(int(round(r)), 7, 10)))
for _n in TRACK_TEMPS:
    RACE_TEXT[f"race_track_temp_{_n}"] = (f"Track temperature is {int_words(_n)} degrees.", f"트랙 온도는 {_n}도입니다.")
for _r in WEAR_RATES:
    RACE_TEXT[f"race_tyre_rate_{value_key(_r)}"] = (f"Tyre wear per lap is {_decimal_words(_r)} percent on this set.",
                                                    f"타이어 마모는 랩당 {_r:g}%입니다.")


# Lap debrief radio (voice/debrief/*): after a lap, how far off the best it was, in which sector and at which turn
# the time went and why (lap_debrief.py), plus the practice timesheet position and stint length. Numbers sit early
# in each sentence (the voice swallows a number at the very end).
TURN_MAX = 30                    # official numbers go up to 27 (Jeddah); learned turn maps can have a few more
_ORDINALS = ["", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
             "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth",
             "eighteenth", "nineteenth", "twentieth", "twenty first", "twenty second"]
STINT_LAPS = range(5, 41)
OFF_BEST_TENTHS = list(range(1, 31)) + [40, 50, 60, 70, 80]   # 0.1 .. 3.0 s, then whole seconds up to 8 s


def _secs_words(t):
    return "one second" if t == 10 else f"{_decimal_words(t / 10)} seconds"


def _tenths_key(seconds):
    """Seconds -> a baked OFF_BEST_TENTHS value (tenths up to 3 s, whole seconds 4 .. 8 above)."""
    t = int(round(seconds * 10))
    return _clamp(t, 1, 30) if t <= 30 else _clamp(int(round(seconds)) * 10, 40, 80)


def _debrief_lines():
    out = {
        "lap_best": ("That is a new personal best. Good lap.", "개인 베스트 랩입니다. 좋습니다."),
        "lap_matched": ("Right on your best pace, within a tenth.", "베스트 페이스와 0.1초 이내입니다."),
        "loss_cause_late": ("You were late on the brakes there.", "그 코너에서 브레이킹이 늦었습니다."),
        "loss_cause_early": ("You braked too early there.", "그 코너에서 브레이킹이 너무 일렀습니다."),
        "loss_cause_apex": ("You were too slow through the middle of that corner.", "코너 중간 속도가 너무 낮았습니다."),
        "loss_cause_exit": ("The exit was slow, get on the power earlier there.", "탈출이 느렸습니다. 가속을 더 일찍 시작하세요."),
        "lap_invalid": ("That lap was deleted for track limits.", "트랙 리밋으로 랩 타임이 삭제됐습니다."),
        "practice_stint_long": ("This set would last well over forty laps at this wear rate.",
                                "이 마모 속도면 이 타이어는 40랩 넘게 버팁니다."),
        "practice_stint_short": ("This set would not even last five laps at this wear rate.",
                                 "이 마모 속도면 이 타이어는 5랩도 못 버팁니다."),
    }
    for n in range(1, TURN_MAX + 1):
        out[f"loss_turn_{n}"] = (f"We lost the most time at turn {int_words(n)} on that lap.",
                                 f"가장 많이 잃은 곳은 {n}번 코너입니다.")
        out[f"quali_focus_{n}"] = (f"We keep losing time at turn {int_words(n)}, so focus on that one.",
                                   f"{n}번 코너에서 계속 시간을 잃고 있습니다. 그 코너에 집중하세요.")
    for s in (1, 2, 3):
        out[f"loss_sector_{s}"] = (f"Sector {_ONES[s]} is where most of the time went.", f"섹터 {s}에서 가장 많이 잃었습니다.")
    for t in OFF_BEST_TENTHS:
        out[f"lap_off_best_{t}"] = (f"That lap was {_secs_words(t)} off your best.", f"베스트 랩보다 {t / 10:.1f}초 느렸습니다.")
        out[f"gap_top_{t}"] = (f"That is {_secs_words(t)} off the top time.", f"1위 기록보다 {t / 10:.1f}초 느립니다.")
    for n in range(1, len(_ORDINALS)):
        out[f"practice_rank_{n}"] = ("You are the fastest so far." if n == 1 else f"You are {_ORDINALS[n]} fastest so far.",
                                     f"현재 타임시트 {n}위입니다.")
    for n in STINT_LAPS:
        out[f"practice_stint_{n}"] = (f"This set would last about {int_words(n)} laps at this wear rate.",
                                      f"이 마모 속도면 이 타이어는 약 {n}랩 버팁니다.")
    return out


DEBRIEF_TEXT = _debrief_lines()
_DEBRIEF_PREFIXES = ("lap_", "loss_", "quali_focus_", "practice_", "gap_top_")


def VOICE_LINES():
    """{relative mp3 path under backend/data/voice: english text} — everything the brain can say."""
    lines = {f"setup/{k}.mp3": v[0] for k, v in SETUP_TEXT.items()}
    lines.update({f"qa/{k}.mp3": v[0] for k, v in QA_TEXT.items()})
    lines.update({f"qa/{k}.mp3": v[0] for k, v in NUMBERED_TEXT.items()})
    lines.update({f"race/{k}.mp3": v[0] for k, v in RACE_TEXT.items()})
    lines.update({f"debrief/{k}.mp3": v[0] for k, v in DEBRIEF_TEXT.items()})
    return lines


def line_url(key):
    """Where a line key lives (new lines vs. already existing phrases/clips)."""
    if key.startswith("race_"):
        return f"/voice/race/{key}.mp3"
    if key.startswith("setup_"):
        return f"/voice/setup/{key}.mp3"
    if key.startswith(_DEBRIEF_PREFIXES):
        return f"/voice/debrief/{key}.mp3"
    if key.startswith(("qa_", "gap_leader_")):
        return f"/voice/qa/{key}.mp3"
    if key.startswith(("gap_ahead_", "pace_drop_")):
        return f"/voice/phrases/{key}.mp3"
    return f"/voice/clips/{key}.mp3"


def line_text(key):
    for table in (SETUP_TEXT, QA_TEXT, NUMBERED_TEXT, RACE_TEXT, DEBRIEF_TEXT):
        if key in table:
            return table[key]
    # reused phrase files (voice/phrases) — same wording as StateManager.build_modular_stitched_event
    try:
        if key.startswith("gap_ahead_"):
            g = float(key[len("gap_ahead_"):].replace("_", "."))
            ot = g < 1.0  # 2026 rules: overtake mode (no DRS) within one second of the car ahead
            return (f"Gap to car ahead is {g:g} seconds" + (", overtake mode available." if ot else "."),
                    f"앞차와의 갭은 {g:g}초입니다." + (" 오버테이크 모드를 쓸 수 있습니다." if ot else ""))
    except ValueError:
        pass
    return None


# ----------------------------------------------------------------------------- setup rules
def _avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def _laps_with_tyres(laps):
    """Clean live laps (no safety car / pit) that carry tyre temperatures and wear."""
    return [h for h in laps if h.get("tyre_surface_avg") and h.get("tyres_wear")
            and not (h.get("flags") or {}).get("sc") and not (h.get("flags") or {}).get("pit")]


def tyre_state(laps):
    """Averages over the last 2 clean laps. Tyre order: RL, RR, FL, FR."""
    good = _laps_with_tyres(laps)
    if len(good) < 2:
        return None
    last2 = good[-2:]
    surf = [_avg([h["tyre_surface_avg"][i] for h in last2]) for i in range(4)]
    front_t, rear_t = _avg(surf[2:]), _avg(surf[:2])
    w_prev, w_last = good[-2]["tyres_wear"], good[-1]["tyres_wear"]
    rate = [max(0.0, w_last[i] - w_prev[i]) for i in range(4)]
    return {
        "surf": surf, "all_t": _avg(surf), "front_t": front_t, "rear_t": rear_t,
        "front_rate": _avg(rate[2:]), "rear_rate": _avg(rate[:2]),
        "max_wear": max(w_last), "worst_rate": max(rate), "laps": len(good),
    }


def _fmt_change(setup, field, delta, label, unit=""):
    cur = (setup or {}).get(field)
    if cur is None:
        return f"{label} {delta:+g}{unit}"
    new = round(cur + delta, 2)
    return f"{label} {cur:g}{unit} → {new:g}{unit}"


SETUP_RULES = [
    # (rule id, condition(st), [(setup field, delta, label, unit), ...])  — see docs/SETUP_GUIDE.md §3
    ("tyres_hot", lambda st: st["all_t"] > 105,
     [("m_frontLeftTyrePressure", -0.4, "FL psi", ""), ("m_frontRightTyrePressure", -0.4, "FR psi", ""),
      ("m_rearLeftTyrePressure", -0.4, "RL psi", ""), ("m_rearRightTyrePressure", -0.4, "RR psi", "")]),
    ("tyres_cold", lambda st: st["all_t"] < 85 and st["laps"] >= 2,
     [("m_frontLeftTyrePressure", 0.4, "FL psi", ""), ("m_frontRightTyrePressure", 0.4, "FR psi", ""),
      ("m_rearLeftTyrePressure", 0.4, "RL psi", ""), ("m_rearRightTyrePressure", 0.4, "RR psi", "")]),
    ("fronts_hot", lambda st: st["front_t"] - st["rear_t"] >= 8 and st["front_t"] > 100,
     [("m_frontLeftTyrePressure", -0.4, "FL psi", ""), ("m_frontRightTyrePressure", -0.4, "FR psi", ""),
      ("m_frontAntiRollBar", -2, "Front ARB", "")]),
    ("rears_hot", lambda st: st["rear_t"] - st["front_t"] >= 8 and st["rear_t"] > 100,
     [("m_rearLeftTyrePressure", -0.4, "RL psi", ""), ("m_rearRightTyrePressure", -0.4, "RR psi", ""),
      ("m_onThrottle", -5, "On-throttle diff", "%")]),
    ("front_limited", lambda st: st["front_rate"] >= 1.0 and st["front_rate"] >= 1.3 * max(st["rear_rate"], 0.01),
     [("m_frontWing", 2, "Front wing", ""), ("m_frontAntiRollBar", -2, "Front ARB", "")]),
    ("rear_limited", lambda st: st["rear_rate"] >= 1.0 and st["rear_rate"] >= 1.3 * max(st["front_rate"], 0.01),
     [("m_onThrottle", -5, "On-throttle diff", "%"), ("m_rearWing", 1, "Rear wing", "")]),
]


def setup_recommendation(laps, setup):
    """First matching rule -> {rule, key, text, text_ko, changes:[...]}; None if not enough data;
    rule 'balance_ok' when nothing needs changing."""
    st = tyre_state(laps)
    if st is None:
        return None
    basis = (f"Surface avg F {st['front_t']:.0f}°C / R {st['rear_t']:.0f}°C, "
             f"wear F {st['front_rate']:.1f}%/lap / R {st['rear_rate']:.1f}%/lap")
    for rule_id, cond, changes in SETUP_RULES:
        try:
            hit = cond(st)
        except Exception:
            hit = False
        if hit:
            key = f"setup_{rule_id}"
            en, ko = SETUP_TEXT[key]
            return {"rule": rule_id, "key": key, "text": en, "text_ko": ko, "state": st,
                    "changes": [_fmt_change(setup, f, d, lbl, u) for f, d, lbl, u in changes] + [basis]}
    en, ko = SETUP_TEXT["setup_balance_ok"]
    return {"rule": "balance_ok", "key": "setup_balance_ok", "text": en, "text_ko": ko, "state": st, "changes": [basis]}


# ----------------------------------------------------------------------------- questions
INTENTS = [
    # (intent, keywords) — checked in order, first hit wins. Korean + English.
    ("setup", ["셋업", "세팅", "setup", "set-up", "set up", "밸런스", "balance"]),
    ("pit", ["피트", "박스", "pit", "box", "언제 들어", "stop"]),
    ("tyres", ["타이어", "tyre", "tire", "마모", "wear", "온도", "temperature"]),
    ("win", ["1등", "일등", "우승", "이기", "win", "p1", "first place", "victory", "lead the race"]),
    ("catch", ["앞차", "추월", "잡", "catch", "overtake", "car ahead", "pass him", "pass the"]),
    ("time_loss", ["어디서", "느려", "손해", "잃", "시간", "losing time", "where am i", "slow", "faster", "improve"]),
    ("gap", ["갭", "간격", "차이", "gap", "interval"]),
]

PRESET_QUESTIONS = [
    {"intent": "win", "ko": "1등 하려면 어떻게 해야 해?", "en": "How can I win?"},
    {"intent": "catch", "ko": "앞차 잡을 수 있어?", "en": "Can I catch the car ahead?"},
    {"intent": "time_loss", "ko": "어디서 시간을 잃고 있어?", "en": "Where am I losing time?"},
    {"intent": "tyres", "ko": "타이어 상태 어때?", "en": "How are my tyres?"},
    {"intent": "pit", "ko": "언제 피트인 해야 해?", "en": "When should I pit?"},
    {"intent": "setup", "ko": "셋업 어떻게 바꿔야 해?", "en": "Any setup changes?"},
    {"intent": "gap", "ko": "갭 알려줘", "en": "What's the gap?"},
]


def detect_intent(text):
    t = (text or "").strip().lower()
    if not t:
        return None
    for intent, words in INTENTS:
        if any(w in t for w in words):
            return intent
    return None


def _clamp(n, lo, hi):
    return max(lo, min(hi, n))


def _answer(keys, intent, extra_en="", extra_ko="", details=None):
    texts = [line_text(k) or ("", "") for k in keys]
    en = " ".join(t[0] for t in texts if t[0]) + (f" {extra_en}" if extra_en else "")
    ko = " ".join(t[1] for t in texts if t[1]) + (f" {extra_ko}" if extra_ko else "")
    return {"intent": intent, "keys": keys, "text": en.strip(), "text_ko": ko.strip(), "details": details or []}


def answer(intent, snap):
    """snap: snapshot dict built by StateManager.build_qa_snapshot()."""
    group = snap.get("group")
    laps = snap.get("laps", [])

    if intent is None:
        return _answer(["qa_say_again"], "unknown")

    if intent == "setup":
        rec = setup_recommendation(laps, snap.get("setup"))
        if rec is None:
            return _answer(["qa_no_data"], intent)
        return _answer([rec["key"]], intent, details=rec["changes"])

    if intent == "tyres":
        st = tyre_state(laps)
        wear = snap.get("max_wear")
        if wear is None:
            return _answer(["qa_no_data"], intent)
        keys = [f"qa_tyre_wear_{_clamp(int(round(wear / 5.0)) * 5, 5, 95)}"]
        if st:
            if st["all_t"] < 85:
                keys.append("qa_temps_cold")
            elif st["front_t"] - st["rear_t"] >= 8 and st["front_t"] > 100:
                keys.append("qa_temps_fronts_hot")
            elif st["rear_t"] - st["front_t"] >= 8 and st["rear_t"] > 100:
                keys.append("qa_temps_rears_hot")
            else:
                keys.append("qa_temps_ok")
        return _answer(keys, intent, details=[f"Worst tyre wear {wear:.1f}%"])

    if intent in ("win", "catch", "pit", "gap") and group != "race":
        return _answer(["qa_not_race"], intent)

    if intent == "pit":
        wear, rate, rem = snap.get("max_wear"), snap.get("worst_wear_rate"), snap.get("laps_remaining")
        if wear is None:
            return _answer(["qa_no_data"], intent)
        if wear >= 45:
            return _answer(["qa_box_now"], intent)
        if not rate or rate <= 0.05:
            return _answer(["qa_no_data"], intent)
        laps_to_limit = math.floor((45 - wear) / rate)
        if rem is not None and laps_to_limit >= rem:
            return _answer(["qa_tyres_to_end"], intent, details=[f"{laps_to_limit} laps to 45% wear, {rem} laps left"])
        return _answer([f"qa_box_in_{_clamp(max(1, laps_to_limit), 1, 30)}"], intent,
                       details=[f"Wear {wear:.1f}% (+{rate:.1f}%/lap) → 45% in {laps_to_limit} laps"])

    if intent == "gap":
        keys = []
        if snap.get("position") == 1:
            keys.append("qa_no_car_ahead")
        elif snap.get("gap_ahead_s"):
            keys.append(f"gap_ahead_{value_key(_clamp(snap['gap_ahead_s'], 0.2, 9.9))}")
        if snap.get("position", 1) > 1 and snap.get("gap_leader_s"):
            keys.append(_leader_key(snap["gap_leader_s"]))
        return _answer(keys or ["qa_no_data"], intent)

    if intent == "catch":
        if snap.get("position") == 1:
            return _answer(["qa_no_car_ahead"], intent)
        return _catch_answer(snap, intent)

    if intent == "win":
        if snap.get("position") == 1:
            return _answer(["qa_leading"], intent)
        gap_l, rem = snap.get("gap_leader_s"), snap.get("laps_remaining")
        if not gap_l or not rem:
            return _answer(["qa_no_data"], intent)
        need = gap_l / max(rem, 1)
        keys = [_leader_key(gap_l)]
        if need > 3.0:
            keys.append("qa_win_unrealistic")
            return _answer(keys, intent, details=[f"Need {need:.2f}s/lap over {rem} laps"])
        keys.append(f"qa_need_tenths_{_clamp(int(math.ceil(need * 10)), 1, 30)}")
        catch = _catch_answer(snap, intent)
        keys += [k for k in catch["keys"] if k.startswith(("qa_sector_lose", "qa_tip"))][:1]
        return _answer(keys, intent, details=[f"Gap {gap_l:.1f}s, {rem} laps left → {need:.2f}s/lap"])

    if intent == "time_loss":
        return _time_loss_answer(snap, intent)

    return _answer(["qa_say_again"], "unknown")


def _leader_key(g):
    g = _clamp(g, 0.2, 40.0)
    return f"gap_leader_{value_key(g if g < 10 else round(g))}"


def _catch_answer(snap, intent):
    gap = snap.get("gap_ahead_s")
    if not gap:
        return _answer(["qa_no_data"], intent)
    keys = [f"gap_ahead_{value_key(_clamp(gap, 0.2, 9.9))}"]
    details = []
    closing = snap.get("closing_s_per_lap")  # + = we are closing
    rem = snap.get("laps_remaining")
    if closing is not None:
        tenths = _clamp(int(round(abs(closing) * 10)), 1, 20)
        if closing >= 0.05:
            keys.append(f"qa_closing_{tenths}")
            laps_needed = math.ceil(max(gap - 0.5, 0.1) / closing)  # within overtake range
            if rem is not None and laps_needed > rem:
                keys.append("qa_catch_never")
            else:
                keys.append(f"qa_catch_laps_{_clamp(laps_needed, 1, 30)}")
            details.append(f"Closing {closing:.2f}s/lap → overtake range in {laps_needed} laps")
        elif closing <= -0.05:
            keys.append(f"qa_pulling_{tenths}")
            keys.append("qa_catch_never")
    sectors = snap.get("sector_delta_vs_ahead")  # [s1, s2, s3] ms, + = we are slower
    if sectors:
        worst = max(range(3), key=lambda i: sectors[i])
        if sectors[worst] > 50:
            keys.append(f"qa_sector_lose_{worst + 1}")
            details.append("Sector deltas vs car ahead: " + ", ".join(f"S{i + 1} {d / 1000:+.3f}s" for i, d in enumerate(sectors)))
        else:
            keys.append("qa_sector_faster")
    if (snap.get("ahead_tyre_age") or 0) >= (snap.get("my_tyre_age") or 0) + 3:
        keys.append("qa_tip_older_tyres")
    elif gap < 2.0:
        keys.append("qa_tip_overtake")
    return _answer(keys, intent, details=details)


def _time_loss_answer(snap, intent):
    sec_last, sec_best = snap.get("last_sectors_ms"), snap.get("best_sectors_ms")
    if not sec_last or not sec_best:
        return _answer(["qa_no_data"], intent)
    deltas = [l - b for l, b in zip(sec_last, sec_best)]
    worst = max(range(3), key=lambda i: deltas[i])
    keys, details = [], ["Last vs best: " + ", ".join(f"S{i + 1} {d / 1000:+.3f}s" for i, d in enumerate(deltas))]
    if deltas[worst] < 50:
        keys.append("qa_lost_nothing")
    else:
        keys.append(f"qa_lost_s{worst + 1}_{_clamp(int(round(deltas[worst] / 100)), 1, 20)}")
    corner = snap.get("worst_corner")  # lap_debrief row of the last lap vs the best lap
    if corner:
        keys += _turn_keys(corner)
        if snap.get("worst_corner_text"):
            details.append(snap["worst_corner_text"])
    return _answer(keys, intent, details=details)


# ----------------------------------------------------------------------------- lap debrief radio
# lap_debrief.analyze() result -> what the engineer says after a lap, by session (docs/ENGINEER_VOICE_LINES.md §1)
PRACTICE_LAP_LOSS, PRACTICE_SECTOR_LOSS = 0.4, 0.3   # s: practice talks about a lap only when it lost this much
QUALI_MATCH, QUALI_SECTOR_LOSS = 0.1, 0.1            # s
NAMED_CORNER_LOSS = 0.1                              # s: a turn is named when it lost at least this much
RACE_CORNER_LOSS = 0.15                              # s: race lap-loss call


def _turn_keys(row, prefix="loss_turn"):
    if not row or not 1 <= row.get("turn", 0) <= TURN_MAX:
        return []
    keys = [f"{prefix}_{row['turn']}"]
    if row.get("cause"):
        keys.append(f"loss_cause_{row['cause']}")
    return keys


def _off_best_key(delta):
    return f"lap_off_best_{_tenths_key(delta)}"


def lap_debrief(group, analysis, is_pb, prev_turn=None, rank=None, details=None, gap_top=None, first=False,
                invalid=False):
    """What to say after a lap. practice: pace + where the time went when the lap lost a lot, a new best with the
    timesheet position; qualifying (and time trial): every push lap, sector + turn + cause, 'focus' when the same
    turn costs time again, the position (and gap to the top) after a new best; race: the turn and cause of a big
    lap loss. first: the first timed lap (nothing to compare with yet: position and gap to the top only);
    invalid: the lap was deleted for track limits; rank / gap_top: timesheet position and gap to P1 in s.
    -> _answer() dict with 'turn' (named turn) or None."""
    keys, named = [], None

    def position():
        out = [f"practice_rank_{rank}"] if rank and 1 <= rank < len(_ORDINALS) else []
        if out and group == "qualifying" and rank > 1 and gap_top and gap_top >= 0.05:
            out.append(f"gap_top_{_tenths_key(gap_top)}")
        return out

    if invalid:
        keys = ["lap_invalid"]
    elif first:
        keys = position()
    elif analysis:
        delta = analysis.get("lap_delta")
        sectors = analysis.get("sectors") or []
        worst = analysis.get("worst")
        named = worst if worst and worst["loss"] >= NAMED_CORNER_LOSS else None
        if group == "practice":
            if is_pb:
                keys, named = ["lap_best"] + position(), None
            elif (delta or 0) >= PRACTICE_LAP_LOSS or (sectors and max(sectors) >= PRACTICE_SECTOR_LOSS):
                keys = ([_off_best_key(delta)] if (delta or 0) >= 0.05 else []) + _turn_keys(named)
        elif group == "qualifying":
            if is_pb:
                keys, named = ["lap_best"] + position(), None
            elif delta is not None and delta < QUALI_MATCH:
                keys, named = ["lap_matched"], None
            elif delta is not None:
                keys = [_off_best_key(delta)]
                if sectors and max(sectors) >= QUALI_SECTOR_LOSS:
                    keys.append(f"loss_sector_{max(range(3), key=lambda i: sectors[i]) + 1}")
                again = named and prev_turn == named["turn"]
                keys += _turn_keys(named, "quali_focus" if again else "loss_turn")
        elif group == "race":
            named = worst if worst and worst["loss"] >= RACE_CORNER_LOSS else None
            keys = _turn_keys(named)
    if not keys:
        return None
    res = _answer(keys, "lap_debrief", details=details)
    res["turn"] = named["turn"] if named and any(k.startswith(("loss_turn", "quali_focus")) for k in keys) else None
    return res


def setup_radio(rec, analysis):
    """Practice setup calls, most important first: [(rule, key, details)]. rec: setup_recommendation() (our tyre
    temperatures / wear), analysis: setup_analysis.analyze() (our best lap vs the fastest car)."""
    out = []
    if rec and rec.get("rule") != "balance_ok":
        out.append((rec["rule"], rec["key"], rec.get("changes") or []))
    for it in (analysis or {}).get("items", []):
        rule = it.get("rule")
        if it.get("status") == "change" and rule and f"setup_{rule}" in SETUP_TEXT:
            ev = it.get("evidence") or {}
            out.append((rule, f"setup_{rule}", [it["why"]["en"]] + ([ev["en"]] if ev.get("en") else [])))
    return out


def stint_projection(wear, age_laps):
    """Practice long run: wear per lap of the worst tyre on this set and how many laps the set would last to the
    TYRE_WEAR_LIMIT. -> _answer() dict or None (fewer than 3 laps on the set, or hardly any wear)."""
    if not wear or not age_laps or age_laps < 3:
        return None
    worst = max(wear)
    rate = worst / age_laps
    if rate < 0.3:
        return None
    life = int(TYRE_WEAR_LIMIT / rate)
    stint = ("practice_stint_long" if life >= STINT_LAPS.stop else "practice_stint_short" if life < STINT_LAPS.start
             else f"practice_stint_{life}")
    keys = [f"race_tyre_rate_{_rate_key(rate)}", stint]
    return _answer(keys, "stint", details=[f"Worst tyre {worst:.1f}% after {age_laps} laps on this set = {rate:.2f}%/lap "
                                           f"-> {TYRE_WEAR_LIMIT:.0f}% after about {life} laps"])


# ----------------------------------------------------------------------------- race radio
# docs/SETUP_GUIDE.md sections 6-7 (keep in sync)
HOT_TRACK, COOL_TRACK = 40, 25          # °C track temperature
RAIN_RISK, RAIN_LIKELY = 30, 60         # % highest rain chance in the race forecast
TYRE_WEAR_LIMIT = 45.0                  # % worst tyre: the engineer calls "box this lap" there (StateManager)
WEATHER_NAMES = {0: "clear", 1: "light cloud", 2: "overcast", 3: "light rain", 4: "heavy rain", 5: "storm"}
_PSI = [("m_frontLeftTyrePressure", "FL psi"), ("m_frontRightTyrePressure", "FR psi"),
        ("m_rearLeftTyrePressure", "RL psi"), ("m_rearRightTyrePressure", "RR psi")]


def race_brief(weather, track_temp, air_temp, rain_pct, setup):
    """Before the start of a race: setup advice for today's track temperature and weather.
    weather: 0 clear .. 5 storm (session packet), rain_pct: highest rain chance forecast for the race."""
    keys = [f"race_track_temp_{_clamp(int(track_temp), TRACK_TEMPS.start, TRACK_TEMPS.stop - 1)}"]
    details = [f"Track {track_temp}°C, air {air_temp}°C, {WEATHER_NAMES.get(weather, 'unknown')}, "
               f"rain chance in the race up to {rain_pct}%"]
    psi, wing = 0.0, 0
    if weather >= 4:
        keys.append("race_setup_wet_full")
        wing = 8
    elif weather == 3:
        keys.append("race_setup_wet_inters")
        wing = 5
    else:
        if track_temp >= HOT_TRACK:
            keys.append("race_setup_hot")
            psi = -0.4
        elif track_temp <= COOL_TRACK:
            keys.append("race_setup_cool")
            psi = 0.4
        else:
            keys.append("race_setup_normal")
        if rain_pct >= RAIN_LIKELY:
            keys.append("race_setup_rain_expected")
            wing = 5
        elif rain_pct >= RAIN_RISK:
            keys.append("race_setup_rain_risk")
            wing = 2
    if psi:
        details += [_fmt_change(setup, f, psi, label) for f, label in _PSI]
    if wing:
        details += [_fmt_change(setup, "m_frontWing", wing, "Front wing"), _fmt_change(setup, "m_rearWing", wing, "Rear wing")]
    return _answer(keys, "race_brief", details=details)


def tyre_report(wear, age_laps, current_lap, pit_ideal_lap=0, pit_latest_lap=0, with_strategy=True):
    """Race, once a lap: average wear per lap of the worst tyre on this set, plus a strategy call when that
    rate reaches TYRE_WEAR_LIMIT before the ideal pit lap (manage the tyres, or box early if it is far off).
    wear: [RL, RR, FL, FR] %, age_laps: laps on this set. None when there is nothing to report yet."""
    if not wear or not age_laps or age_laps < 1:
        return None
    worst = max(wear)
    rate = worst / age_laps
    if rate < 0.25:
        return None
    keys = [f"race_tyre_rate_{_rate_key(rate)}"]
    details = [f"Worst tyre {worst:.1f}% after {age_laps} laps on this set = {rate:.2f}%/lap"]
    strategy = None
    if with_strategy and pit_ideal_lap and current_lap < pit_ideal_lap and worst < TYRE_WEAR_LIMIT:
        laps_to_limit = (TYRE_WEAR_LIMIT - worst) / rate
        limit_lap = current_lap + int(math.floor(laps_to_limit))
        if limit_lap < pit_ideal_lap:
            short = pit_ideal_lap - limit_lap
            if short <= 3:
                strategy = "manage"
                keys.append("race_strategy_manage")
            else:
                strategy = "box_early"
                keys += ["race_strategy_box_early", f"qa_box_in_{_clamp(max(1, int(laps_to_limit)), 1, 30)}"]
            front, rear = (wear[2] + wear[3]) / 2, (wear[0] + wear[1]) / 2
            if rear >= front * 1.15:
                keys.append("race_strategy_rears")
            elif front >= rear * 1.15:
                keys.append("race_strategy_fronts")
            details.append(f"{TYRE_WEAR_LIMIT:.0f}% around lap {limit_lap}, ideal pit lap {pit_ideal_lap}"
                           + (f" (latest {pit_latest_lap})" if pit_latest_lap else "")
                           + f": {short} lap(s) short")
    res = _answer(keys, "tyre_report", details=details)
    res["strategy"] = strategy
    res["rate"] = round(rate, 2)
    return res
