# F1 25 차량 배터리/ERS 데이터 정리

생성일: 2026-09-15 01:17:00

> 참고: 현재 실행 환경의 `/mnt/data/`에는 `data_structure.md`가 없어, Codemasters F1 UDP 계열에서 일반적으로 사용되는 F1 25/근접 버전의 ERS 관련 구조를 기준으로 정리했다. 프로젝트에 `data_structure.md`가 있다면 필드명·타입·오프셋을 그 파일과 대조해 최종 확정해야 한다.

이 문서는 F1 25 UDP/텔레메트리 데이터에서 차량 배터리와 ERS(Energy Recovery System)를 분석하기 위한 실무형 정리다.  
목표는 **배터리 잔량, ERS 회수/소모, 배포 모드, 오버테이크 사용, 코너/랩타임 영향**을 일관된 방식으로 저장·계산·피드백하는 것이다.

---

## 1. 관련 패킷

| 패킷/데이터 영역 | 주요 용도 | ERS 분석에서의 역할 |
|---|---|---|
| `PacketCarStatusData` / `CarStatusData` | 차량 상태, 연료, DRS 허용, ERS 저장량/회수량/소모량 | ERS의 핵심 원천 데이터. 배터리 에너지, 이번 랩 회수량, 이번 랩 사용량, 배포 모드 확인 |
| `PacketCarTelemetryData` / `CarTelemetryData` | 속도, 스로틀, 브레이크, 기어, RPM, DRS 상태 등 실시간 주행 입력/상태 | ERS 사용 구간이 가속·직선·DRS·코너 탈출과 어떻게 연결되는지 분석 |
| `PacketLapData` / `LapData` | 랩타임, 섹터, 랩 거리, 현재/마지막 랩 정보 | ERS 사용량과 랩타임/섹터타임/미니섹터 성능을 연결 |
| `PacketMotionData` / `CarMotionData` | 위치, 속도 벡터, 방향, G-force, yaw/pitch/roll | 코너 진입/탈출, 직선 판별, 회생 가능 구간 추정에 활용 |
| `PacketSessionData` | 트랙, 세션 타입, 전체 랩 수, 날씨 등 | 트랙별 ERS 기준값, 비교 그룹, 세션 컨텍스트 저장 |
| `PacketButtonsData` | 컨트롤러 버튼 입력 비트마스크 | 오버테이크 버튼 입력 여부가 제공되는 경우, 실제 버튼 사용 타이밍 분석 |
| `PacketEventData` | 세이프티카, 패널티, 세션 이벤트 등 | 비정상 상황의 랩/구간 제외 또는 별도 태깅 |
| `PacketFinalClassificationData` | 최종 결과 | 레이스 전체 ERS 운용과 결과 비교 |

---

## 2. 핵심 필드

아래 필드는 이름이 버전/구현에 따라 약간 달라질 수 있으므로 실제 프로젝트에서는 `data_structure.md` 또는 파서 정의를 기준으로 매핑한다.

