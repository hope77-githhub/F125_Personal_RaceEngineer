# F1 AI Race Engineer - Red Bull Engineer Voice Script & File Naming Guide

이 문서는 사용자가 직접 음성 생성/녹음(ElevenLabs, Coqui XTTS, 레퍼런스 무전 음성 편집 등)하여 프로그램에 넣을 때 필요한 **정확한 파일명 및 영문 대본(Transcript) 목록**입니다.

---

## 1. 음성 파일 저장 위치 및 기본 규칙

* **저장 폴더**: `backend/data/voice/clips/`
* **파일 포맷**: `.mp3` (권장: 44.1kHz / 48kHz, 128~192kbps)
* **파일명 규칙**: 소문자 및 언더스코어(`_`) 사용, 아래 표의 파일명과 **100% 동일하게 저장**
* **동작 방식**: 
  - 생성한 `.mp3` 파일을 `backend/data/voice/clips/` 폴더에 넣기만 하면 **프로그램 재시작이나 재빌드 없이 즉시 인식**되어 재생됩니다.
  - 아직 생성하지 않은 파일이 있어도 화면에 영문 자막이 정상 표시되며 프로그램 오류가 발생하지 않습니다.

---

## 2. 전체 39개 무전 멘트 대본 및 파일명 목록

### ① 브레이킹 피드백 (Braking Kinematics) — 총 12개
> 코너 진입 시 브레이킹 포인트가 규정치보다 이르거나 늦었을 때 (5m 단위 5m~30m)

| 파일명 | 상황 / 뱃지 | 영문 음성 대본 (Text) |
|---|---|---|
| `brake_early_5m.mp3` | BRAKE -5M | "Braking was about 5 meters early. You can carry slightly more speed on entry." |
| `brake_early_10m.mp3` | BRAKE -10M | "Braked roughly 10 meters early. Entry speed was compromised." |
| `brake_early_15m.mp3` | BRAKE -15M | "That was about 15 meters early on the brakes. We are giving away too much speed on entry." |
| `brake_early_20m.mp3` | BRAKE -20M | "Braking point was 20 meters early. You have plenty of margin to brake later." |
| `brake_early_25m.mp3` | BRAKE -25M | "Braked 25 meters early into the corner. Push that braking marker further." |
| `brake_early_30m.mp3` | BRAKE -30M | "Way too conservative on the brakes, 30 meters early. Commit more on entry." |
| `brake_late_5m.mp3` | BRAKE +5M | "Slightly deep on the brakes, roughly 5 meters late. Apex missed slightly." |
| `brake_late_10m.mp3` | BRAKE +10M | "Braking was 10 meters late. We missed the optimal apex." |
| `brake_late_15m.mp3` | BRAKE +15M | "Braked roughly 15 meters late into the turn. Struggling to rotate the car." |
| `brake_late_20m.mp3` | BRAKE +20M | "That was 20 meters too deep on the brakes. Front tyres scrubbed wide." |
| `brake_late_25m.mp3` | BRAKE +25M | "25 meters late on the brakes. Serious lockup risk, reset your reference marker." |
| `brake_late_30m.mp3` | BRAKE +30M | "Massive overshoot, 30 meters late on the brakes. Bring the braking point back." |

---

### ② 트랙션 및 탈출 가속 피드백 (Traction & Exit Acceleration) — 총 4개
> 코너 탈출 시 스냅(휠스핀), 스로틀 전개 지연, 이전 랩/스틴트 대비 트랙션 저하 피드백

| 파일명 | 상황 / 뱃지 | 영문 음성 대본 (Text) |
|---|---|---|
| `traction_prev_lap.mp3` | TRACTION DROP | "Exit traction was down compared to last lap. Modulate the throttle smoother on exit." |
| `traction_snap_wheelspin.mp3` | REAR WHEELSPIN | "Noticeable rear slip and wheelspin on exit. Be gentle on the kerbs on throttle application." |
| `traction_stint_drop.mp3` | STINT REAR DEG | "We are losing exit traction throughout this stint. Rear tyres are overheating, manage throttle." |
| `traction_delayed_throttle.mp3` | DELAYED THROTTLE | "Throttle pickup was delayed on exit. Trust the rear grip and get on power earlier." |

---

### ③ 타이어 마모도 컴파운드별 & 피트인 지시 (Tyre Deg & Box) — 총 8개
> Soft / Medium / Hard 별 랩당 마모율 5% 초과(High Deg), 10% 초과(Critical Deg) 및 Box 윈도우

| 파일명 | 상황 / 뱃지 | 영문 음성 대본 (Text) |
|---|---|---|
| `tyre_soft_deg_5pct.mp3` | SOFT DEG > 5% | "Soft tyre degradation is high, over 5 percent per lap. Protect the rear traction." |
| `tyre_soft_deg_10pct.mp3` | SOFT CRITICAL | "Critical degradation on the Softs, dropping 10 percent a lap. Tyres are falling off a cliff." |
| `tyre_med_deg_5pct.mp3` | MED DEG > 5% | "Degradation on the Medium is higher than expected, roughly 5 percent a lap. Manage high speed loads." |
| `tyre_med_deg_10pct.mp3` | MED CRITICAL | "Severe degradation on Mediums, nearly 10 percent a lap. We cannot sustain this stint." |
| `tyre_hard_deg_5pct.mp3` | HARD DEG > 5% | "Hard tyre wear is running at 5 percent per lap. We need to nurse them to hit our target lap." |
| `tyre_hard_deg_10pct.mp3` | HARD CRITICAL | "Hard tyres are tearing up, 10 percent wear per lap. Prepare for an emergency stop." |
| `box_window_open.mp3` | PIT WINDOW | "Box window is open, Max. Standby for the pit call." |
| `box_this_lap.mp3` | BOX THIS LAP | "Box this lap, Max. Box this lap. Confirm we are boxing." |

