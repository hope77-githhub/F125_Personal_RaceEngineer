# 엔지니어 무전 문구 목록

> 이 문서는 `python tools/gen_voice_lines_md.py`로 자동 생성됩니다. 문구를 고칠 때는 아래 원본을 고친 뒤 다시 생성하세요.
> 원본: `backend/data/voice/manifest.json` · `modular_rules.json` · `backend/state_mgmt/engineer_brain.py` · `manager.py`

음성은 모두 미리 만들어 둔 mp3입니다(실시간 TTS 아님). 현재 음성은 Red Bull 엔지니어 한 명뿐입니다.

## 1. 언제 무엇을 말하나

무전과 무전 사이는 최소 6초 간격입니다. 같은 조건은 한 번만 말합니다(조건마다 랩당/세션당).

| 세션 | 켜지는 무전 |
|---|---|
| practice | 코너 브레이킹, 랩 페이스, 탈출 트랙션, 타이어 마모, 셋업 조언 |
| qualifying | 코너 브레이킹, 랩 페이스 |
| race | 코너 브레이킹, 랩 페이스, 페이스 급락 피트 콜, 탈출 트랙션, 타이어 마모, 피트 창/피트인, 앞차 갭 |

| 무전 | 나오는 조건 |
|---|---|
| 라디오 체크 | 세션 시작 시 1회 |
| 코너 브레이킹 | 코너 탈출 지점 +15 m를 지날 때, 이번 세션 가장 빠른 랩과 그 코너 브레이킹 지점을 비교. 차이가 5~45 m(레이스는 10~45 m)일 때. 코너 정의가 있는 서킷만 |
| 랩 페이스 | 직전 랩 대비 +0.45~1.0초 느림 → 페이스 저하, −0.2~−1.0초 빠름 → 페이스 개선. 레이스에서 +1.0초 이상 → 피트인 콜. SC/VSC·피트 랩은 제외 |
| 탈출 트랙션 | 지난 랩 가장 느린 코너 탈출 속도가 110 km/h 미만. 세션당 1회 |
| 타이어 마모 | 랩당 마모율 5% 이상 / 10% 이상, 장착 컴파운드별 문장 |
| 피트 창 / 피트인 | 가장 많이 닳은 타이어 마모 38% 이상 → 피트 창, 45% 이상 → Box this lap |
| 앞차 갭 | 랩당 1회, 출발선 뒤 150~600 m 구간, 앞차와 10초 이내 |
| 셋업 조언 | 2랩 이후, 150~600 m 구간, 아래 4장 규칙에 맞을 때. 같은 규칙은 4랩에 한 번 |
| 질문 답변 | 대시보드 '엔지니어에게 질문'에서 물어볼 때 |

## 2. 고정 무전 클립 (39개)

`backend/data/voice/clips/`. **자동**은 위 조건에서 실제로 나오는 클립, **—** 는 지금은 자동으로 나오지 않는 클립입니다(코너 브레이킹·갭은 3장의 숫자 문장으로 대체됨).