| 범주 | 대표 필드명 | 타입 예시 | 단위/값 | 설명 |
|---|---|---:|---|---|
| 배터리 저장량 | `m_ersStoreEnergy` / `ersStoreEnergy` | `float` | Joule | 현재 ERS 배터리에 저장된 에너지 |
| ERS 배포 모드 | `m_ersDeployMode` / `ersDeployMode` | `uint8` | enum | 현재 ERS 사용 전략/모드 |
| MGU-K 회수량 | `m_ersHarvestedThisLapMGUK` | `float` | Joule/lap | 이번 랩에서 MGU-K로 회수한 에너지 |
| MGU-H 회수량 | `m_ersHarvestedThisLapMGUH` | `float` | Joule/lap | 이번 랩에서 MGU-H로 회수한 에너지 |
| ERS 사용량 | `m_ersDeployedThisLap` | `float` | Joule/lap | 이번 랩에서 배터리로부터 사용한 에너지 |
| DRS 상태 | `m_drs` | `uint8` | 0/1 | DRS가 열린 상태인지 여부 |
| DRS 허용 | `m_drsAllowed` | `uint8` | 0/1 | 현재 DRS 사용이 허용되는지 여부 |
| DRS 활성 거리 | `m_drsActivationDistance` | `uint16` 등 | m | DRS 활성 지점까지 남은 거리. 버전에 따라 없을 수 있음 |
| 속도 | `m_speed` | `uint16` | km/h | ERS 효율 및 직선 가속 구간 분석 |
| 스로틀 | `m_throttle` | `float` | 0.0~1.0 | ERS 사용 의도와 가속 요구 |
| 브레이크 | `m_brake` | `float` | 0.0~1.0 | 회생 가능 구간, 코너 진입 판별 |
| 기어/RPM | `m_gear`, `m_engineRPM` | int/uint | gear, rpm | 가속 상태와 ERS 효과 해석 |
| 랩 거리 | `m_lapDistance` | `float` | m | 구간별 ERS 프로파일 정렬 |
| 현재 랩타임 | `m_currentLapTimeInMS` 등 | int | ms | 랩타임 비교 |
| 섹터 정보 | sector fields | int/enum | sector | 섹터별 ERS 운용 평가 |
| 버튼 비트마스크 | `m_buttonStatus` | int | bitmask | 오버테이크 버튼이 비트로 제공될 경우 사용 |

---

## 3. ERS Deploy Mode 값

일반적으로 F1 UDP 계열에서 ERS 배포 모드는 다음과 같이 해석한다.

| 값 | 이름 | 의미 | 분석상 해석 |
|---:|---|---|---|
| `0` | `None` | ERS 배포 없음 또는 최소 | 배터리 보존, 회수 위주 구간 가능 |
| `1` | `Medium` | 중간 수준 배포 | 기본 레이스 페이스 운용 |
| `2` | `Hotlap` | 고출력 배포 | 예선/타임어택성 사용, 배터리 소모 큼 |
| `3` | `Overtake` | 오버테이크/공격용 배포 | 추월·방어·직선 가속 극대화 구간 |

주의: 실제 F1 25 데이터 정의가 위와 다를 경우 `data_structure.md`의 enum 설명을 우선한다.

---

## 4. 오버테이크 관련 필드

오버테이크 분석은 크게 두 경로로 처리한다.

### 4.1 Deploy Mode 기반

`ersDeployMode == 3`이면 오버테이크 배포 모드로 간주한다.

추천 파생 필드:

| 파생 필드 | 계산 |
|---|---|
| `is_overtake_deploy` | `ersDeployMode == 3` |
| `overtake_deploy_duration_ms` | 연속된 `is_overtake_deploy == true` 구간의 지속 시간 |
| `overtake_energy_used_j` | 해당 구간의 `ersDeployedThisLap` 증가분 |
| `overtake_start_lap_distance_m` | 오버테이크 구간 시작 시 `lapDistance` |
| `overtake_end_lap_distance_m` | 오버테이크 구간 종료 시 `lapDistance` |

### 4.2 Button Packet 기반

`PacketButtonsData`에 오버테이크 버튼 비트가 정의되어 있다면 다음을 추가로 저장한다.

| 필드 | 설명 |
|---|---|
| `button_status_raw` | 원본 버튼 비트마스크 |
| `is_overtake_button_pressed` | 오버테이크 버튼 비트가 켜져 있는지 여부 |
| `button_press_start_time` | 버튼 누름 시작 시각 |
| `button_press_duration_ms` | 버튼 누름 지속 시간 |
| `button_to_deploy_latency_ms` | 버튼 입력과 ERS deploy mode 변화 사이 지연 |

