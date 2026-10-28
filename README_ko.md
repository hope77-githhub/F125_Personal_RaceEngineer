# 🏎️ F1 AI Race Engineer Dashboard

> **F1 25 / F1 26 게임을 위한 실시간 텔레메트리, 코너별 기구학 분석 및 레이스 전략 대시보드**

본 프로젝트는 F1 25 / F1 26 게임의 UDP 텔레메트리 데이터를 실시간으로 수집·분석하여, 드라이버에게 레이스 엔지니어 수준의 통찰과 코너별 주행 비교 데이터를 제공하는 웹 애플리케이션입니다.

Coinbase Design System을 적용하여 가독성과 전문성을 높였으며, 실시간 주행 모드와 사전 녹화된 세션 리플레이 모드를 모두 지원합니다.

---

## 📸 대시보드 화면 안내

| 1. 세션 환경 설정 (Session Configuration) | 2. 랩 히스토리 & 코너 텔레메트리 (Lap & Telemetry) |
| :---: | :---: |
| ![Session Configuration](project/docs/images/01_session_configuration.png) | ![Lap History and Setup](project/docs/images/02_lap_history_and_setup.png) |
| 리플레이 서킷/배속 선택, 60Hz UDP 포트, AI 보이스 페르소나 설정 | 전 랩 멀티 셀렉션, 코너별 진입/정점/탈출 상세 지표, 차량 셋업 및 타이어 마모도 |

| 3. 코너별 주행 매트릭스 (Corner Analysis) | 4. 인터랙티브 서킷 맵 & 섹터 (Circuit Map) |
| :---: | :---: |
| ![Corner Analysis Matrix](project/docs/images/03_corner_analysis_matrix.png) | ![Circuit Map and Sectors](project/docs/images/04_circuit_map_and_sectors.png) |
| 서킷 전 코너(T1~TN)의 속도·기어·페달·브레이킹 포인트·횡G 비교 | SVG 기반 실제 레이싱 라인, 클릭 가능한 코너 에이펙스 마커, 섹터 스플릿 타임 |

---

## ✨ 핵심 기능 (Key Features)

### 1. 강력한 사용자 맞춤형 셋업 (Session Configuration)
* **다국어 및 단위계 지원**: 한국어(KOR) / 영어(ENG), Metric(km/h, °C) / Imperial(mph, °F) 실시간 전환.
* **통신 주파수 및 녹화 리플레이**: 30Hz / 60Hz 선택, Catalunya 9 Laps 등 녹화본 1x ~ 4x 리플레이 재생.
* **AI 엔지니어 페르소나**: GP(막스 베르스타펜), Bono(루이스 해밀턴), Ricky(카를로스 사인츠) 등 전담 엔지니어 선택.

### 2. 정밀한 패킷 파싱 및 물리 역산 파이프라인
* **F1 UDP C-Struct 완전 해독**: `Packet 0`(Motion), `Packet 1`(Session), `Packet 2`(Lap Data), `Packet 4`(Participants), `Packet 5`(Car Setups), `Packet 6`(Car Telemetry), `Packet 10`(Car Damage), `Packet 11`(Session History).
* **물리 기반 동적 코너 분석**:
  * 각 코너의 진입(Entry) / 에이펙스(Apex) / 탈출(Exit) 속도, 기어, 스로틀, 브레이크 계산.
  * 브레이킹 시작 지점(`Brake Point`, m), 스로틀 전개 지점(`Throttle On`, m), 최대 횡가속도(`Max G`) 산출.
  * 앞차(`vs Ahead`) 및 선두(`vs Leader`) 대비 코너 최저속도 및 시간 득실 실시간 비교.

### 3. 멀티 랩 히스토리 및 코너별 상세 뷰
* `Lap 1`부터 `Lap 9` 또는 `LIVE` 중 원하는 랩을 언제든 클릭하여 해당 랩의 코너별 상세 카드 그리드 열람.
* 공식 섹터 타임(`S1, S2, S3`) 및 베스트 랩 대비 델타 타임 표시.

### 4. 인터랙티브 서킷 맵 & 섹터 분석
* 서킷 레퍼런스 라인(수천 개의 정밀 좌표)을 기반으로 한 벡터 트랙 렌더링.
* 코너별 에이펙스 마커(`T1 ~ T11`)가 매 랩 드라이버의 실제 최저 속도 통과 지점(Dynamic Apex)에 맞춰 연동.
* 코너 마커 클릭 시 해당 코너의 구체적인 주행 텔레메트리 팝업 표시.

---

## 💻 빠른 실행 (Quick Start)

### 1. 백엔드 실행
```bash
cd project/backend
# 가상환경 활성화 후
python main.py
```
* 서버는 `http://localhost:8080`에서 실행되며, 사전 파싱된 서킷 캐시(`_parsed_laps_cache_v3.json`) 덕분에 약 28ms 만에 즉시 기동됩니다.

### 2. 프론트엔드 실행
```bash
cd project/frontend
npm install
npm run dev
```
* 브라우저에서 `http://localhost:5173`으로 접속합니다.

---

## 📖 문서 가이드
* [상세 데이터 구조 및 렌더링 가이드](project/docs/DATA_AND_RENDERING_GUIDE.md)
* [Coinbase 디자인 시스템 명세](project/frontend/DESIGN-coinbase.md)
