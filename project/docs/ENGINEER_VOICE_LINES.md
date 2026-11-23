# 엔지니어 무전 문구 목록

> 이 문서는 `python tools/gen_voice_lines_md.py`로 자동 생성됩니다. 문구를 고칠 때는 아래 원본을 고친 뒤 다시 생성하세요.
> 원본: `backend/data/voice/manifest.json` · `modular_rules.json` · `backend/state_mgmt/engineer_brain.py` · `manager.py`

음성은 모두 미리 만들어 둔 mp3입니다(실시간 TTS 아님). 현재 음성은 Red Bull 엔지니어 한 명뿐입니다.

## 1. 언제 무엇을 말하나

무전과 무전 사이는 최소 6초 간격입니다. 같은 조건은 한 번만 말합니다(조건마다 랩당/세션당). 타임 트라이얼은 퀄리파잉과 같은 무전을 씁니다.

| 세션 | 켜지는 무전 |
|---|---|
| practice | 랩 디브리프(잃은 시간·섹터·코너·원인), 셋업 조언, 롱런 타이어 수명, 타이어 마모 |
| qualifying | 랩 디브리프(잃은 시간·섹터·코너·원인) |
| race | 레이스 전 셋업 브리핑, 랩 페이스(급락 피트 콜·시간 잃은 코너), 타이어 마모, 피트 창/피트인, 앞차 갭, 랩당 타이어 마모·전략 |

| 무전 | 나오는 조건 |
|---|---|
| 라디오 체크 | 세션 시작 시 1회 |
| 랩 디브리프 (프랙티스) | 깨끗한 랩(피트·SC 제외, 베스트의 107% 이내)을 마친 뒤 다음 랩 150~1200 m에서 1회. 베스트 랩보다 0.4초 이상 느리거나 한 섹터에서 0.3초 이상 잃었을 때만: 몇 초 느렸는지 + 가장 많이 잃은 코너 + 원인. 개인 베스트면 '베스트 랩' + 현재 타임시트 순위. 첫 기록 랩은 타임시트 순위만. 트랙 리밋으로 삭제된 랩은 베스트가 될 뻔했을 때만 '랩 삭제' |
| 랩 디브리프 (퀄리파잉) | 매 푸시 랩 뒤 같은 구간에서 1회: 베스트면 '베스트 랩', 0.1초 이내면 '베스트 페이스', 아니면 몇 초 느렸는지 + 가장 많이 잃은 섹터(0.1초 이상) + 코너 + 원인. 같은 코너가 직전 랩에 이어 또 가장 많이 잃으면 '그 코너에 집중하세요'. 첫 푸시 랩과 베스트 랩 뒤에는 순위 + 1위와의 차이. 삭제된 랩은 '랩 삭제'(트랙 리밋) |
| 삭제된 랩 (트랙 리밋) | 랩 도중 게임이 랩을 무효로 표시하면 그 랩은 베스트·비교 기준에서 빠짐 |
| 시간 잃은 코너 찾기 | 두 랩의 거리별 시간 차이를 코너마다 나눔(코너는 앞 코너 에이펙스와의 중간부터 다음 코너 에이펙스와의 중간까지, 킹크는 앞 코너에 포함). 0.1초 이상 잃은 코너만 이름을 말함. 원인: 브레이킹 지점 8 m 이상 늦음/이름, 아니면 코너 최저 속도 4 km/h 이상 낮음, 아니면 탈출 속도 4 km/h 이상 낮음. 공식 코너 정의가 있는 24개 서킷은 공식 턴 번호, 리버스 3개·마드리드는 오버레이 TURN 표시와 같은 학습 코너 맵(없으면 첫 깨끗한 랩의 스티어링으로 학습)을 씀 |
| 랩 페이스 (레이스) | 직전 랩 대비 +1.0~3.0초 → 피트인 콜(3초 이상은 스핀·사고로 보고 말하지 않음), +0.45~1.0초 → 시간 잃은 코너와 원인(0.15초 이상일 때, 없으면 페이스 저하 무전), −0.2~−1.0초 → 페이스 개선. SC/VSC·피트 랩은 제외 |
| 타이어 마모 | 랩당 마모율 5% 이상 / 10% 이상, 장착 컴파운드별 문장(소프트·미디엄·하드·인터·풀 웨트) |
| 피트 창 / 피트인 | 가장 많이 닳은 타이어 마모 38% 이상 → 피트 창, 45% 이상 → Box this lap |
| 앞차 갭 | 랩당 1회, 출발선 뒤 150~600 m 구간, 앞차와 10초 이내 |
| 셋업 조언 (프랙티스) | 2랩 이후, 150~3000 m 구간(디브리프 다음), 랩당 최대 1회. 타이어 온도·마모 규칙 먼저, 그다음 가장 빠른 차와의 비교(다운포스·밸런스·트랙션, 4장). 같은 조언은 4랩에 한 번 |
| 롱런 타이어 수명 (프랙티스) | 같은 세트로 3랩 이상, 3랩마다 1회: 랩당 마모율 + 이 마모율이면 몇 랩 버티는지(45%까지, 5~40랩, 그 밖은 '40랩 넘게' / '5랩도 못 버팀') |
| 레이스 전 셋업 브리핑 | 레이스 세션, 라디오 체크 다음, 출발 전(1랩·랩 타이머 0)에 1회. 트랙 온도·날씨·강수 확률 (6장) |
| 랩당 타이어 마모·전략 | 레이스, 랩마다 출발선 뒤 700~1500 m에서 1회. 이 세트의 랩당 마모율, 피트 윈도우 전에 45%에 닿을 것 같으면 전략 무전을 덧붙임(3랩에 한 번) (6장) |
| 질문 답변 | 대시보드 '엔지니어에게 질문'에서 물어볼 때 |