버튼 입력과 `ersDeployMode`가 항상 1:1로 일치하지 않을 수 있다.  
따라서 **사용자 입력 의도**는 버튼 패킷으로, **실제 차량 배포 상태**는 `CarStatusData`로 분리해 저장하는 것이 좋다.

---

## 5. 파생 지표

### 5.1 배터리 비율

F1 게임 데이터에서 ERS 최대 저장량은 보통 약 `4,000,000 J` 기준으로 사용된다.  
프로젝트에서 최대값이 별도로 제공되면 그 값을 사용한다.

```text
ers_battery_pct = ersStoreEnergy / ERS_MAX_J * 100
```

예:

```text
ERS_MAX_J = 4,000,000
ersStoreEnergy = 2,800,000
ers_battery_pct = 70.0%
```

### 5.2 랩 내 순 에너지 변화

```text
ers_net_this_lap_j = ersHarvestedThisLapMGUK + ersHarvestedThisLapMGUH - ersDeployedThisLap
```

양수이면 해당 랩에서 회수가 사용보다 많았고, 음수이면 배터리를 더 많이 쓴 것이다.

### 5.3 구간별 ERS 사용량

`ersDeployedThisLap`은 랩 누적값인 경우가 많으므로 샘플 간 차분으로 구간 사용량을 계산한다.

```text
delta_deployed_j[i] = deployed_this_lap[i] - deployed_this_lap[i-1]
```

랩이 바뀌면 누적값이 0에 가까운 값으로 리셋될 수 있으므로, 랩 변경 시 차분 계산을 초기화한다.

### 5.4 구간별 회수량

```text
delta_harvest_mguk_j[i] = harvested_mguk_this_lap[i] - harvested_mguk_this_lap[i-1]
delta_harvest_mguh_j[i] = harvested_mguh_this_lap[i] - harvested_mguh_this_lap[i-1]
```

### 5.5 ERS 효율 지표

```text
speed_gain_per_100kj = delta_speed_kmh / (delta_deployed_j / 100000)
time_gain_per_100kj = delta_time_gain_ms / (delta_deployed_j / 100000)
```

실제 인과관계는 연료, 타이어, 드래그, 슬립스트림, DRS, 라인 차이의 영향을 받으므로 기준 랩/비교 랩을 잘 맞춰야 한다.

### 5.6 소모 강도

```text
ers_deploy_power_est_w = delta_deployed_j / delta_time_s
```

샘플링 노이즈가 큰 경우 100~500 ms 이동평균을 적용한다.

---

## 6. 코너/랩타임 분석과의 통합

### 6.1 기본 정렬 키

ERS 분석은 모든 패킷을 아래 기준으로 정렬하면 안정적이다.

1. `sessionUID`
2. `frameIdentifier`
3. `playerCarIndex` 또는 차량 index
4. `currentLapNum`
5. `lapDistance`

### 6.2 코너 구간 태깅

트랙 맵 또는 수동 코너 정의가 있다면 다음과 같이 구간을 나눈다.

| 구간 | 판별 기준 예시 | ERS 분석 포인트 |
|---|---|---|
| 코너 진입 | 브레이크 증가, 속도 감소, 고횡G | MGU-K 회수량, 배터리 회복 |
| 에이펙스 | 최저속 근처, 조향/횡G 높음 | ERS 사용은 보통 낮음 |
| 코너 탈출 | 스로틀 증가, 브레이크 0, 속도 증가 | ERS 투입이 랩타임에 큰 영향 |
| 직선 | 스로틀 높음, 조향 낮음, 속도 증가 | 오버테이크/Hotlap 효과, DRS와 상호작용 |

### 6.3 랩타임 영향 분석 절차

1. 기준 랩(best/reference lap)을 선택한다.
2. `lapDistance` 기준으로 샘플을 리샘플링한다. 예: 5 m 또는 10 m 간격.
3. 각 거리 bin마다 다음을 비교한다.
   - 속도 차이
   - 누적 시간 차이
   - ERS 배터리 %
   - 구간 ERS 사용량
   - deploy mode
   - DRS 상태