---

### ④ 페이스 델타 트래킹 및 1초 저하 피트인 지시 (Pace Delta) — 총 4개
> 이전 랩 대비 랩타임 델타 추이 및 1.0초 이상 페이스 저하 시 긴급 피트인 지시

| 파일명 | 상황 / 뱃지 | 영문 음성 대본 (Text) |
|---|---|---|
| `pace_green.mp3` | DELTA -0.2S | "Pace is very strong, delta is negative two tenths. Keep this rhythm." |
| `pace_drop_half_sec.mp3` | DELTA +0.5S | "Pace dropped by roughly half a second compared to last lap. Watch the mid-corner rotation." |
| `pace_drop_1sec_box.mp3` | DELTA +1.0S BOX | "Pace has dropped over a full second compared to last lap. Tyres are finished, box this lap for fresh rubber." |
| `pace_drop_severe_box.mp3` | DELTA +1.2S BOX | "Delta is plus 1.2 seconds, we are bleeding too much lap time. Box this lap, box this lap." |

---

### ⑤ 라이벌 간격 피드백 (Rival Gap: Ahead, Leader, Teammate) — 총 10개
> 앞차(Ahead), 선두(Leader), 팀메이트(Teammate)와의 초 단위 간격 피드백

| 파일명 | 상황 / 뱃지 | 영문 음성 대본 (Text) |
|---|---|---|
| `gap_ahead_drs.mp3` | AHEAD < 1.0S | "Gap to car ahead is under a second. DRS is available, push now." |
| `gap_ahead_1_5s.mp3` | AHEAD 1.5S | "Gap to car ahead is roughly 1.5 seconds. You are closing by two tenths a lap." |
| `gap_ahead_2s.mp3` | AHEAD 2.0S | "Gap to car ahead is 2 seconds. Keep chipping away." |
| `gap_ahead_3s.mp3` | AHEAD 3.0S | "Gap to car ahead is 3 seconds. Clean air ahead, build the tyre delta." |
| `gap_ahead_5s.mp3` | AHEAD 5.0S | "Gap to car ahead is 5 seconds. Focus on your own delta." |
| `gap_leader_3s.mp3` | LEADER 3.0S | "Gap to the leader is roughly 3 seconds. Your pace is matching." |
| `gap_leader_5s.mp3` | LEADER 5.0S | "Gap to the leader is 5 seconds. Managing the gap well." |
| `gap_leader_10s.mp3` | LEADER 10.0S | "Gap to the leader is 10 seconds. We are running in clean air." |
| `gap_teammate_2s.mp3` | TEAMMATE 2.0S | "Gap to your teammate is 2 seconds. Maintaining position." |
| `gap_teammate_5s.mp3` | TEAMMATE 5.0S | "Teammate is 5 seconds behind. No pressure from behind." |

---

### ⑥ 시스템 무전 체크 (System Check) — 총 1개

| 파일명 | 상황 / 뱃지 | 영문 음성 대본 (Text) |
|---|---|---|
| `radio_check.mp3` | RADIO CHECK | "Radio check, Max. Telemetry stream is active, tyres looking good." |

---

## 3. (참고) 모듈형 음성 조합 조각 (실시간 동적 텔레메트리용)
실시간 주행 중 정확한 실측값(예: -13.4m, 1.4초 등)을 부드럽게 조합하기 위해 조각 음성을 넣으실 경우, 아래 폴더에 넣어주시면 됩니다:
- **접두사**: `backend/data/voice/segments/prefixes/`
  - `brake_early.mp3`: "Braking was about"
  - `brake_late.mp3`: "Braking was roughly"
  - `gap_ahead.mp3`: "Gap to car ahead is"
  - `gap_leader.mp3`: "Gap to the leader is"
  - `gap_teammate.mp3`: "Gap to your teammate is"
  - `pace_drop.mp3`: "Pace dropped by"
- **접미사**: `backend/data/voice/segments/suffixes/`
  - `meters_early_entry.mp3`: "meters early on entry."
  - `meters_late_apex.mp3`: "meters late into the apex."
  - `seconds_drs.mp3`: "seconds, DRS available."
  - `seconds.mp3`: "seconds."
  - `drop_box_this_lap.mp3`: "seconds. Tyres are finished, box this lap!"
- **숫자**: `backend/data/voice/segments/numbers/`
  - 정수: `5.mp3`, `10.mp3`, `15.mp3`, `20.mp3`, `25.mp3`, `30.mp3` 등
  - 소수점: `0_2.mp3` ("zero point two"), `1_0.mp3`, `1_5.mp3`, `2_0.mp3` 등