## 2. 고정 무전 클립 (31개)

`backend/data/voice/clips/`. **자동**은 위 조건에서 실제로 나오는 클립, **—** 는 지금은 자동으로 나오지 않는 클립입니다(갭은 3장의 숫자 문장으로 대체됨).

| 자동 | id | 상황 | 문장 |
|---|---|---|---|
| 자동 | `radio_check` | Session Start & Radio Check | Radio check, Max. Telemetry stream is active, tyres looking good. |
| — | `traction_prev_lap` | Exit Traction Down vs Previous Lap | Exit traction was down compared to last lap. Modulate the throttle smoother on exit. |
| — | `traction_snap_wheelspin` | Rear Slip & Wheelspin on Exit Kerb | Noticeable rear slip and wheelspin on exit. Be gentle on the kerbs on throttle application. |
| — | `traction_stint_drop` | Stint Cumulative Traction Loss | We are losing exit traction throughout this stint. Rear tyres are overheating, manage throttle. |
| — | `traction_delayed_throttle` | Delayed Throttle Application | Throttle pickup was delayed on exit. Trust the rear grip and get on power earlier. |
| 자동 | `tyre_soft_deg_5pct` | Soft Tyre High Degradation (>5%/lap) | Soft tyre degradation is high, over 5 percent per lap. Protect the rear traction. |
| 자동 | `tyre_soft_deg_10pct` | Soft Tyre Critical Degradation (>10%/lap) | Critical degradation on the Softs, dropping 10 percent a lap. Tyres are falling off a cliff. |
| 자동 | `tyre_med_deg_5pct` | Medium Tyre High Degradation (>5%/lap) | Degradation on the Medium is higher than expected, roughly 5 percent a lap. Manage high speed loads. |
| 자동 | `tyre_med_deg_10pct` | Medium Tyre Critical Degradation (>10%/lap) | Severe degradation on Mediums, nearly 10 percent a lap. We cannot sustain this stint. |
| 자동 | `tyre_hard_deg_5pct` | Hard Tyre High Degradation (>5%/lap) | Hard tyre wear is running at 5 percent per lap. We need to nurse them to hit our target lap. |
| 자동 | `tyre_hard_deg_10pct` | Hard Tyre Critical Degradation (>10%/lap) | Hard tyres are tearing up, 10 percent wear per lap. Prepare for an emergency stop. |
| — | `tyre_inter_deg_5pct` | Intermediate High Degradation (>5%/lap) | The intermediates are wearing over five percent a lap. Use the wet parts of the track to cool them. |
| — | `tyre_inter_deg_10pct` | Intermediate Critical Degradation (>10%/lap) | The intermediates are wearing ten percent a lap. They will not last long like this. |
| — | `tyre_wet_deg_5pct` | Full Wet High Degradation (>5%/lap) | The full wets are wearing over five percent a lap. Keep them in the standing water where you can. |
| — | `tyre_wet_deg_10pct` | Full Wet Critical Degradation (>10%/lap) | The full wets are wearing ten percent a lap. The track may be ready for inters. |
| 자동 | `box_window_open` | Pit Stop Window Open | Box window is open, Max. Standby for the pit call. |
| 자동 | `box_this_lap` | Immediate Pit Call (Box, Box!) | Box this lap, Max. Box this lap. Confirm we are boxing. |
| 자동 | `pace_green` | Pace Improving (-0.2s faster) | Pace is very strong, delta is negative two tenths. Keep this rhythm. |
| 자동 | `pace_drop_half_sec` | Pace Slower (+0.5s drop) | Pace dropped by roughly half a second compared to last lap. Watch the mid-corner rotation. |
| — | `pace_drop_1sec_box` | Severe Pace Loss (>1.0s) -> Urgent Box Call | Pace has dropped over a full second compared to last lap. Tyres are finished, box this lap for fresh rubber. |
| — | `pace_drop_severe_box` | Severe Degradation (>1.2s drop) -> Immediate Box | Delta is plus 1.2 seconds, we are bleeding too much lap time. Box this lap, box this lap. |
| — | `gap_ahead_overtake` | Rival Ahead in Overtake Mode Range (<1.0s) | Gap to car ahead is under a second. Overtake mode is available, push now. |
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
| 자동 | `gap_ahead` | Gap to car ahead is {s} seconds. / (1초 미만) Gap to car ahead is {s} seconds, overtake mode available. |
| — | `gap_leader` | Gap to the leader is {s} seconds. |
| — | `gap_teammate` | Gap to your teammate is {s} seconds. |
| 자동 | `pace_drop_box` | Pace dropped by {s} seconds. Tyres are finished, box this lap! |
| — | `pace_drop_normal` | Pace dropped by {s} seconds. |
| — | `pace_gain` | Pace improved by {s} seconds, strong rhythm. |
| — | `tyre_deg` | Tyre degradation is running at {pct} percent per lap. |