4. 코너/직선 태그를 붙여 손익을 요약한다.
5. 같은 속도·스로틀 조건에서 ERS 사용량이 많은데 시간 이득이 작으면 비효율 사용으로 표시한다.

### 6.4 유용한 비교 예시

| 질문 | 필요한 데이터 |
|---|---|
| 직선에서 오버테이크를 너무 일찍 켰는가? | `lapDistance`, `speed`, `ersDeployMode`, `ersDeployedThisLap`, `DRS` |
| 코너 탈출에서 배터리가 부족했는가? | `ersStoreEnergy`, `throttle`, `speed`, 코너 exit 태그 |
| 방어 상황에서 ERS를 과소 사용했는가? | 상대 차량 거리, 버튼/배포 모드, 직선 속도 |
| 한 랩의 마지막 직선에서 배터리를 남겼는가? | 랩 종료 시 `ersStoreEnergy`, `ersDeployedThisLap` |
| 회생이 부족한 코너가 있는가? | 브레이크 구간의 MGU-K 증가량, 제동 강도, 속도 감소량 |

---

## 7. 권장 저장 스키마

### 7.1 Raw 테이블

원본 패킷은 변환 전 그대로 저장한다.

#### `raw_car_status`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_uid` | string/int | 세션 고유값 |
| `frame_id` | int | 프레임 번호 |
| `timestamp_ms` | int | 수신 또는 세션 시간 |
| `car_index` | int | 차량 index |
| `lap_num` | int | 현재 랩 |
| `lap_distance_m` | float | 랩 거리 |
| `ers_store_energy_j` | float | 배터리 에너지 |
| `ers_deploy_mode` | int | ERS 모드 |
| `ers_harvested_mguk_j_lap` | float | 이번 랩 MGU-K 회수 누적 |
| `ers_harvested_mguh_j_lap` | float | 이번 랩 MGU-H 회수 누적 |
| `ers_deployed_j_lap` | float | 이번 랩 사용 누적 |
| `drs_allowed` | int/bool | DRS 허용 |
| `drs_activation_distance_m` | int/float/null | DRS 활성 거리 |

#### `raw_car_telemetry`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_uid` | string/int | 세션 고유값 |
| `frame_id` | int | 프레임 번호 |
| `timestamp_ms` | int | 시각 |
| `car_index` | int | 차량 index |
| `speed_kmh` | float | 속도 |
| `throttle` | float | 스로틀 |
| `brake` | float | 브레이크 |
| `gear` | int | 기어 |
| `engine_rpm` | int | RPM |
| `drs_open` | bool | DRS 열림 |

#### `raw_buttons`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_uid` | string/int | 세션 고유값 |
| `frame_id` | int | 프레임 번호 |
| `timestamp_ms` | int | 시각 |
| `button_status_raw` | int | 원본 버튼 비트마스크 |
| `is_overtake_button_pressed` | bool/null | 오버테이크 버튼 여부 |

### 7.2 분석 테이블

#### `ers_sample_features`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_uid` | string/int | 세션 |
| `car_index` | int | 차량 |
| `lap_num` | int | 랩 |
| `lap_distance_m` | float | 거리 |
| `track_segment_id` | string/null | 코너/직선 구간 ID |
| `segment_type` | enum | `corner_entry`, `apex`, `corner_exit`, `straight` 등 |
| `ers_battery_pct` | float | 배터리 % |
| `delta_deployed_j` | float | 샘플 구간 ERS 사용량 |
| `delta_harvested_j` | float | 샘플 구간 회수량 |
| `ers_net_delta_j` | float | 구간 순 변화 |
| `is_overtake_deploy` | bool | deploy mode 기준 오버테이크 |
| `is_overtake_button_pressed` | bool/null | 버튼 기준 오버테이크 |
| `ers_deploy_power_est_w` | float/null | 추정 배포 파워 |
| `speed_kmh` | float | 속도 |
| `throttle` | float | 스로틀 |
| `brake` | float | 브레이크 |
| `drs_open` | bool | DRS 상태 |
| `time_delta_to_reference_ms` | float/null | 기준 랩 대비 시간 차 |

