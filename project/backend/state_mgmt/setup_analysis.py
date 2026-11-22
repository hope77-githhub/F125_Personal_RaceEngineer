"""
Practice setup analysis: where our best lap loses to the fastest car of the session (FP ranking), and which
setup changes should close the gap. Rules and thresholds: docs/SETUP_GUIDE.md section 5 (keep both in sync).

Compared on the two best laps (ours vs the reference car), corner by corner on our own corner map:
  * top speed (speed trap: highest speed of the lap)
  * apex speed (slowest point) and exit speed, per corner class by the reference car's apex speed:
      slow < 120 km/h, medium 120-200, fast >= 200
  * braking point (first brake input before the apex) - a driving note, not a setup change
plus our own tyres over the last 2 clean laps (surface temperature and wear per lap, front vs rear).

Each rule adds setup deltas (wing clicks, psi, %, anti-roll bar); deltas on the same item are summed and
clamped to the game's range, then shown as "current -> suggested" with the reason behind them.
Tyre order everywhere: RL, RR, FL, FR (as in the UDP packets).
"""
from state_mgmt import engineer_brain as brain

SLOW, FAST = 120, 200            # km/h apex speed of the reference car: slow < 120 <= medium < 200 <= fast
TOP_SPEED_DIFF = 5               # km/h: clearly faster / slower on the straights
CORNER_LOSS = 3                  # km/h: clearly slower through the corners
TRACTION_LOSS = 4                # km/h: exit speed loss that is bigger than the apex loss = traction
BRAKE_EARLY_M = 10               # m: braking this much earlier on average is worth a note
TEMP_HIGH, TEMP_LOW, TEMP_SPLIT = 105, 85, 5   # °C surface window and front/rear imbalance

# setup field -> (label, unit, min, max)
FIELDS = {
    "m_frontWing": ("Front wing", "", 0, 50),
    "m_rearWing": ("Rear wing", "", 0, 50),
    "m_onThrottle": ("On-throttle diff", "%", 10, 100),
    "m_frontAntiRollBar": ("Front ARB", "", 1, 21),
    "m_rearAntiRollBar": ("Rear ARB", "", 1, 21),
    "m_frontLeftTyrePressure": ("FL psi", "", 22.5, 29.5),
    "m_frontRightTyrePressure": ("FR psi", "", 22.5, 29.5),
    "m_rearLeftTyrePressure": ("RL psi", "", 20.5, 26.5),
    "m_rearRightTyrePressure": ("RR psi", "", 20.5, 26.5),
}
FRONT_PSI = ("m_frontLeftTyrePressure", "m_frontRightTyrePressure")
REAR_PSI = ("m_rearLeftTyrePressure", "m_rearRightTyrePressure")


def _avg(xs):
    xs = [x for x in xs if x is not None]
    return sum(xs) / len(xs) if xs else None


def _nearest(points, dist):
    return min(points, key=lambda p: abs(p.get("distance_m", 0) - dist)) if points else None


def lap_profile(points, corners):
    """Telemetry samples of one lap + corner map -> top speed and per-corner entry/apex/exit speed, brake point."""
    pts = [p for p in (points or []) if p.get("distance_m", -1) >= 0]
    if len(pts) < 30:
        return None
    out = {"vmax": max(p.get("speed", 0) for p in pts), "corners": {}}
    for c in corners or []:
        try:
            entry, apex, exit_ = float(c["nom_entry_dist"]), float(c["nom_apex_dist"]), float(c["nom_exit_dist"])
        except (KeyError, TypeError, ValueError):
            continue
        if not entry <= apex <= exit_:
            continue
        seg = [p for p in pts if entry - 15 <= p["distance_m"] <= exit_ + 15]
        if len(seg) < 2:
            continue
        apex_pt = min(seg, key=lambda p: p.get("speed", 999))
        brake = [p for p in pts if entry - 150 <= p["distance_m"] <= apex_pt["distance_m"] and p.get("brake", 0) > 5]
        out["corners"][c.get("turn")] = {
            "apex": apex_pt.get("speed", 0),
            "exit": _nearest(pts, exit_).get("speed", 0),
            "brake_m": brake[0]["distance_m"] if brake else None,
        }
    return out