| 값별 문장 파일 (`phrases/`) | 개수 | 값 범위 |
|---|---|---|
| `gap_ahead_*` | 98 | 0.2 ~ 9.9 초 |
| `pace_drop_*` | 41 | 1 ~ 5 초 |

> `segments/`(앞·숫자·뒤 조각) 폴더는 현재 비어 있습니다. 그래서 위 범위를 벗어난 값(예: 페이스 급락이 범위 최댓값보다 큰 경우)은 자막은 정상으로 표시되지만 음성은 `radio_check` 클립으로 대신 재생됩니다.

## 4. 셋업 조언 (12개)

`backend/data/voice/setup/`. 타이어 규칙은 최근 깨끗한 2랩 평균으로, 비교 규칙은 내 베스트 랩과 가장 빠른 차의 베스트 랩으로 판단합니다(프랙티스 셋업 분석 카드와 같은 계산). 기준은 `docs/SETUP_GUIDE.md`.

| key | 조건 | 영어 | 한국어 |
|---|---|---|---|
| `setup_tyres_hot` | 4바퀴 표면 온도 평균 > 105 °C | Tyre temperatures are running high. Try dropping all four tyre pressures by zero point four psi. | 타이어 온도가 높습니다. 4바퀴 공기압을 0.4 psi씩 낮춰 보세요. |
| `setup_tyres_cold` | 4바퀴 표면 온도 평균 < 85 °C | Tyres are running cold. Add zero point four psi to bring them into the window. | 타이어가 차갑습니다. 공기압을 0.4 psi 올려 작동 온도로 맞추세요. |
| `setup_fronts_hot` | 앞이 뒤보다 8 °C 이상 높고 앞 > 100 °C | The fronts are overheating. Drop the front pressures by zero point four psi and soften the front anti-roll bar by two. | 앞타이어가 과열됩니다. 앞 공기압 −0.4 psi, 프런트 안티롤바 −2를 권장합니다. |
| `setup_rears_hot` | 뒤가 앞보다 8 °C 이상 높고 뒤 > 100 °C | The rears are overheating on exit. Drop the rear pressures by zero point four psi and take five percent off the on-throttle differential. | 탈출 때 뒤타이어가 과열됩니다. 뒤 공기압 −0.4 psi, On-throttle 디퍼렌셜 −5%를 권장합니다. |
| `setup_front_limited` | 앞 마모율 ≥ 1%/랩이고 뒤의 1.3배 이상 | The car is front limited. Try two clicks more front wing, or soften the front anti-roll bar by two. | 앞타이어가 먼저 닳는 앞 제한 상태입니다. 프런트 윙 +2 또는 프런트 안티롤바 −2를 권장합니다. |
| `setup_rear_limited` | 뒤 마모율 ≥ 1%/랩이고 앞의 1.3배 이상 | The rears are wearing faster than the fronts. Take five percent off the on-throttle differential and add one click of rear wing. | 뒤타이어가 더 빨리 닳습니다. On-throttle 디퍼렌셜 −5%, 리어 윙 +1을 권장합니다. |
| `setup_balance_ok` | 위 조건에 모두 해당하지 않음(질문했을 때만 답함) | The balance looks good. No setup change needed for now. | 밸런스가 좋습니다. 지금은 셋업을 바꿀 필요가 없습니다. |
| `setup_understeer` | 가장 빠른 차와 비교: 앞이 뜨겁거나 앞 마모가 크고, 중속 코너 에이펙스가 느린 신호 중 2개 이상 | The front is sliding wide in the medium speed corners. Add some front downforce and soften the front anti-roll bar. | 중속 코너에서 언더스티어가 납니다. 프런트 윙을 올리고 프런트 안티롤바를 부드럽게 하세요. |
| `setup_oversteer` | 가장 빠른 차와 비교: 뒤가 뜨겁거나 뒤 마모가 크고, 저속 코너 탈출이 느린 신호 중 2개 이상 | The rear is stepping out on us. Add a little rear downforce and soften the rear anti-roll bar. | 리어가 미끄러집니다. 리어 윙을 조금 올리고 리어 안티롤바를 부드럽게 하세요. |
| `setup_traction` | 저속 코너 탈출이 4 km/h 이상 느리고 에이펙스보다 탈출 손실이 큼 | We are losing traction out of the slow corners. Take five percent off the on-throttle differential. | 저속 코너 탈출에서 트랙션이 부족합니다. On-throttle 디퍼렌셜을 5% 낮추세요. |
| `setup_more_downforce` | 직선 최고 속도 +5 km/h 이상인데 중·고속 코너 에이펙스 −3 km/h 이하 | We are quick on the straights but slow through the fast corners. Add two clicks of downforce, front and rear. | 직선은 빠른데 고속 코너에서 느립니다. 앞뒤 윙을 2클릭씩 올리세요. |
| `setup_less_downforce` | 직선 최고 속도 −5 km/h 이하인데 중·고속 코너는 비슷함 | We are losing time on the straights. Take two clicks of downforce off, front and rear. | 직선에서 시간을 잃고 있습니다. 앞뒤 윙을 2클릭씩 내리세요. |

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
| `qa_tip_overtake` | Stay within one second at the detection point for overtake mode, and push on the exit of the last corner. | 감지 지점에서 1초 이내를 유지해 오버테이크 모드를 쓰고, 마지막 코너 탈출에 집중하세요. |
| `qa_tip_older_tyres` | He is on older tyres. Push now while he is struggling. | 앞차 타이어가 더 오래됐습니다. 지금 밀어붙이세요. |
| `qa_lost_nothing` | Last lap was your best lap. Keep doing exactly that. | 지난 랩이 베스트 랩입니다. 그대로 유지하세요. |
| `qa_temps_ok` | Tyre temperatures are in the window. | 타이어 온도는 적정 범위입니다. |
| `qa_temps_fronts_hot` | The fronts are running hot. | 앞타이어 온도가 높습니다. |
| `qa_temps_rears_hot` | The rears are running hot. | 뒤타이어 온도가 높습니다. |
| `qa_temps_cold` | The tyres are running cold. | 타이어가 차갑습니다. |
| `qa_tyres_to_end` | The tyres will make it to the end. No stop needed. | 타이어가 끝까지 버팁니다. 피트스톱이 필요 없습니다. |
| `qa_box_now` | Box this lap, box this lap. The tyres are done. | 이번 랩에 피트인하세요. 타이어가 다 됐습니다. |