#### `ers_lap_summary`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_uid` | string/int | 세션 |
| `car_index` | int | 차량 |
| `lap_num` | int | 랩 |
| `lap_time_ms` | int | 랩타임 |
| `ers_start_j` | float | 랩 시작 배터리 |
| `ers_end_j` | float | 랩 종료 배터리 |
| `ers_start_pct` | float | 랩 시작 % |
| `ers_end_pct` | float | 랩 종료 % |
| `ers_deployed_total_j` | float | 랩 총 사용량 |
| `ers_harvested_mguk_total_j` | float | 랩 MGU-K 회수 |
| `ers_harvested_mguh_total_j` | float | 랩 MGU-H 회수 |
| `ers_net_j` | float | 회수 - 사용 |
| `overtake_duration_ms` | int | 오버테이크 배포 지속 |
| `hotlap_duration_ms` | int | Hotlap 지속 |
| `drs_open_duration_ms` | int | DRS 열린 시간 |
| `battery_low_events` | int | 배터리 부족 이벤트 수 |

### 7.3 구간 요약 테이블

#### `ers_segment_summary`

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `session_uid` | string/int | 세션 |
| `car_index` | int | 차량 |
| `lap_num` | int | 랩 |
| `segment_id` | string | 예: `T01_entry`, `T01_exit`, `straight_2` |
| `segment_type` | enum | 코너/직선 타입 |
| `start_distance_m` | float | 시작 거리 |
| `end_distance_m` | float | 종료 거리 |
| `entry_battery_pct` | float | 구간 시작 배터리 |
| `exit_battery_pct` | float | 구간 종료 배터리 |
| `deployed_j` | float | 구간 사용량 |
| `harvested_j` | float | 구간 회수량 |
| `avg_speed_kmh` | float | 평균 속도 |
| `max_speed_kmh` | float | 최고 속도 |
| `time_ms` | int | 구간 소요 시간 |
| `time_delta_to_ref_ms` | float/null | 기준 대비 시간 차 |
| `recommendation_code` | string/null | 피드백 코드 |

---

## 8. 예시 계산

### 8.1 배터리 %

입력:

```text
ersStoreEnergy = 3,200,000 J
ERS_MAX_J = 4,000,000 J
```

계산:

```text
ers_battery_pct = 3,200,000 / 4,000,000 * 100 = 80.0%
```

### 8.2 랩 순 에너지

입력:

```text
MGU-K 회수 = 1,250,000 J
MGU-H 회수 =   450,000 J
ERS 사용  = 2,000,000 J
```

계산:

```text
ers_net_this_lap_j = 1,250,000 + 450,000 - 2,000,000
                   = -300,000 J
```

해석: 이 랩은 배터리를 순수하게 300 kJ 소모했다.

### 8.3 직선 구간 오버테이크 사용량

입력:

```text
구간 시작 deployedThisLap = 900,000 J
구간 종료 deployedThisLap = 1,260,000 J
구간 시간 = 4.0 s
deployMode = 3
```

계산:

```text
delta_deployed_j = 1,260,000 - 900,000 = 360,000 J
평균 배포 파워 = 360,000 / 4.0 = 90,000 W
```

해석: 해당 직선에서 오버테이크 모드로 약 360 kJ를 사용했다.

### 8.4 랩 변경 시 차분 보정

입력:

```text
이전 샘플: lap=5, deployedThisLap=2,100,000
현재 샘플: lap=6, deployedThisLap=20,000
```

잘못된 계산:

```text
20,000 - 2,100,000 = -2,080,000 J
```

