"""
Race-engineer "brain": practice setup advice and answers to driver questions.

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
    "qa_tip_drs": ("Stay within one second at the detection point for DRS, and push on the exit of the last corner.",
                   "감지 지점에서 1초 이내를 유지해 DRS를 쓰고, 마지막 코너 탈출에 집중하세요."),
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
    for n in range(1, 17):
        out[f"qa_turn_{n}"] = (f"The biggest loss was at turn {int_words(n)}.",
                               f"가장 크게 잃은 곳은 {n}번 코너입니다.")
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


def VOICE_LINES():
    """{relative mp3 path under backend/data/voice: english text} — everything the brain can say."""
    lines = {f"setup/{k}.mp3": v[0] for k, v in SETUP_TEXT.items()}
    lines.update({f"qa/{k}.mp3": v[0] for k, v in QA_TEXT.items()})
    lines.update({f"qa/{k}.mp3": v[0] for k, v in NUMBERED_TEXT.items()})
    return lines


def line_url(key):
    """Where a line key lives (new lines vs. already existing phrases/clips)."""
    if key.startswith("setup_"):
        return f"/voice/setup/{key}.mp3"
    if key.startswith(("qa_", "gap_leader_")):
        return f"/voice/qa/{key}.mp3"
    if key.startswith(("gap_ahead_", "brake_early_", "brake_late_", "pace_drop_")):
        return f"/voice/phrases/{key}.mp3"
    return f"/voice/clips/{key}.mp3"


def line_text(key):
    for table in (SETUP_TEXT, QA_TEXT, NUMBERED_TEXT):
        if key in table:
            return table[key]
    # reused phrase files (voice/phrases) — same wording as StateManager.build_modular_stitched_event
    try:
        if key.startswith("brake_early_"):
            m = int(key.rsplit("_", 1)[1])
            return (f"Braking was about {m} meters early on entry.", f"브레이킹이 약 {m}m 일렀습니다.")
        if key.startswith("brake_late_"):
            m = int(key.rsplit("_", 1)[1])
            return (f"Braking was roughly {m} meters late into the apex.", f"브레이킹이 약 {m}m 늦었습니다.")
        if key.startswith("gap_ahead_"):
            g = float(key[len("gap_ahead_"):].replace("_", "."))
            drs = ", DRS available" if g < 1.0 else ""
            return (f"Gap to car ahead is {g:g} seconds{drs}.", f"앞차와의 갭은 {g:g}초입니다.")
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
            laps_needed = math.ceil(max(gap - 0.5, 0.1) / closing)  # within DRS range
            if rem is not None and laps_needed > rem:
                keys.append("qa_catch_never")
            else:
                keys.append(f"qa_catch_laps_{_clamp(laps_needed, 1, 30)}")
            details.append(f"Closing {closing:.2f}s/lap → DRS range in {laps_needed} laps")
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
        keys.append("qa_tip_drs")
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
    corner = snap.get("worst_corner")  # {"turn": n, "diff_m": +late/-early}
    if corner and 1 <= corner["turn"] <= 16 and abs(corner["diff_m"]) >= 5:
        m = _clamp(int(round(abs(corner["diff_m"]))), 1, 40)
        keys.append(f"qa_turn_{corner['turn']}")
        keys.append(f"brake_{'early' if corner['diff_m'] < 0 else 'late'}_{m}")
        details.append(f"Turn {corner['turn']}: braking {corner['diff_m']:+.0f} m vs best lap")
    return _answer(keys, intent, details=details)