### 5-3. 숫자가 들어가는 답변 (341개)

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
| `qa_tyre_wear_{n}` | 19 | 5 ~ 95 | Tyre wear is five percent on the worst tyre. … Tyre wear is ninety five percent on the worst tyre. | 가장 많이 닳은 타이어 마모는 5%입니다. … 가장 많이 닳은 타이어 마모는 95%입니다. |
| `gap_leader_{n}` | 129 | 0.2 ~ 40.0 | Gap to the leader is zero point two seconds. … Gap to the leader is forty seconds. | 선두와의 갭은 0.2초입니다. … 선두와의 갭은 40초입니다. |

답변에는 3장의 갭 문장과 7장의 코너 문장도 섞여 나옵니다(예: "가장 많이 잃은 곳은 5번 코너입니다" + "그 코너에서 브레이킹이 늦었습니다").

## 6. 레이스 무전 (124개)

레이스 시작 전 셋업 브리핑(트랙 온도·날씨), 랩마다 타이어 마모율, 피트 윈도우 전 타이어 전략 무전입니다. 규칙은 `docs/SETUP_GUIDE.md` 6~7장, 코드는 `engineer_brain.race_brief` / `tyre_report`입니다.

| key | 영어 | 한국어 |
|---|---|---|
| `race_setup_hot` | It is hot today. Take zero point four psi out of all four tyres and look after the rears in the first stint. | 덥습니다. 타이어 공기압을 4바퀴 모두 0.4 psi 낮추고, 첫 스틴트에서는 뒤타이어를 아끼세요. |
| `race_setup_cool` | It is cool today. Raise the tyre pressures by zero point four psi, and take care on the first laps. | 쌀쌀합니다. 타이어 공기압을 0.4 psi 올리고, 첫 몇 랩은 조심하세요. |
| `race_setup_normal` | Temperatures are normal today. Keep the tyre pressures as they are. | 오늘 온도는 보통입니다. 타이어 공기압은 그대로 두세요. |
| `race_setup_rain_risk` | There is a chance of showers later in the race. A bit more downforce will help if they come. | 레이스 중 비가 올 가능성이 있습니다. 다운포스를 조금 올려 두면 비가 와도 대응하기 쉽습니다. |
| `race_setup_rain_expected` | We expect a wet race. Add downforce, about five clicks front and rear, and raise the ride height a little. | 레이스 중 비가 예상됩니다. 앞뒤 윙을 5클릭 정도 올려 다운포스를 늘리고, 차고를 조금 높이세요. |
| `race_setup_wet_inters` | The track is wet. Start on the intermediates, and run extra downforce with a higher ride height. | 트랙이 젖어 있습니다. 인터미디어트로 시작하고, 다운포스를 올리고 차고를 높이세요. |
| `race_setup_wet_full` | It is raining hard. Start on the full wets, with maximum downforce and soft suspension. | 비가 많이 옵니다. 풀 웨트로 시작하고, 다운포스는 최대로, 서스펜션은 부드럽게 하세요. |
| `race_strategy_manage` | At this rate the tyres will not reach the pit window. Look after them now: smooth on the throttle and lift a little before the big stops. | 지금 마모 속도면 피트 윈도우까지 타이어가 못 버팁니다. 지금부터 관리하세요. 가속은 부드럽게, 큰 브레이킹 전에는 살짝 리프트하세요. |
| `race_strategy_box_early` | At this rate the tyres will not make the pit window. We will box early. | 지금 마모 속도면 피트 윈도우까지 타이어가 못 버팁니다. 일찍 피트인합니다. |
| `race_strategy_rears` | The rears are going first. Be gentle on the throttle out of the slow corners. | 뒤타이어가 먼저 닳고 있습니다. 저속 코너 탈출 때 가속을 부드럽게 하세요. |
| `race_strategy_fronts` | The fronts are going first. Take it easy on them through the long turns. | 앞타이어가 먼저 닳고 있습니다. 긴 코너에서는 앞타이어를 아끼세요. |