올바른 처리:

```text
lap 번호가 바뀌었으므로 delta_deployed_j = 0 또는 현재 랩 첫 샘플로 초기화
```

---

## 9. 피드백 예시

### 9.1 배터리 부족 경고

조건 예시:

```text
ers_battery_pct < 10%
AND 남은 직선 구간 길이 > 500 m
```

피드백:

> 배터리 잔량이 10% 미만입니다. 다음 긴 직선에서 오버테이크 사용 여력이 부족할 수 있습니다. 코너 진입 회생을 확보하고 불필요한 Hotlap 사용을 줄이세요.

### 9.2 코너 탈출 ERS 미사용

조건 예시:

```text
segment_type == corner_exit
AND throttle > 0.85
AND speed increasing
AND ers_battery_pct > 40%
AND delta_deployed_j is low
```

피드백:

> 코너 탈출에서 배터리 여유가 있었지만 ERS 투입이 낮았습니다. 탈출 직후 1~2초간 배포를 늘리면 다음 직선 초반 가속을 개선할 수 있습니다.

### 9.3 오버테이크 조기 사용

조건 예시:

```text
is_overtake_deploy == true
AND speed_kmh < expected_exit_speed
AND steering_angle high 또는 corner_exit 이전
```

피드백:

> 오버테이크 사용이 너무 이른 시점에 시작되었습니다. 조향이 풀리고 차량이 안정된 뒤 사용하면 휠스핀/비효율 소모를 줄일 수 있습니다.

### 9.4 직선 후반 배터리 낭비

조건 예시:

```text
straight_end_distance - current_distance < 100 m
AND is_overtake_deploy == true
AND braking soon
```

피드백:

> 제동 직전까지 오버테이크가 유지되었습니다. 직선 후반의 추가 속도 이득이 작다면 제동 100m 전 해제하여 배터리를 절약하세요.

### 9.5 랩 종료 배터리 과다 잔량

조건 예시:

```text
lap_end_ers_battery_pct > 60%
AND lap is qualifying push lap
```

피드백:

> 푸시 랩 종료 시 배터리가 많이 남았습니다. 마지막 섹터 또는 메인 스트레이트에서 Hotlap/Overtake 사용을 늘릴 여지가 있습니다.

### 9.6 회생 부족 코너

조건 예시:

```text
braking_zone == true
AND delta_harvested_mguk_j lower than reference by > threshold
```

피드백:

> 이 제동 구간의 MGU-K 회수량이 기준 랩보다 낮습니다. 브레이크 입력 프로파일 또는 제동 안정성을 확인하세요.

---

## 10. 구현 메모

### 10.1 샘플 간 차분 처리

- 누적형 랩 필드는 반드시 같은 랩 안에서만 차분한다.
- 값이 감소하면 다음 중 하나로 판단한다.
  - 랩 변경
  - 패킷 유실/순서 뒤바뀜
  - 게임 내부 리셋
- 음수 차분은 기본적으로 0 또는 결측으로 처리하고, 원인 태그를 저장한다.

### 10.2 시간 기준

- 패킷 수신 시각보다 게임의 세션 시간/프레임 번호가 있으면 그것을 우선한다.
- 서로 다른 패킷 주파수를 맞추기 위해 nearest join 또는 interpolation을 사용한다.
- 분석용 join 허용 오차는 보통 20~100 ms 범위에서 시작해 검증한다.

### 10.3 거리 기준 리샘플링

ERS와 랩타임 분석은 시간보다 `lapDistance` 기준 비교가 유리하다.

추천:
- 고해상도 분석: 2~5 m bin
- 일반 코칭 피드백: 10 m bin
- 빠른 대시보드: 25 m bin

---

## 11. 주의사항 및 한계

1. **필드명/enum은 버전별로 다를 수 있음**  
   F1 25의 실제 `data_structure.md`가 있다면 해당 정의가 최우선이다.

