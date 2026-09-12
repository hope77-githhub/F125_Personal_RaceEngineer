# F1 AI Race Engineer Dashboard

본 프로젝트는 F1 26 게임의 UDP 텔레메트리 데이터를 실시간으로 분석하여 플레이어에게 전략적 인사이트와 상세한 주행 비교 데이터를 제공하는 **레이스 엔지니어링 대시보드**입니다.

## 🚀 현재 구현된 기능 (Current Features)

현재 **1단계(Phase 1)** 개발이 완료되어 있으며, 더미 데이터를 통해 다음과 같은 기능들이 프론트엔드 대시보드에 구현되어 있습니다.

### 1. 실시간 차량 셋업 분석 (Comprehensive Car Setup)
게임 내의 실제 UDP 패킷(Car Setup Packet) 사양을 완벽하게 반영하여 차량의 모든 세부 셋업을 한눈에 파악할 수 있습니다.
*   **AERO:** Front / Rear Wing 다운포스
*   **TRANSMISSION:** On-throttle / Off-throttle 디퍼렌셜 설정
*   **GEOMETRY:** 전/후륜 Camber 및 Toe 각도
*   **SUSPENSION:** 전/후륜 서스펜션 강성, 안티롤 바(ARB), 지상고(Ride Height)
*   **BRAKES:** 브레이크 바이어스(Bias), 제동 압력(Pressure), 엔진 브레이킹(Engine Braking)
*   **TYRES & WEIGHT:** 네 바퀴의 실시간 공기압(PSI), 차량 밸러스트(Ballast), 연료 탑재량(Fuel Load)

### 2. 코너별 주행 분석 및 비교 (Turn-by-Turn Lap Analysis)
각 랩(Lap)마다 서킷의 코너별로 상세한 주행 데이터를 분석합니다.
*   **비교 대상 토글:** 분석 기준을 **'앞차(Car Ahead)'** 또는 **'레이스 선두(Leader)'** 중 선택하여 유연하게 비교 가능
*   **브레이크 / 스로틀 비교:** 코너 진입 및 탈출 시 나의 조작량과 경쟁자의 조작량(흰색 인디케이터)을 시각적인 바 차트로 직접 비교
*   **시간 손실/이득 분석:** 각 코너마다 경쟁자 대비 몇 초가 빨랐는지(Faster) 느렸는지(Slower) 표시
*   **타이어 마모도 추적:** 코너별 타이어 소모량 차이 및 랩당 평균 타이어 마모율 분석

### 3. AI 전략 추천 (Strategy AI)
실시간 타이어 마모도 및 랩 타임을 기반으로 피트스톱(Pitstop) 타이밍과 차량 셋업 변경(예: 브레이크 바이어스 조정)을 추천해 주는 AI 레이스 엔지니어 텍스트 모듈이 구현되어 있습니다.

---

## 🛠️ 향후 개발 예정 기능 (Planned Features)

### Phase 2: 실제 게임 연동 (Real UDP Integration)
*   현재의 시뮬레이션(더미) 데이터를 F1 26 게임 클라이언트에서 쏘는 **실제 UDP 패킷(60Hz)** 수신기로 교체
*   파이썬의 `struct` 모듈을 이용한 C-Struct 바이너리 데이터 언패킹 (Packet ID별 파싱 적용)

### Phase 3: AI 음성 피드백 (Voice Cloning TTS)
*   Coqui XTTSv2 등 로컬 기반 AI 모델을 활용하여 화면을 보지 않고도 엔지니어(예: 쟝 피에로 람비아세, 피터 보닝턴)의 목소리로 피드백 청취
*   IPC(ZeroMQ)를 통해 백엔드에서 텍스트를 전달하면 AI 워커 프로세스가 음성 생성 후 오디오 출력

### Phase 4: 오버레이 지원 (Transparent Overlay HUD)
*   Electron 또는 투명 윈도우 모드를 도입하여 게임 화면 위에 방해되지 않는 투명 UI로 대시보드를 띄우는 기능

---

## 💻 Tech Stack
*   **Backend:** Python (FastAPI, WebSockets)
*   **Frontend:** React (Vite), CSS Grid & Flexbox
*   **Architecture:** MSA (데이터 파싱 프로세스와 프론트엔드 분리 구조)