| 패턴 | 개수 | 값 범위 | 예시 (영어) | 예시 (한국어) |
|---|---|---|---|---|
| `race_track_temp_{n}` | 51 | 10 ~ 60 | Track temperature is ten degrees. … Track temperature is sixty degrees. | 트랙 온도는 10도입니다. … 트랙 온도는 60도입니다. |
| `race_tyre_rate_{n}` | 62 | 0.3 ~ 10.0 | Tyre wear per lap is zero point three percent on this set. … Tyre wear per lap is ten percent on this set. | 타이어 마모는 랩당 0.3%입니다. … 타이어 마모는 랩당 10%입니다. |

## 7. 랩 디브리프 무전 (200개)

랩을 마친 뒤 베스트 랩보다 몇 초 느렸는지, 어느 섹터·코너에서 왜 잃었는지, 프랙티스 타임시트 순위와 롱런 타이어 수명입니다. 여러 문장을 이어 붙여 말합니다(예: `lap_off_best_4` + `loss_sector_2` + `loss_turn_7` + `loss_cause_late`). 코드는 `state_mgmt/lap_debrief.py`(분석)와 `engineer_brain.lap_debrief` / `stint_projection`(문장)입니다.

| key | 영어 | 한국어 |
|---|---|---|
| `lap_best` | That is a new personal best. Good lap. | 개인 베스트 랩입니다. 좋습니다. |
| `lap_matched` | Right on your best pace, within a tenth. | 베스트 페이스와 0.1초 이내입니다. |
| `loss_cause_late` | You were late on the brakes there. | 그 코너에서 브레이킹이 늦었습니다. |
| `loss_cause_early` | You braked too early there. | 그 코너에서 브레이킹이 너무 일렀습니다. |
| `loss_cause_apex` | You were too slow through the middle of that corner. | 코너 중간 속도가 너무 낮았습니다. |
| `loss_cause_exit` | The exit was slow, get on the power earlier there. | 탈출이 느렸습니다. 가속을 더 일찍 시작하세요. |
| `lap_invalid` | That lap was deleted for track limits. | 트랙 리밋으로 랩 타임이 삭제됐습니다. |
| `practice_stint_long` | This set would last well over forty laps at this wear rate. | 이 마모 속도면 이 타이어는 40랩 넘게 버팁니다. |
| `practice_stint_short` | This set would not even last five laps at this wear rate. | 이 마모 속도면 이 타이어는 5랩도 못 버팁니다. |