2. **ERS 최대 저장량은 고정 가정일 수 있음**  
   일반적으로 4 MJ 기준을 사용하지만, 게임 모드/버전/차량 규칙에 따라 확인이 필요하다.

3. **`ersDeployedThisLap`은 누적값일 가능성이 높음**  
   샘플별 사용량이 아니라 랩 누적값이면 차분 계산이 필수다.

4. **버튼 입력과 실제 배포는 다를 수 있음**  
   오버테이크 버튼을 눌렀다고 항상 배포 모드가 즉시 바뀌는 것은 아니다.

5. **랩타임 이득은 ERS만의 결과가 아님**  
   DRS, 슬립스트림, 타이어 온도/마모, 연료량, 라인, 트랙 에볼루션을 함께 봐야 한다.

6. **패킷 유실과 수신 지연 처리 필요**  
   UDP 특성상 패킷 손실·중복·순서 뒤바뀜이 발생할 수 있다.

7. **AI/상대 차량 비교 시 조건 통제가 필요**  
   같은 랩, 같은 타이어, 비슷한 연료, 비슷한 트래픽 조건에서 비교해야 의미가 있다.

8. **세이프티카/버추얼 세이프티카/피트인 구간 제외**  
   ERS 사용 패턴이 정상 레이스 페이스와 다르므로 별도 태깅하거나 제외한다.

---

## 12. 추천 분석 출력

대시보드 또는 리포트에는 다음 그래프/표를 포함하면 좋다.

| 출력 | 내용 |
|---|---|
| 배터리 % vs 랩 거리 | 한 랩 동안 배터리가 어디서 줄고 회복되는지 표시 |
| ERS deployed delta vs 랩 거리 | 구간별 실제 사용량 표시 |
| Harvested MGU-K/MGU-H vs 랩 거리 | 회생 구간 확인 |
| Deploy mode strip chart | None/Medium/Hotlap/Overtake 모드 타임라인 |
| DRS + Overtake overlay | DRS와 오버테이크 동시 사용 여부 |
| 기준 랩 대비 시간 차 | ERS 투입과 랩타임 손익 연결 |
| 코너별 요약표 | 각 코너 entry/apex/exit의 배터리·사용량·시간 손익 |

---

## 13. 최소 파이프라인 예시

```text
1. UDP 패킷 수신
2. CarStatus, CarTelemetry, LapData, Buttons 원본 저장
3. frame_id / timestamp 기준으로 패킷 join
4. lap_num, lapDistance 기준 정렬
5. ERS 누적 필드 차분
6. 배터리 %, 구간 사용량, 회수량, 오버테이크 상태 생성
7. 코너/직선 segment 태깅
8. 기준 랩 대비 속도/시간/ERS 비교
9. 피드백 룰 적용
10. 랩/구간 요약 저장 및 시각화
```

---

## 14. 필드 매핑 체크리스트

실제 프로젝트 적용 전 확인할 항목:

- [ ] `data_structure.md`에 ERS 필드가 어느 패킷에 정의되어 있는가?
- [ ] `ersStoreEnergy`의 단위가 Joule인가?
- [ ] ERS 최대값은 4 MJ로 가정해도 되는가?
- [ ] `ersDeployMode` enum 값이 0~3 구조와 일치하는가?
- [ ] 오버테이크 버튼 비트가 `PacketButtonsData`에 정의되어 있는가?
- [ ] `ersDeployedThisLap`, `ersHarvestedThisLapMGUK/H`가 랩 누적인가?
- [ ] 랩 변경 시 누적값 리셋이 어떻게 발생하는가?
- [ ] 샘플링 주기와 패킷별 주파수가 어떻게 다른가?
- [ ] 플레이어 차량과 AI/상대 차량 index가 어떻게 매핑되는가?
- [ ] 코너/미니섹터 구간 정의가 트랙별로 준비되어 있는가?
