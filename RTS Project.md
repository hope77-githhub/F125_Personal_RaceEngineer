# F1 AI Race Engineer - Project Specification Document

## 1. Project Overview
본 프로젝트는 F1 게임의 UDP 텔레메트리 데이터를 실시간으로 분석하여, 코너 진입 전에 레이스 엔지니어(예: GP, Bono 등)의 목소리로 주행 피드백을 제공하는 시스템입니다. 
프론트엔드는 React 기반의 대시보드 및 투명 오버레이 HUD로 구성되며, **Mastercard 기반의 프리미엄 디자인 시스템**을 엄격하게 적용합니다.

---

## 2. System Architecture (Microservices)
게임 퍼포먼스 저하를 방지하기 위해 데이터 파싱, UI 렌더링, AI API 호출을 완전히 분리합니다.

1. **Backend (Python/FastAPI):** UDP 텔레메트리 수신(60Hz), 패킷 파싱, 코너 진입 감지 및 상태 분석. (기본 포트: 8080)
2. **IPC Broker (ZeroMQ):** 백엔드와 AI 워커 간의 고속 Pub/Sub 통신망.
3. **AI TTS Worker (Python):** 독립된 프로세스에서 외부 AI API(OpenAI/ElevenLabs 등)를 호출하여 텍스트를 즉시 음성으로 변환 및 스피커 출력.
4. **Frontend (React/Vite):** FastAPI와 WebSocket으로 통신하여 실시간 HUD 업데이트 및 설정 대시보드 렌더링.

---

## 3. Directory Structure
```text
f1-ai-race-engineer/
│
├── settings.json               # 프로젝트 전역 환경변수, API_KEY, 포트(8080) 설정
│
├── backend/                    # 데이터 수신 및 API 레이어 (FastAPI)
│   ├── main.py                 # FastAPI 서버(8080) 및 WebSocket 엔트리 포인트
│   ├── telemetry/              # UDP 데이터 수신 및 모의 이벤트 발생
│   └── state_mgmt/             # 차량 상태 추적, 타이어 마모, 코너 분석기
│
├── ai_engineer/                # AI TTS 전용 독립 프로세스
│   ├── main.py                 # ZeroMQ Subscriber 및 외부 AI API 연동 워커
│   └── assets/voices/          # 오디오 에셋
│
├── shared/                     # 프로세스 간 통신 (IPC) 계층
│   └── ipc/                    # ZeroMQ 기반 Pub/Sub 브로커
│
└── frontend/                   # 프레젠테이션 레이어 (React)
    ├── src/
    │   ├── App.jsx             # 메인 라우팅
    │   ├── hooks/useTelemetry.js # WebSocket 훅
    │   ├── styles/design-system.css # Mastercard 디자인 토큰
    │   └── components/         # HUD 및 대시보드 UI 컴포넌트
    └── assets/                 # 트랙 맵 및 아이콘

push.bat                        # GitHub 자동 푸시 스크립트
```