| 자동 | id | 상황 | 문장 |
|---|---|---|---|
| 자동 | `radio_check` | Session Start & Radio Check | Radio check, Max. Telemetry stream is active, tyres looking good. |
| — | `brake_early_5m` | Early Braking by 5m | Braking was about 5 meters early. You can carry slightly more speed on entry. |
| — | `brake_early_10m` | Early Braking by 10m | Braked roughly 10 meters early. Entry speed was compromised. |
| — | `brake_early_15m` | Early Braking by 15m | That was about 15 meters early on the brakes. We are giving away too much speed on entry. |
| — | `brake_early_20m` | Early Braking by 20m | Braking point was 20 meters early. You have plenty of margin to brake later. |
| — | `brake_early_25m` | Early Braking by 25m | Braked 25 meters early into the corner. Push that braking marker further. |
| — | `brake_early_30m` | Early Braking by 30m | Way too conservative on the brakes, 30 meters early. Commit more on entry. |
| — | `brake_late_5m` | Late Braking by 5m | Slightly deep on the brakes, roughly 5 meters late. Apex missed slightly. |
| — | `brake_late_10m` | Late Braking by 10m | Braking was 10 meters late. We missed the optimal apex. |
| — | `brake_late_15m` | Late Braking by 15m | Braked roughly 15 meters late into the turn. Struggling to rotate the car. |
| — | `brake_late_20m` | Late Braking by 20m | That was 20 meters too deep on the brakes. Front tyres scrubbed wide. |
| — | `brake_late_25m` | Late Braking by 25m | 25 meters late on the brakes. Serious lockup risk, reset your reference marker. |
| — | `brake_late_30m` | Late Braking by 30m | Massive overshoot, 30 meters late on the brakes. Bring the braking point back. |
| 자동 | `traction_prev_lap` | Exit Traction Down vs Previous Lap | Exit traction was down compared to last lap. Modulate the throttle smoother on exit. |
| — | `traction_snap_wheelspin` | Rear Slip & Wheelspin on Exit Kerb | Noticeable rear slip and wheelspin on exit. Be gentle on the kerbs on throttle application. |
| — | `traction_stint_drop` | Stint Cumulative Traction Loss | We are losing exit traction throughout this stint. Rear tyres are overheating, manage throttle. |
| — | `traction_delayed_throttle` | Delayed Throttle Application | Throttle pickup was delayed on exit. Trust the rear grip and get on power earlier. |
| 자동 | `tyre_soft_deg_5pct` | Soft Tyre High Degradation (>5%/lap) | Soft tyre degradation is high, over 5 percent per lap. Protect the rear traction. |
| 자동 | `tyre_soft_deg_10pct` | Soft Tyre Critical Degradation (>10%/lap) | Critical degradation on the Softs, dropping 10 percent a lap. Tyres are falling off a cliff. |
| 자동 | `tyre_med_deg_5pct` | Medium Tyre High Degradation (>5%/lap) | Degradation on the Medium is higher than expected, roughly 5 percent a lap. Manage high speed loads. |
| 자동 | `tyre_med_deg_10pct` | Medium Tyre Critical Degradation (>10%/lap) | Severe degradation on Mediums, nearly 10 percent a lap. We cannot sustain this stint. |
| 자동 | `tyre_hard_deg_5pct` | Hard Tyre High Degradation (>5%/lap) | Hard tyre wear is running at 5 percent per lap. We need to nurse them to hit our target lap. |
| 자동 | `tyre_hard_deg_10pct` | Hard Tyre Critical Degradation (>10%/lap) | Hard tyres are tearing up, 10 percent wear per lap. Prepare for an emergency stop. |
| 자동 | `box_window_open` | Pit Stop Window Open | Box window is open, Max. Standby for the pit call. |
| 자동 | `box_this_lap` | Immediate Pit Call (Box, Box!) | Box this lap, Max. Box this lap. Confirm we are boxing. |
| 자동 | `pace_green` | Pace Improving (-0.2s faster) | Pace is very strong, delta is negative two tenths. Keep this rhythm. |
| 자동 | `pace_drop_half_sec` | Pace Slower (+0.5s drop) | Pace dropped by roughly half a second compared to last lap. Watch the mid-corner rotation. |
| — | `pace_drop_1sec_box` | Severe Pace Loss (>1.0s) -> Urgent Box Call | Pace has dropped over a full second compared to last lap. Tyres are finished, box this lap for fresh rubber. |
| — | `pace_drop_severe_box` | Severe Degradation (>1.2s drop) -> Immediate Box | Delta is plus 1.2 seconds, we are bleeding too much lap time. Box this lap, box this lap. |
| — | `gap_ahead_drs` | Rival Ahead in DRS Range (<1.0s) | Gap to car ahead is under a second. DRS is available, push now. |
| — | `gap_ahead_1_5s` | Rival Ahead 1.5s Interval | Gap to car ahead is roughly 1.5 seconds. You are closing by two tenths a lap. |
| — | `gap_ahead_2s` | Rival Ahead 2.0s Interval | Gap to car ahead is 2 seconds. Keep chipping away. |
| — | `gap_ahead_3s` | Rival Ahead 3.0s Interval | Gap to car ahead is 3 seconds. Clean air ahead, build the tyre delta. |
| — | `gap_ahead_5s` | Rival Ahead 5.0s Interval | Gap to car ahead is 5 seconds. Focus on your own delta. |
| — | `gap_leader_3s` | Gap to Race Leader 3.0s | Gap to the leader is roughly 3 seconds. Your pace is matching. |
| — | `gap_leader_5s` | Gap to Race Leader 5.0s | Gap to the leader is 5 seconds. Managing the gap well. |
| — | `gap_leader_10s` | Gap to Race Leader 10.0s | Gap to the leader is 10 seconds. We are running in clean air. |
| — | `gap_teammate_2s` | Gap to Teammate 2.0s | Gap to your teammate is 2 seconds. Maintaining position. |
| — | `gap_teammate_5s` | Teammate 5.0s Behind | Teammate is 5 seconds behind. No pressure from behind. |