def compare(you, ref):
    """Our lap profile vs the reference car's -> deltas (+ = we are faster / later on the brakes)."""
    classes = {"slow": [], "medium": [], "fast": []}
    brakes = []
    for turn, r in ref["corners"].items():
        y = you["corners"].get(turn)
        if not y or not r["apex"]:
            continue
        cls = "slow" if r["apex"] < SLOW else "fast" if r["apex"] >= FAST else "medium"
        classes[cls].append({"turn": turn, "apex": y["apex"] - r["apex"], "exit": y["exit"] - r["exit"]})
        if y["brake_m"] is not None and r["brake_m"] is not None and abs(y["brake_m"] - r["brake_m"]) < 80:
            brakes.append(y["brake_m"] - r["brake_m"])
    by_class = {k: {"n": len(v), "apex": _avg([c["apex"] for c in v]), "exit": _avg([c["exit"] for c in v]),
                    "turns": [c["turn"] for c in v]}
                for k, v in classes.items()}
    worst = min((c for v in classes.values() for c in v), key=lambda c: c["apex"], default=None)
    return {"vmax": you["vmax"] - ref["vmax"], "classes": by_class,
            "brake_m": _avg(brakes) if len(brakes) >= 3 else None, "worst_corner": worst}


def _text(en, ko):
    return {"en": en, "ko": ko}


