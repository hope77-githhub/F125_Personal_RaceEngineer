# F1 AI Race Engineer - Project Specification Document

## 1. Project Overview
본 프로젝트는 F1 게임의 UDP 텔레메트리 데이터를 실시간으로 분석하고, 코너 진입 전에 레이스 엔지니어(예: GP, Bono)의 실제 목소리(AI Voice Cloning)로 주행 피드백을 제공하며, React 기반의 투명 오버레이 HUD를 화면에 띄우는 시스템입니다.
기존 "F1 25 Telemetry RTS " 프로젝트의 구조(UDP 파싱, 상태 관리, IPC 통신)를 핵심 뼈대로 차용하여 개발합니다.

---

## 2. System Architecture (MSA 기반)
게임 성능에 영향을 주지 않기 위해, 무거운 AI 연산(TTS)을 담당하는 프로세스를 완전히 분리한 마이크로서비스 형태를 취합니다.

*   **UDP Listener & State Analyzer (Backend):** 60Hz 텔레메트리 패킷 수신 및 코너별 상태 분석.
*   **Message Broker (IPC):** 백엔드와 AI 워커 간의 고속 통신 (ZeroMQ Pub/Sub 기반)[cite: 1].
*   **AI Engineer Worker:** 텍스트를 수신하여 GPU 기반 로컬 AI(XTTSv2)로 음성 파형을 생성하고 스피커로 즉시 출력.
*   **Web Frontend:** FastAPI 웹소켓과 연결되어 React로 간소화된 HUD 및 무전 자막 렌더링.

---

## 3. Directory Structure
"F1 25 Telemetry RTS "의 아키텍처를 참고하여 재구성한 폴더 구조입니다[cite: 1].

```text
f1-ai-race-engineer/
│
├── backend/                    # 데이터 수신 및 API 레이어 (FastAPI)
│   ├── main.py                 # FastAPI 웹서버 및 WebSocket 엔트리 포인트
│   ├── api/                    # REST/WS 라우터
│   ├── telemetry/              # UDP 데이터 수신 계층[cite: 1]
│   │   ├── listener.py         
│   │   └── f1_types/           # F1 패킷 구조체 정의 (바이너리 언패킹)[cite: 1]
│   └── state_mgmt/             # 차량 상태 추적 및 코너 분석기[cite: 1]
│
├── ai_engineer/                # AI TTS 전용 독립 프로세스
│   ├── main.py                 # IPC Subscriber 및 워커 실행
│   ├── tts_engine.py           # Coqui XTTSv2 로드 및 추론
│   └── assets/voices/          # 엔지니어 클린 음성 샘플 (.wav)
│
├── shared/                     # 프로세스 간 통신 (IPC) 계층
│   └── ipc/                    # Pub/Sub 브로커 및 메시지 규격[cite: 1]
│
└── frontend/                   # 프레젠테이션 레이어 (React)
    ├── package.json
    ├── src/
    │   ├── App.jsx             # 투명 배경 오버레이 라우팅
    │   ├── hooks/useTelemetry.js # WebSocket 상태 관리
    │   └── components/         # 페달 압력 UI, 타이어 마모도 UI, 자막 UI
    └── assets/                 # 트랙 맵 및 타이어 아이콘[cite: 1]


***

**다음 작업 제안:**
새로운 채팅 창에 위 마크다운을 붙여넣으신 후, 
**"이 명세서를 바탕으로 `shared/ipc/`와 `ai_engineer/main.py` 사이의 ZeroMQ 통신 기본 코드를 작성해 줘"** 또는 
**"UDP 패킷 중 Packet 6(Telemetry)을 파싱하는 파이썬 코드를 작성해 줘"** 와 같이 구체적인 모듈 단위의 코드 작성을 요청하시면 개발을 매끄럽게 시작하실 수 있습니다