## 3. 숫자가 들어가는 무전

숫자만 바꿔 말하는 문장입니다. 값별로 미리 만든 문장 파일(`phrases/`)이 있으면 그것을, 없으면 앞·숫자·뒤 조각(`segments/`)을 이어 붙여 재생합니다.

| 자동 | 템플릿 | 문장 |
|---|---|---|
| 자동 | `braking_early` | Braking was about {m} meters early on entry. |
| 자동 | `braking_late` | Braking was roughly {m} meters late into the apex. |
| 자동 | `gap_ahead` | Gap to car ahead is {s} seconds. / (1초 미만) Gap to car ahead is {s} seconds, DRS available. |
| — | `gap_leader` | Gap to the leader is {s} seconds. |
| — | `gap_teammate` | Gap to your teammate is {s} seconds. |
| 자동 | `pace_drop_box` | Pace dropped by {s} seconds. Tyres are finished, box this lap! |
| — | `pace_drop_normal` | Pace dropped by {s} seconds. |
| — | `pace_gain` | Pace improved by {s} seconds, strong rhythm. |
| — | `tyre_deg` | Tyre degradation is running at {pct} percent per lap. |

| 값별 문장 파일 (`phrases/`) | 개수 | 값 범위 |
|---|---|---|
| `brake_early_*` | 40 | 1 ~ 40 m |
| `brake_late_*` | 40 | 1 ~ 40 m |
| `gap_ahead_*` | 98 | 0.2 ~ 9.9 초 |
| `pace_drop_*` | 41 | 1 ~ 5 초 |

> `segments/`(앞·숫자·뒤 조각) 폴더는 현재 비어 있습니다. 그래서 위 범위를 벗어난 값(예: 페이스 급락이 범위 최댓값보다 큰 경우)은 자막은 정상으로 표시되지만 음성은 `radio_check` 클립으로 대신 재생됩니다.

## 4. 셋업 조언 (7개)

`backend/data/voice/setup/`. 최근 깨끗한 2랩 평균으로 판단하고, 위에서부터 처음 맞는 규칙 하나만 말합니다. 기준은 `docs/SETUP_GUIDE.md`.

| key | 조건 | 영어 | 한국어 |
|---|---|---|---|
| `setup_tyres_hot` | 4바퀴 표면 온도 평균 > 105 °C | Tyre temperatures are running high. Try dropping all four tyre pressures by zero point four psi. | 타이어 온도가 높습니다. 4바퀴 공기압을 0.4 psi씩 낮춰 보세요. |
| `setup_tyres_cold` | 4바퀴 표면 온도 평균 < 85 °C | Tyres are running cold. Add zero point four psi to bring them into the window. | 타이어가 차갑습니다. 공기압을 0.4 psi 올려 작동 온도로 맞추세요. |
| `setup_fronts_hot` | 앞이 뒤보다 8 °C 이상 높고 앞 > 100 °C | The fronts are overheating. Drop the front pressures by zero point four psi and soften the front anti-roll bar by two. | 앞타이어가 과열됩니다. 앞 공기압 −0.4 psi, 프런트 안티롤바 −2를 권장합니다. |
| `setup_rears_hot` | 뒤가 앞보다 8 °C 이상 높고 뒤 > 100 °C | The rears are overheating on exit. Drop the rear pressures by zero point four psi and take five percent off the on-throttle differential. | 탈출 때 뒤타이어가 과열됩니다. 뒤 공기압 −0.4 psi, On-throttle 디퍼렌셜 −5%를 권장합니다. |
| `setup_front_limited` | 앞 마모율 ≥ 1%/랩이고 뒤의 1.3배 이상 | The car is front limited. Try two clicks more front wing, or soften the front anti-roll bar by two. | 앞타이어가 먼저 닳는 앞 제한 상태입니다. 프런트 윙 +2 또는 프런트 안티롤바 −2를 권장합니다. |
| `setup_rear_limited` | 뒤 마모율 ≥ 1%/랩이고 앞의 1.3배 이상 | The rears are wearing faster than the fronts. Take five percent off the on-throttle differential and add one click of rear wing. | 뒤타이어가 더 빨리 닳습니다. On-throttle 디퍼렌셜 −5%, 리어 윙 +1을 권장합니다. |
| `setup_balance_ok` | 위 조건에 모두 해당하지 않음(질문했을 때만 답함) | The balance looks good. No setup change needed for now. | 밸런스가 좋습니다. 지금은 셋업을 바꿀 필요가 없습니다. |