def analyze(you_lap, ref_lap, tyres, setup, corners, ranking=None):
    """
    you_lap / ref_lap: {"time_ms", "telemetry_points", "lap"} best laps (ref_lap None: nobody to compare with)
    tyres: engineer_brain.tyre_state(our clean laps) or None (fewer than 2 clean laps)
    setup: our setup dict (m_frontWing ...), corners: corner map with nom_entry/apex/exit_dist
    -> {"items": [{area, status, title, why, changes}], "changes": [...], "metrics": {...}, ...}
    """
    deltas, items = {}, []

    def add(field, d):
        deltas[field] = deltas.get(field, 0) + d

    # ---- 1. tyre pressures: our own surface temperatures (no comparison needed)
    if tyres:
        f, r, a = tyres["front_t"], tyres["rear_t"], tyres["all_t"]
        temps = _text(f"Surface F {f:.0f}°C / R {r:.0f}°C (window {TEMP_LOW}-{TEMP_HIGH}°C)",
                      f"표면 온도 앞 {f:.0f}°C / 뒤 {r:.0f}°C (작동 창 {TEMP_LOW}~{TEMP_HIGH}°C)")
        if a > TEMP_HIGH:
            for k in FRONT_PSI + REAR_PSI:
                add(k, -0.4)
            items.append({"area": "tyres", "status": "change", "title": _text("Tyre pressures", "타이어 공기압"),
                          "why": _text("All four tyres run above the window: lower pressure cools them and widens the contact patch.",
                                       "4바퀴 모두 작동 창보다 뜨겁습니다. 공기압을 낮추면 온도가 내려가고 접지면이 넓어집니다."),
                          "evidence": temps})
        elif a < TEMP_LOW:
            for k in FRONT_PSI + REAR_PSI:
                add(k, 0.4)
            items.append({"area": "tyres", "status": "change", "title": _text("Tyre pressures", "타이어 공기압"),
                          "why": _text("The tyres are below the window: more pressure brings them up to temperature.",
                                       "타이어가 작동 창보다 차갑습니다. 공기압을 올리면 빨리 데워집니다."),
                          "evidence": temps})
        elif f - r >= TEMP_SPLIT + 3 and f > 100:
            for k in FRONT_PSI:
                add(k, -0.4)
            items.append({"area": "tyres", "status": "change", "title": _text("Tyre pressures", "타이어 공기압"),
                          "why": _text("The fronts run much hotter than the rears: drop the front pressures.",
                                       "앞타이어가 뒤보다 훨씬 뜨겁습니다. 앞 공기압을 낮추세요."),
                          "evidence": temps})
        elif r - f >= TEMP_SPLIT + 3 and r > 100:
            for k in REAR_PSI:
                add(k, -0.4)
            items.append({"area": "tyres", "status": "change", "title": _text("Tyre pressures", "타이어 공기압"),
                          "why": _text("The rears run much hotter than the fronts: drop the rear pressures.",
                                       "뒤타이어가 앞보다 훨씬 뜨겁습니다. 뒤 공기압을 낮추세요."),
                          "evidence": temps})
        else:
            items.append({"area": "tyres", "status": "ok", "title": _text("Tyre pressures", "타이어 공기압"),
                          "why": _text("Temperatures are in the window. Keep the pressures.",
                                       "온도가 작동 창 안에 있습니다. 공기압은 그대로 두세요."),
                          "evidence": temps})
    else:
        items.append({"area": "tyres", "status": "wait", "title": _text("Tyre pressures", "타이어 공기압"),
                      "why": _text("Needs 2 clean laps of tyre data.", "타이어 데이터가 깨끗한 랩 2개 필요합니다."),
                      "evidence": None})

    you = lap_profile((you_lap or {}).get("telemetry_points"), corners) if you_lap else None
    ref = lap_profile((ref_lap or {}).get("telemetry_points"), corners) if ref_lap else None
    cmp_ = compare(you, ref) if you and ref else None
    metrics = None
    if cmp_:
        cl = cmp_["classes"]
        # corner speed in medium + fast corners (aero), fast corners counted twice
        aero_loss = _avg([cl["medium"]["apex"]] + [cl["fast"]["apex"]] * 2) if (cl["medium"]["n"] + cl["fast"]["n"]) >= 2 else None
        dv = cmp_["vmax"]
        metrics = {"vmax": [you["vmax"], ref["vmax"], dv], "classes": cl, "brake_m": cmp_["brake_m"],
                   "worst_corner": cmp_["worst_corner"], "aero_loss": aero_loss}
        ev = _text(f"Top speed {dv:+.0f} km/h, medium/fast corner apex {aero_loss:+.1f} km/h vs the reference"
                   if aero_loss is not None else f"Top speed {dv:+.0f} km/h vs the reference",
                   f"기준 차 대비 최고 속도 {dv:+.0f} km/h, 중·고속 코너 에이펙스 {aero_loss:+.1f} km/h"
                   if aero_loss is not None else f"기준 차 대비 최고 속도 {dv:+.0f} km/h")

        # ---- 2. downforce level (both wings): straights vs medium/fast corners
        if aero_loss is not None and dv >= TOP_SPEED_DIFF and aero_loss <= -CORNER_LOSS:
            add("m_frontWing", 2)
            add("m_rearWing", 2)
            items.append({"area": "aero", "rule": "more_downforce", "status": "change", "title": _text("Wings (downforce)", "윙 (다운포스)"),
                          "why": _text("Faster on the straights but slower through the medium and fast corners: trade some top speed for grip.",
                                       "직선은 더 빠른데 중·고속 코너에서 느립니다. 최고 속도를 조금 내주고 코너 그립을 얻으세요."),
                          "evidence": ev})
        elif aero_loss is not None and dv <= -TOP_SPEED_DIFF and aero_loss >= -1:
            add("m_frontWing", -2)
            add("m_rearWing", -2)
            items.append({"area": "aero", "rule": "less_downforce", "status": "change", "title": _text("Wings (downforce)", "윙 (다운포스)"),
                          "why": _text("As quick through the corners but slower on the straights: you have downforce to spare.",
                                       "코너는 비슷하게 빠른데 직선이 느립니다. 다운포스가 남으니 윙을 줄이세요."),
                          "evidence": ev})
        elif aero_loss is not None and dv <= -TOP_SPEED_DIFF and aero_loss <= -CORNER_LOSS:
            items.append({"area": "aero", "status": "ok", "title": _text("Wings (downforce)", "윙 (다운포스)"),
                          "why": _text("Slower on the straights and in the corners: not a wing problem. Check tyre temperatures and your lines first.",
                                       "직선과 코너 모두 느립니다. 윙 문제가 아니니 타이어 온도와 주행 라인을 먼저 보세요."),
                          "evidence": ev})
        else:
            items.append({"area": "aero", "status": "ok", "title": _text("Wings (downforce)", "윙 (다운포스)"),
                          "why": _text("Straight-line and corner speed are balanced against the reference. Keep the wing level.",
                                       "직선과 코너 속도가 기준 차와 균형이 맞습니다. 윙 수준은 그대로 두세요."),
                          "evidence": ev})
    else:
        items.append({"area": "aero", "status": "wait", "title": _text("Wings (downforce)", "윙 (다운포스)"),
                      "why": _text("Needs a timed lap from you and from another car.", "내 랩과 다른 차의 기록 랩이 필요합니다."),
                      "evidence": None})

    # ---- 3. balance (front vs rear grip) and 4. traction: tyres + where in the corner speed is lost
    under, over, reasons_u, reasons_o = 0, 0, [], []
    if tyres:
        if tyres["front_t"] - tyres["rear_t"] >= TEMP_SPLIT:
            under += 1
            reasons_u.append(_text(f"fronts {tyres['front_t'] - tyres['rear_t']:.0f}°C hotter than the rears",
                                   f"앞타이어가 뒤보다 {tyres['front_t'] - tyres['rear_t']:.0f}°C 뜨거움"))
        if tyres["rear_t"] - tyres["front_t"] >= TEMP_SPLIT:
            over += 1
            reasons_o.append(_text(f"rears {tyres['rear_t'] - tyres['front_t']:.0f}°C hotter than the fronts",
                                   f"뒤타이어가 앞보다 {tyres['rear_t'] - tyres['front_t']:.0f}°C 뜨거움"))
        fr, rr = tyres["front_rate"] or 0, tyres["rear_rate"] or 0
        if fr >= 0.8 and fr >= 1.3 * max(rr, 0.01):
            under += 1
            reasons_u.append(_text(f"front wear {fr:.1f}%/lap vs rear {rr:.1f}%", f"앞 마모 랩당 {fr:.1f}% (뒤 {rr:.1f}%)"))
        if rr >= 0.8 and rr >= 1.3 * max(fr, 0.01):
            over += 1
            reasons_o.append(_text(f"rear wear {rr:.1f}%/lap vs front {fr:.1f}%", f"뒤 마모 랩당 {rr:.1f}% (앞 {fr:.1f}%)"))
    traction = None
    if cmp_:
        med, slow = cmp_["classes"]["medium"], cmp_["classes"]["slow"]
        if med["n"] >= 2 and med["apex"] <= -CORNER_LOSS and (med["exit"] or 0) - med["apex"] >= 2:
            under += 1
            reasons_u.append(_text(f"medium corners: apex {med['apex']:+.1f} km/h, exit {med['exit']:+.1f} km/h",
                                   f"중속 코너 에이펙스 {med['apex']:+.1f} km/h, 탈출 {med['exit']:+.1f} km/h"))
        if slow["n"] >= 2 and slow["exit"] is not None and slow["exit"] <= -TRACTION_LOSS and slow["exit"] - slow["apex"] <= -2:
            traction = slow
            over += 1
            reasons_o.append(_text(f"slow corners: exit {slow['exit']:+.1f} km/h, apex {slow['apex']:+.1f} km/h",
                                   f"저속 코너 탈출 {slow['exit']:+.1f} km/h, 에이펙스 {slow['apex']:+.1f} km/h"))
    join = lambda rs, k: ", ".join(r[k] for r in rs)   # noqa: E731
    if under >= 2 and under > over:
        add("m_frontWing", 2)
        add("m_frontAntiRollBar", -2)
        items.append({"area": "balance", "rule": "understeer", "status": "change", "title": _text("Balance (understeer)", "밸런스 (언더스티어)"),
                      "why": _text("The front runs out of grip first: more front wing and a softer front anti-roll bar.",
                                   "앞 그립이 먼저 부족합니다. 프런트 윙을 올리고 프런트 안티롤바를 부드럽게 하세요."),
                      "evidence": _text(join(reasons_u, "en"), join(reasons_u, "ko"))})
    elif over >= 2 and over > under:
        add("m_rearWing", 1)
        add("m_rearAntiRollBar", -1)
        items.append({"area": "balance", "rule": "oversteer", "status": "change", "title": _text("Balance (oversteer)", "밸런스 (오버스티어)"),
                      "why": _text("The rear runs out of grip first: a click more rear wing and a softer rear anti-roll bar.",
                                   "뒤 그립이 먼저 부족합니다. 리어 윙을 1클릭 올리고 리어 안티롤바를 부드럽게 하세요."),
                      "evidence": _text(join(reasons_o, "en"), join(reasons_o, "ko"))})
    elif tyres or cmp_:
        ev = reasons_u + reasons_o
        items.append({"area": "balance", "status": "ok", "title": _text("Balance", "밸런스"),
                      "why": _text("No clear understeer or oversteer pattern. Keep the balance.",
                                   "언더·오버스티어 경향이 뚜렷하지 않습니다. 밸런스는 그대로 두세요."),
                      "evidence": _text(join(ev, "en"), join(ev, "ko")) if ev else None})
    if traction:
        add("m_onThrottle", -5)
        items.append({"area": "traction", "rule": "traction", "status": "change", "title": _text("Traction (differential)", "트랙션 (디퍼렌셜)"),
                      "why": _text("You reach the apex of slow corners fine but come out slower: open the on-throttle differential to cut wheelspin.",
                                   "저속 코너 에이펙스까지는 괜찮은데 탈출이 느립니다. On-throttle 디퍼렌셜을 낮춰 휠스핀을 줄이세요."),
                      "evidence": _text(f"Slow-corner exit {traction['exit']:+.1f} km/h vs the reference",
                                        f"기준 차 대비 저속 코너 탈출 {traction['exit']:+.1f} km/h")})

    # ---- 5. braking: a driving note
    if cmp_ and cmp_["brake_m"] is not None and cmp_["brake_m"] <= -BRAKE_EARLY_M:
        items.append({"area": "driving", "status": "note", "title": _text("Braking", "브레이킹"),
                      "why": _text("You brake earlier than the reference car on average. That is driving, not setup: try braking later.",
                                   "기준 차보다 평균적으로 일찍 브레이크를 밟습니다. 셋업이 아니라 주행 문제이니 조금 늦게 밟아 보세요."),
                      "evidence": _text(f"Braking point {-cmp_['brake_m']:.0f} m earlier on average",
                                        f"브레이킹 지점이 평균 {-cmp_['brake_m']:.0f}m 이릅니다")})

    changes = []
    for field, d in deltas.items():
        if abs(d) < 1e-9:
            continue
        label, unit, lo, hi = FIELDS[field]
        cur = (setup or {}).get(field)
        if cur is not None:
            new = min(hi, max(lo, round(cur + d, 2)))
            if new == cur:
                continue
            changes.append({"field": field, "label": label, "current": cur, "suggested": new, "delta": round(new - cur, 2),
                            "text": brain._fmt_change(setup, field, new - cur, label, unit)})
        else:
            changes.append({"field": field, "label": label, "current": None, "suggested": None, "delta": round(d, 2),
                            "text": f"{label} {d:+g}{unit}"})

    return {"items": items, "changes": changes, "metrics": metrics, "ranking": ranking,
            "you_lap": (you_lap or {}).get("lap"), "ref_lap": (ref_lap or {}).get("lap")}
