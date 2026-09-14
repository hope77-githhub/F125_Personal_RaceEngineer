# F1 AI Race Engineer Dashboard

본 프로젝트는 F1 26 게임의 UDP 텔레메트리 데이터를 실시간으로 분석하여 플레이어에게 전략적 인사이트와 상세한 주행 비교 데이터를 제공하는 **레이스 엔지니어링 대시보드**입니다.

## 🚀 현재 구현된 기능 (Current Features)

현재 **Phase 1 (UI/더미 연동)** 및 **Phase 2 (실제 패킷 파싱 아키텍처)** 개발이 성공적으로 완료되었습니다.

### 1. 강력한 사용자 맞춤형 셋업 (Session Setup)
웹 기반의 메인 셋업 UI를 통해 유저가 원하는 환경을 자유롭게 설정할 수 있습니다.
*   **다국어 지원 (i18n):** KOR (한국어) 및 ENG (영어) UI 완벽 지원 (실시간 전환 가능)
*   **단위 변환:** Metric (km/h, °C) / Imperial (mph, °F) 시스템 지원
*   **통신 주파수 설정:** 네트워크 환경에 맞춰 30Hz / 60Hz 데이터 갱신 주기 설정
*   **엔지니어 페르소나 선택:** GP (막스 베르스타펜), Bono (루이스 해밀턴), Ricky (카를로스 사인츠) 등 담당 엔지니어 선택 가능

### 2. 완벽한 바이너리 패킷 파싱 (F1 26 UDP C-Struct Parsing)
F1 26 게임이 쏘아 보내는 거대한 바이너리 텔레메트리 패킷을 단 한 방울의 누락 없이 해독해 내는 파이썬 `ctypes` 기반 파이프라인이 백엔드에 구축되어 있습니다.
*   **Packet 1 (Session):** 트랙 온도, 날씨 상태, 서킷 총길이 등 트랙 메타데이터 파싱
*   **Packet 2 (Lap Data):** 각 차량의 랩타임 기록, 섹터 타임, 현재 순위 및 앞차/선두와의 델타 타임 추적
*   **Packet 4 (Participants):** 멀티플레이어 및 AI 드라이버의 실제 이름 및 국적 매칭
*   **Packet 5 (Car Setups):** 서스펜션, 날개 각도, 타이어 공기압 등 49바이트 셋업 100% 해독
*   **Packet 6 (Car Telemetry):** 브레이크, 스로틀, 속도, 기어, 엔진 RPM 등 주행 조작량 60Hz 캡처
*   **Packet 10 (Car Damage):** 각 타이어별 완벽한 마모도(Wear %) 및 부품 손상도 추출

### 3. 코너별 주행 분석 및 비교 (Turn-by-Turn Lap Analysis)
각 랩(Lap)마다 서킷의 5% 구간(코너/섹터)별로 텔레메트리 데이터를 버퍼링하여 상세한 주행 데이터를 분석합니다.
*   **비교 대상 토글:** 분석 기준을 **'앞차(Car Ahead)'** 또는 **'레이스 선두(Leader)'** 중 선택
*   **브레이크 / 스로틀 비교:** 코너 진입 시 나의 페달 조작량과 경쟁자의 조작량을 직관적인 바 차트로 표시

---

## 🛠️ 향후 개발 예정 기능 (Planned Features)

### Phase 3: AI 음성 피드백 (Voice Cloning TTS) - ⏳ 대기 중 (Data Pending)
*   Coqui XTTSv2 기반 AI 보이스 클로닝을 통해 셋업 페이지에서 선택한 엔지니어(GP, Bono 등)의 고유한 억양과 목소리로 피드백 청취
*   AI 전략 텍스트를 실시간 WAV 스트리밍으로 변환하여 오디오 출력

### Phase 4: 오버레이 지원 (Transparent Overlay HUD)
*   게임 화면 위에 방해되지 않는 투명 UI로 대시보드를 띄우는 기능 (Electron 또는 윈도우 폼 기반)

---

## 💻 Tech Stack
*   **Backend:** Python 3 (FastAPI, WebSockets, `ctypes` for C-struct Memory Mapping)
*   **Frontend:** React (Vite), CSS Grid & Flexbox, i18n
*   **Architecture:** Data Pipeline (UDP Listener ➡️ Router ➡️ StateManager ➡️ WebSocket)