## 5. 질문 답변

### 5-1. 질문 프리셋과 인식 키워드

질문 문장에 아래 키워드가 들어 있으면 해당 주제로 답합니다(위에서부터 먼저 맞는 것).

| 주제 | 프리셋 질문 (한국어 / English) | 인식 키워드 |
|---|---|---|
| `win` | 1등 하려면 어떻게 해야 해? / How can I win? | 1등, 일등, 우승, 이기, win, p1, first place, victory, lead the race |
| `catch` | 앞차 잡을 수 있어? / Can I catch the car ahead? | 앞차, 추월, 잡, catch, overtake, car ahead, pass him, pass the |
| `time_loss` | 어디서 시간을 잃고 있어? / Where am I losing time? | 어디서, 느려, 손해, 잃, 시간, losing time, where am i, slow, faster, improve |
| `tyres` | 타이어 상태 어때? / How are my tyres? | 타이어, tyre, tire, 마모, wear, 온도, temperature |
| `pit` | 언제 피트인 해야 해? / When should I pit? | 피트, 박스, pit, box, 언제 들어, stop |
| `setup` | 셋업 어떻게 바꿔야 해? / Any setup changes? | 셋업, 세팅, setup, set-up, set up, 밸런스, balance |
| `gap` | 갭 알려줘 / What's the gap? | 갭, 간격, 차이, gap, interval |

### 5-2. 고정 답변 (17개)

| key | 영어 | 한국어 |
|---|---|---|
| `qa_say_again` | Say again, I did not copy. Ask me about pace, tyres, the gap or the setup. | 잘 못 들었습니다. 페이스, 타이어, 갭, 셋업에 대해 물어봐 주세요. |
| `qa_no_data` | Give me one more lap of data and I will have an answer for you. | 한 랩만 더 데이터를 주시면 답해 드리겠습니다. |
| `qa_not_race` | That one is for the race. In this session, focus on your own laps. | 그건 레이스에서 의미 있는 질문입니다. 이번 세션은 본인 랩에 집중하세요. |
| `qa_leading` | You are leading the race. Keep this rhythm and manage the tyres to the flag. | 레이스를 리드하고 있습니다. 이 리듬을 유지하며 타이어를 관리하세요. |
| `qa_no_car_ahead` | There is no car ahead of you. You are leading. | 앞차가 없습니다. 선두입니다. |
| `qa_win_unrealistic` | Winning is not realistic from here. Focus on the car ahead, one place at a time. | 현재로선 우승이 어렵습니다. 한 계단씩, 앞차에 집중하세요. |
| `qa_catch_never` | At this rate we will not catch him before the flag. We need more pace. | 지금 페이스로는 체커 전까지 따라잡기 어렵습니다. 페이스가 더 필요합니다. |
| `qa_sector_faster` | You are faster than him in every sector. | 모든 섹터에서 앞차보다 빠릅니다. |
| `qa_tip_drs` | Stay within one second at the detection point for DRS, and push on the exit of the last corner. | 감지 지점에서 1초 이내를 유지해 DRS를 쓰고, 마지막 코너 탈출에 집중하세요. |
| `qa_tip_older_tyres` | He is on older tyres. Push now while he is struggling. | 앞차 타이어가 더 오래됐습니다. 지금 밀어붙이세요. |
| `qa_lost_nothing` | Last lap was your best lap. Keep doing exactly that. | 지난 랩이 베스트 랩입니다. 그대로 유지하세요. |
| `qa_temps_ok` | Tyre temperatures are in the window. | 타이어 온도는 적정 범위입니다. |
| `qa_temps_fronts_hot` | The fronts are running hot. | 앞타이어 온도가 높습니다. |
| `qa_temps_rears_hot` | The rears are running hot. | 뒤타이어 온도가 높습니다. |
| `qa_temps_cold` | The tyres are running cold. | 타이어가 차갑습니다. |
| `qa_tyres_to_end` | The tyres will make it to the end. No stop needed. | 타이어가 끝까지 버팁니다. 피트스톱이 필요 없습니다. |
| `qa_box_now` | Box this lap, box this lap. The tyres are done. | 이번 랩에 피트인하세요. 타이어가 다 됐습니다. |

### 5-3. 숫자가 들어가는 답변 (357개)

값마다 문장 파일이 따로 있습니다(`backend/data/voice/qa/`). 표에는 첫 값과 마지막 값만 적었습니다.

