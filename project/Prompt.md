# F1 25 Telemetry Analysis & Dashboard Implementation Guide

## 1. Project Objective
F1 25 UDP 로우 데이터(Raw Data)를 파싱하여 가상의 서킷 맵을 렌더링하고, 코너별 브레이킹 포인트 및 스로틀 전개 시점이 랩타임에 미치는 영향을 분석하는 React 기반 대시보드를 구축해야 합니다. 
기존 데이터 파이프라인(FastAPI + WebSocket)을 통해 전달받은 데이터를 프론트엔드에서 유기적으로 조합(Join)하여 시각화하는 것이 핵심 목표입니다[cite: 3].

## 2. Core Concept: The Universal Key (`m_lapDistance`)
모든 텔레메트리 데이터(시간, 패킷 식별자 등)는 **반드시 트랙 누적 주행 거리인 `m_lapDistance`를 X축(또는 Primary Key)으로 삼아 병합(Merge)해야 합니다**[cite: 3]. 
단순 시간(Timestamp) 배열로 나열하면 서로 다른 랩(Lap)의 코너 데이터를 동일 선상에서 비교할 수 없습니다.

**⚠️ `m_lapDistance`의 음수(-) 값 예외 처리:**
*   데이터 중 `m_lapDistance`가 `-21.93m` 등 음수로 들어오는 경우가 있습니다. 
*   이는 차량이 아직 해당 랩의 공식 출발선(Start/Finish Line)을 통과하지 않고 뒤쪽에 위치해 있음(예: 그리드 정렬 상태, 피트 아웃 직후)을 의미합니다. 
*   **구현 시 주의:** 음수 구간은 `Lap 0` 또는 `Pre-lap` 데이터로 간주하고, `m_lapDistance >= 0`이 되는 순간부터 본격적인 랩 차트 데이터로 시각화하도록 예외 처리 로직을 반드시 포함하세요.

## 3. Data Combination Strategy (4-Step Pipeline)
백엔드 및 프론트엔드 데이터 스토어에서 다음 패킷들을 조합하여 분석 데이터를 생성하세요.

### Step 1. 가상 서킷 맵 생성 (Virtual Track Mapping)
*   **타겟 패킷:** `Packet 0 (Motion)` + `Packet 2 (LapData)`[cite: 3].
*   **활용 데이터:** `m_worldPositionX`, `m_worldPositionZ`, `m_lapDistance`[cite: 3].
*   **구현 로직:** X, Z 절대 좌표를 2D Scatter/Line 차트로 그려 서킷의 미니맵을 생성합니다. 각 좌표 지점에 `m_lapDistance` 값을 메타데이터로 매핑해두어야 합니다. (예: X, Z 좌표를 클릭하면 해당 위치가 트랙의 몇 m 지점인지 반환).

### Step 2. 코너 구간 자동 감지 (Corner Extraction)
*   **타겟 패킷:** `Packet 0 (Motion)` + `Packet 6 (CarTelemetry)`[cite: 3].
*   **활용 데이터:** `m_steer`, `m_gForceLateral`[cite: 3].
*   **구현 로직:** 스티어링(`m_steer`) 꺾임 값이 임계치를 초과하거나 측면 G-포스(`m_gForceLateral`)가 강하게 걸리는 연속된 `m_lapDistance` 구간을 탐색하여 '코너 진입~탈출' 구간으로 그룹화(Clustering)합니다.

### Step 3. 코너별 페달 압력 오버레이 (Brake & Throttle Overlay)
*   **타겟 패킷:** `Packet 6 (CarTelemetry)`[cite: 3].
*   **활용 데이터:** `m_brake`, `m_throttle`[cite: 3].
*   **구현 로직:** 
    *   Step 2에서 찾은 특정 코너 구간(예: 500m ~ 650m)을 잘라냅니다.
    *   해당 구간에서 `m_brake > 0.05`가 최초로 발생하는 `m_lapDistance`를 **브레이킹 포인트**로 식별합니다[cite: 3].
    *   랩 1, 랩 2, 랩 3의 페달 데이터를 `m_lapDistance`를 기준으로 겹쳐서(Overlay) 하나의 그래프에 렌더링합니다.

### Step 4. 타이어 마모 및 랩타임 상관관계 연결
*   **타겟 패킷:** `Packet 10 (CarDamage)`, `Packet 2 (LapData)`[cite: 3].
*   **활용 데이터:** `m_tyresWear[4]`, `m_lastLapTimeInMS`[cite: 3].
*   **구현 로직:** 특정 코너에서 브레이킹 포인트가 늦어졌을 때(제동 거리가 짧아졌을 때), 해당 랩의 타이어 마모도(`m_tyresWear`) 급증 여부와 랩타임(`m_lastLapTimeInMS`) 변동 추이를 분석 패널에 텍스트 형태로 도출합니다[cite: 3].

## 4. Dashboard UI Layout Requirements
프론트엔드 화면 구성은 다음 3개의 패널로 분할하여 구현하세요.

1.  **Track Map View (좌측 메인 패널):** X, Z 좌표 기반의 가상 맵. 주행 경로 선을 `m_throttle`과 `m_brake` 값에 따라 동적으로 색상 변화(예: 브레이크=Red, 가속=Green)를 줍니다.
2.  **Corner Telemetry Graph (우측 상단 패널):** X축이 '시간'이 아닌 **`m_lapDistance`**인 라인 차트. 현재 선택된 코너 구간의 스로틀/브레이크 변화를 다중 랩으로 겹쳐서 표시합니다.
3.  **Insights Board (우측 하단 패널):** 분석 로직에 따라 "랩 3의 Turn 1 브레이킹이 랩 2보다 15m 늦음. 타이어 마모 2% 추가 발생"과 같은 텍스트 인사이트를 표출합니다.