| 패턴 | 개수 | 값 범위 | 예시 (영어) | 예시 (한국어) |
|---|---|---|---|---|
| `loss_turn_{n}` | 30 | 1 ~ 30 | We lost the most time at turn one on that lap. … We lost the most time at turn thirty on that lap. | 가장 많이 잃은 곳은 1번 코너입니다. … 가장 많이 잃은 곳은 30번 코너입니다. |
| `quali_focus_{n}` | 30 | 1 ~ 30 | We keep losing time at turn one, so focus on that one. … We keep losing time at turn thirty, so focus on that one. | 1번 코너에서 계속 시간을 잃고 있습니다. 그 코너에 집중하세요. … 30번 코너에서 계속 시간을 잃고 있습니다. 그 코너에 집중하세요. |
| `loss_sector_{n}` | 3 | 1 ~ 3 | Sector one is where most of the time went. … Sector three is where most of the time went. | 섹터 1에서 가장 많이 잃었습니다. … 섹터 3에서 가장 많이 잃었습니다. |
| `lap_off_best_{n}` | 35 | 1 ~ 80 | That lap was zero point one seconds off your best. … That lap was eight seconds off your best. | 베스트 랩보다 0.1초 느렸습니다. … 베스트 랩보다 8.0초 느렸습니다. |
| `gap_top_{n}` | 35 | 1 ~ 80 | That is zero point one seconds off the top time. … That is eight seconds off the top time. | 1위 기록보다 0.1초 느립니다. … 1위 기록보다 8.0초 느립니다. |
| `practice_rank_{n}` | 22 | 1 ~ 22 | You are the fastest so far. … You are twenty second fastest so far. | 현재 타임시트 1위입니다. … 현재 타임시트 22위입니다. |
| `practice_stint_{n}` | 36 | 5 ~ 40 | This set would last about five laps at this wear rate. … This set would last about forty laps at this wear rate. | 이 마모 속도면 이 타이어는 약 5랩 버팁니다. … 이 마모 속도면 이 타이어는 약 40랩 버팁니다. |

## 8. 파일 위치

| 폴더 | 파일 수 | 내용 |
|---|---|---|
| `backend/data/voice/clips/` | 31 | 2장 고정 무전 |
| `backend/data/voice/phrases/` | 139 | 3장 값별 문장 |
| `backend/data/voice/segments/` | 0 | 3장 이어 붙이기용 조각 (하위 폴더) |
| `backend/data/voice/setup/` | 12 | 4장 셋업 조언 |
| `backend/data/voice/qa/` | 358 | 5장 질문 답변 |
| `backend/data/voice/race/` | 124 | 6장 레이스 무전 |
| `backend/data/voice/debrief/` | 200 | 7장 랩 디브리프 무전 |
| `backend/data/voice/reference/` | 5 | 음성 학습용 원본 목소리 |