| 패턴 | 개수 | 값 범위 | 예시 (영어) | 예시 (한국어) |
|---|---|---|---|---|
| `qa_need_tenths_{n}` | 30 | 1 ~ 30 | To win, you need to find one tenth a lap on the leader. … To win, you need to find three seconds a lap on the leader. | 우승하려면 선두보다 랩당 0.1초 빨라야 합니다. … 우승하려면 선두보다 랩당 3.0초 빨라야 합니다. |
| `qa_catch_laps_{n}` | 30 | 1 ~ 30 | At this rate you will be on him next lap. … At this rate you will catch him in thirty laps. | 지금 페이스면 1랩 안에 따라잡습니다. … 지금 페이스면 30랩 안에 따라잡습니다. |
| `qa_box_in_{n}` | 30 | 1 ~ 30 | We are looking at boxing next lap. … We are looking at boxing in thirty laps. | 1랩 뒤 피트인을 예상합니다. … 30랩 뒤 피트인을 예상합니다. |
| `qa_closing_{n}` | 20 | 1 ~ 20 | You are closing by one tenth a lap. … You are closing by two seconds a lap. | 랩당 0.1초씩 좁히고 있습니다. … 랩당 2.0초씩 좁히고 있습니다. |
| `qa_pulling_{n}` | 20 | 1 ~ 20 | He is pulling away by one tenth a lap. … He is pulling away by two seconds a lap. | 앞차가 랩당 0.1초씩 멀어지고 있습니다. … 앞차가 랩당 2.0초씩 멀어지고 있습니다. |
| `qa_lost_s1_{n}` | 20 | 1 ~ 20 | Last lap you lost one tenth in sector one. … Last lap you lost two seconds in sector one. | 지난 랩 섹터 1에서 0.1초 잃었습니다. … 지난 랩 섹터 1에서 2.0초 잃었습니다. |
| `qa_lost_s2_{n}` | 20 | 1 ~ 20 | Last lap you lost one tenth in sector two. … Last lap you lost two seconds in sector two. | 지난 랩 섹터 2에서 0.1초 잃었습니다. … 지난 랩 섹터 2에서 2.0초 잃었습니다. |
| `qa_lost_s3_{n}` | 20 | 1 ~ 20 | Last lap you lost one tenth in sector three. … Last lap you lost two seconds in sector three. | 지난 랩 섹터 3에서 0.1초 잃었습니다. … 지난 랩 섹터 3에서 2.0초 잃었습니다. |
| `qa_sector_lose_{n}` | 3 | 1 ~ 3 | You are losing most time to him in sector one. … You are losing most time to him in sector three. | 앞차에게 섹터 1에서 가장 많이 잃고 있습니다. … 앞차에게 섹터 3에서 가장 많이 잃고 있습니다. |
| `qa_turn_{n}` | 16 | 1 ~ 16 | The biggest loss was at turn one. … The biggest loss was at turn sixteen. | 가장 크게 잃은 곳은 1번 코너입니다. … 가장 크게 잃은 곳은 16번 코너입니다. |
| `qa_tyre_wear_{n}` | 19 | 5 ~ 95 | Tyre wear is five percent on the worst tyre. … Tyre wear is ninety five percent on the worst tyre. | 가장 많이 닳은 타이어 마모는 5%입니다. … 가장 많이 닳은 타이어 마모는 95%입니다. |
| `gap_leader_{n}` | 129 | 0.2 ~ 40.0 | Gap to the leader is zero point two seconds. … Gap to the leader is forty seconds. | 선두와의 갭은 0.2초입니다. … 선두와의 갭은 40초입니다. |

답변에는 3장의 브레이킹·갭 문장도 섞여 나옵니다(예: "가장 크게 잃은 곳은 5번 코너" + "브레이킹이 약 12m 늦었습니다").

## 6. 파일 위치

| 폴더 | 파일 수 | 내용 |
|---|---|---|
| `backend/data/voice/clips/` | 39 | 2장 고정 무전 |
| `backend/data/voice/phrases/` | 219 | 3장 값별 문장 |
| `backend/data/voice/segments/` | 0 | 3장 이어 붙이기용 조각 (하위 폴더) |
| `backend/data/voice/setup/` | 7 | 4장 셋업 조언 |
| `backend/data/voice/qa/` | 374 | 5장 질문 답변 |
| `backend/data/voice/reference/` | 5 | 음성 학습용 원본 목소리 |
