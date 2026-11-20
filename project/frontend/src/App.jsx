import React, { useState, useEffect, useRef } from 'react';
import './styles/design-system.css';
import CornerMapModal from './CornerMapModal';

const i18n = {
  en: {
    title: "F1 AI Race Engineer",
    subtitle: "Institutional-grade telemetry, corner-by-corner kinematics, and real-time race strategy.",
    sessionSetup: "Session Configuration",
    udpPort: "UDP Telemetry Port (Local)",
    udpDesc: "Match the UDP port number configured in F1 26 Telemetry Settings (Default: 20777).",
    updateRate: "Telemetry Sampling Rate",
    updateDesc: "Controls backend packet parsing and WebSocket broadcast frequency.",
    units: "Measurement Units",
    unitsDesc: "Select display units for speed and temperature.",
    tts: "AI Engineer Voice (TTS)",
    ttsDesc: "Your race engineer radios braking, pace, tyre and gap calls, answers your questions and gives setup advice in practice.",
    comingSoon: "coming soon",
    radioPlanTitle: "What the engineer calls, by session",
    radioPlan: [
      "Practice: braking per corner, lap pace, exit traction, tyre wear, setup advice",
      "Qualifying: braking per corner, lap pace",
      "Race: all of the above plus pit calls and the gap to the car ahead",
      "Any session: ask questions from \"Ask the engineer\" on the dashboard",
    ],
    persona: "Engineer Persona",
    overlay: "TV Overlay (broadcast graphics over the game)",
    overlayDesc: "Timing tower, lap cards and the TV-pod halo on top of the game. When ON it appears by itself as soon as the game sends telemetry (nothing shows before that). Game must be in borderless / windowed-fullscreen. Needs Node.js; the overlay window is a one-time download (Electron, ~370 MB).",
    language: "Display Language",
    languageDesc: "Choose the interface language for the telemetry dashboard.",
    connect: "Connect & Start Session",
    vsAhead: "vs Ahead",
    vsLeader: "vs Leader",
    whiteLine: "*Vertical marker indicates {compLabelEng}'s input",
    sectorAnalysis: "Sector Analysis",
    sectorHistory: "Official Sector History",
    sectorComparison: "Sector Delta Comparison",
    circuitMap: "Interactive Circuit Map",
    sector1Start: "Sector 1",
    sector2Start: "Sector 2",
    sector3Start: "Sector 3",
    cornerAnalysis: "Corner Analysis",
    cornerTelemetryTitle: "Corner-by-Corner Telemetry",
    selectLapPrompt: "Click any lap to inspect corner-by-corner telemetry",
    useRawReplay: "Recorded Telemetry Replay",
    useRawReplayDesc: "Simulate and analyze accumulated circuit lap telemetry from backend /data.",
    replayCircuit: "Circuit Dataset",
    replayLap: "Target Lap",
    replaySession: "Session",
    replaySpeed: "Playback Speed",
    replayAllLaps: "All Completed Laps (Sequential)",
    replayModeBadge: "REPLAY",
    radioTitle: "Red Bull Engineer Team Radio",
    radioActive: "RADIO ACTIVE",
    radioTestConsole: "Engineer Radio Test Console (TTS/Voice Tester)",
    radioTestDesc: "Click any button to test the Red Bull engineer's pit-wall voice clips and verify telemetry sync.",
    autoRadio: "Auto Radio",
    stopRadio: "Stop Radio",
  },
  ko: {
    title: "F1 AI 레이스 엔지니어",
    subtitle: "정밀 UDP 텔레메트리 파싱, 코너별 주행 역학 분석 및 실시간 레이스 전략 대시보드",
    sessionSetup: "세션 환경 설정",
    udpPort: "UDP 포트 (로컬)",
    udpDesc: "F1 26 게임 내 Telemetry 설정의 UDP Port 번호와 일치시켜 주세요. (기본값: 20777)",
    updateRate: "데이터 갱신 주기",
    updateDesc: "백엔드 파싱 및 프론트엔드 전송 주기를 결정합니다.",
    units: "측정 단위",
    unitsDesc: "표시할 속도 및 온도 단위를 선택합니다. (Metric / Imperial)",
    tts: "AI 엔지니어 음성 브리핑 (TTS)",
    ttsDesc: "레이스 엔지니어가 코너 브레이킹·페이스·타이어·앞차 갭을 무전하고, 질문에 답하며, 프랙티스에서는 셋업을 조언합니다.",
    comingSoon: "준비 중",
    radioPlanTitle: "세션별 엔지니어 무전",
    radioPlan: [
      "프랙티스: 코너별 브레이킹, 랩 페이스, 탈출 트랙션, 타이어 마모, 셋업 조언",
      "퀄리파잉: 코너별 브레이킹, 랩 페이스",
      "레이스: 위 항목 전부 + 피트인 콜, 앞차와의 갭",
      "모든 세션: 대시보드의 '엔지니어에게 질문'에서 질문 가능",
    ],
    persona: "엔지니어 페르소나 선택",
    overlay: "TV 오버레이 (게임 위 중계 그래픽)",
    overlayDesc: "타이밍 타워, 랩 카드, TV-pod 할로 계기판을 게임 화면 위에 띄워요. ON이면 게임이 텔레메트리를 보내는 순간 자동으로 나타나요(그 전에는 아무것도 표시되지 않아요). 게임은 '창 모드(전체 화면)'여야 하고 Node.js가 필요해요. 오버레이 창은 처음 한 번만 내려받아요(Electron, 약 370MB).",
    language: "언어 (Language)",
    languageDesc: "대시보드 표시 언어를 선택합니다.",
    connect: "세션 연결 및 시작",
    vsAhead: "vs 앞차 (Ahead)",
    vsLeader: "vs 선두 (Leader)",
    whiteLine: "*수직 마커: {compLabelEng} 조작량 기준선",
    sectorAnalysis: "섹터 분석 (Sector Analysis)",
    sectorHistory: "랩별 공식 섹터 기록",
    sectorComparison: "경쟁차 섹터 델타 비교",
    circuitMap: "서킷 맵 & 코너 포인트 (Circuit Map)",
    sector1Start: "섹터 1",
    sector2Start: "섹터 2",
    sector3Start: "섹터 3",
    cornerAnalysis: "코너별 정밀 분석 (Corner Analysis)",
    cornerTelemetryTitle: "코너별 상세 텔레메트리",
    selectLapPrompt: "랩을 클릭하면 해당 랩의 코너별 상세 텔레메트리를 확인할 수 있습니다",
    useRawReplay: "Raw Data 리플레이 모드",
    useRawReplayDesc: "백엔드 /data에 기록된 서킷별 랩 주행 데이터를 불러와 시뮬레이션 및 코너 분석을 수행합니다.",
    replayCircuit: "리플레이 서킷 선택",
    replayLap: "재생할 랩",
    replaySession: "리플레이 세션",
    replaySpeed: "재생 배속",
    replayAllLaps: "전체 완주 랩 순차 재생 (권장)",
    replayModeBadge: "리플레이",
    radioTitle: "레드불 엔지니어 팀 라디오",
    radioActive: "무전 송출 중 (RADIO ACTIVE)",
    radioTestConsole: "엔지니어 보이스 테스트 콘솔 (Voice/TTS Tester)",
    radioTestDesc: "각 버튼을 클릭하여 레드불 엔지니어의 무전 음성과 대시보드 싱크를 테스트하세요.",
    autoRadio: "자동 무전 브리핑",
    stopRadio: "무전 중지",
  },
};

// Web Audio Context singleton & F1 Team Radio Audio Stitcher Engine
let globalAudioCtx = null;
const getAudioContext = () => {
  if (!globalAudioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) globalAudioCtx = new AudioContextClass();
  }
  if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
};

// F1 Team Radio Filter Chain (Bandpass 350Hz-3400Hz + Waveshaper Saturation)
const createF1RadioFX = (ctx, destination) => {
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1750;
  filter.Q.value = 1.0;

  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const x = (i * 2) / 256 - 1;
    curve[i] = Math.tanh(x * 1.25);
  }
  shaper.curve = curve;

  filter.connect(shaper);
  shaper.connect(destination);
  return filter;
};

// Seamless 35ms Equal-Power Crossfade Audio Buffer Stitching
const stitchAudioBuffers = (ctx, buffers, crossfadeMs = 35) => {
  if (!buffers || buffers.length === 0) return null;
  if (buffers.length === 1) return buffers[0];

  const sampleRate = buffers[0].sampleRate;
  const crossfadeSamples = Math.floor((crossfadeMs / 1000) * sampleRate);

  let totalLength = 0;
  for (let i = 0; i < buffers.length; i++) {
    totalLength += buffers[i].length;
    if (i > 0) totalLength -= crossfadeSamples;
  }
  totalLength = Math.max(1, totalLength);

  const numChannels = buffers[0].numberOfChannels;
  const stitched = ctx.createBuffer(numChannels, totalLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const outData = stitched.getChannelData(ch);
    let writeOffset = 0;

    for (let bIdx = 0; bIdx < buffers.length; bIdx++) {
      const inData = buffers[bIdx].getChannelData(Math.min(ch, buffers[bIdx].numberOfChannels - 1));
      const inLen = inData.length;

      if (bIdx === 0) {
        outData.set(inData, 0);
        writeOffset = inLen - crossfadeSamples;
      } else {
        for (let i = 0; i < crossfadeSamples; i++) {
          const fadeOut = Math.cos((i / crossfadeSamples) * 0.5 * Math.PI);
          const fadeIn = Math.sin((i / crossfadeSamples) * 0.5 * Math.PI);
          const existing = outData[writeOffset + i];
          const incoming = i < inLen ? inData[i] : 0;
          outData[writeOffset + i] = existing * fadeOut + incoming * fadeIn;
        }

        const rem = inLen - crossfadeSamples;
        if (rem > 0) {
          outData.set(inData.subarray(crossfadeSamples), writeOffset + crossfadeSamples);
        }
        writeOffset += inLen - crossfadeSamples;
      }
    }
  }

  return stitched;
};

const DEFAULT_MANIFEST_CLIPS = [
  {
    "id": "radio_check",
    "category": "system",
    "title": "Radio Check",
    "filename": "radio_check.mp3",
    "scenario": "Session Start & Radio Check",
    "badge": "RADIO CHECK",
    "text": "Radio check, Max. Telemetry stream is active, tyres looking good.",
    "trigger": "session_start",
    "url": "/voice/clips/radio_check.mp3"
  },
  {
    "id": "brake_early_5m",
    "category": "braking",
    "title": "Brake 5m Early",
    "filename": "brake_early_5m.mp3",
    "scenario": "Early Braking by 5m",
    "badge": "BRAKE -5M",
    "delta_m": -5,
    "text": "Braking was about 5 meters early. You can carry slightly more speed on entry.",
    "url": "/voice/clips/brake_early_5m.mp3"
  },
  {
    "id": "brake_early_10m",
    "category": "braking",
    "title": "Brake 10m Early",
    "filename": "brake_early_10m.mp3",
    "scenario": "Early Braking by 10m",
    "badge": "BRAKE -10M",
    "delta_m": -10,
    "text": "Braked roughly 10 meters early. Entry speed was compromised.",
    "url": "/voice/clips/brake_early_10m.mp3"
  },
  {
    "id": "brake_early_15m",
    "category": "braking",
    "title": "Brake 15m Early",
    "filename": "brake_early_15m.mp3",
    "scenario": "Early Braking by 15m",
    "badge": "BRAKE -15M",
    "delta_m": -15,
    "text": "That was about 15 meters early on the brakes. We are giving away too much speed on entry.",
    "url": "/voice/clips/brake_early_15m.mp3"
  },
  {
    "id": "brake_early_20m",
    "category": "braking",
    "title": "Brake 20m Early",
    "filename": "brake_early_20m.mp3",
    "scenario": "Early Braking by 20m",
    "badge": "BRAKE -20M",
    "delta_m": -20,
    "text": "Braking point was 20 meters early. You have plenty of margin to brake later.",
    "url": "/voice/clips/brake_early_20m.mp3"
  },
  {
    "id": "brake_early_25m",
    "category": "braking",
    "title": "Brake 25m Early",
    "filename": "brake_early_25m.mp3",
    "scenario": "Early Braking by 25m",
    "badge": "BRAKE -25M",
    "delta_m": -25,
    "text": "Braked 25 meters early into the corner. Push that braking marker further.",
    "url": "/voice/clips/brake_early_25m.mp3"
  },
  {
    "id": "brake_early_30m",
    "category": "braking",
    "title": "Brake 30m Early",
    "filename": "brake_early_30m.mp3",
    "scenario": "Early Braking by 30m",
    "badge": "BRAKE -30M",
    "delta_m": -30,
    "text": "Way too conservative on the brakes, 30 meters early. Commit more on entry.",
    "url": "/voice/clips/brake_early_30m.mp3"
  },
  {
    "id": "brake_late_5m",
    "category": "braking",
    "title": "Brake 5m Late",
    "filename": "brake_late_5m.mp3",
    "scenario": "Late Braking by 5m",
    "badge": "BRAKE +5M",
    "delta_m": 5,
    "text": "Slightly deep on the brakes, roughly 5 meters late. Apex missed slightly.",
    "url": "/voice/clips/brake_late_5m.mp3"
  },
  {
    "id": "brake_late_10m",
    "category": "braking",
    "title": "Brake 10m Late",
    "filename": "brake_late_10m.mp3",
    "scenario": "Late Braking by 10m",
    "badge": "BRAKE +10M",
    "delta_m": 10,
    "text": "Braking was 10 meters late. We missed the optimal apex.",
    "url": "/voice/clips/brake_late_10m.mp3"
  },
  {
    "id": "brake_late_15m",
    "category": "braking",
    "title": "Brake 15m Late",
    "filename": "brake_late_15m.mp3",
    "scenario": "Late Braking by 15m",
    "badge": "BRAKE +15M",
    "delta_m": 15,
    "text": "Braked roughly 15 meters late into the turn. Struggling to rotate the car.",
    "url": "/voice/clips/brake_late_15m.mp3"
  },
  {
    "id": "brake_late_20m",
    "category": "braking",
    "title": "Brake 20m Late",
    "filename": "brake_late_20m.mp3",
    "scenario": "Late Braking by 20m",
    "badge": "BRAKE +20M",
    "delta_m": 20,
    "text": "That was 20 meters too deep on the brakes. Front tyres scrubbed wide.",
    "url": "/voice/clips/brake_late_20m.mp3"
  },
  {
    "id": "brake_late_25m",
    "category": "braking",
    "title": "Brake 25m Late",
    "filename": "brake_late_25m.mp3",
    "scenario": "Late Braking by 25m",
    "badge": "BRAKE +25M",
    "delta_m": 25,
    "text": "25 meters late on the brakes. Serious lockup risk, reset your reference marker.",
    "url": "/voice/clips/brake_late_25m.mp3"
  },
  {
    "id": "brake_late_30m",
    "category": "braking",
    "title": "Brake 30m Late",
    "filename": "brake_late_30m.mp3",
    "scenario": "Late Braking by 30m",
    "badge": "BRAKE +30M",
    "delta_m": 30,
    "text": "Massive overshoot, 30 meters late on the brakes. Bring the braking point back.",
    "url": "/voice/clips/brake_late_30m.mp3"
  },
  {
    "id": "traction_prev_lap",
    "category": "traction",
    "title": "Traction Down vs Prev Lap",
    "filename": "traction_prev_lap.mp3",
    "scenario": "Exit Traction Down vs Previous Lap",
    "badge": "TRACTION LOSS",
    "text": "Exit traction was down compared to last lap. Modulate the throttle smoother on exit.",
    "url": "/voice/clips/traction_prev_lap.mp3"
  },
  {
    "id": "traction_snap_wheelspin",
    "category": "traction",
    "title": "Wheelspin on Exit",
    "filename": "traction_snap_wheelspin.mp3",
    "scenario": "Rear Slip & Wheelspin on Exit Kerb",
    "badge": "WHEELSPIN",
    "text": "Noticeable rear slip and wheelspin on exit. Be gentle on the kerbs on throttle application.",
    "url": "/voice/clips/traction_snap_wheelspin.mp3"
  },
  {
    "id": "traction_stint_drop",
    "category": "traction",
    "title": "Stint Traction Loss",
    "filename": "traction_stint_drop.mp3",
    "scenario": "Stint Cumulative Traction Loss",
    "badge": "REAR DEGRADATION",
    "text": "We are losing exit traction throughout this stint. Rear tyres are overheating, manage throttle.",
    "url": "/voice/clips/traction_stint_drop.mp3"
  },
  {
    "id": "traction_delayed_throttle",
    "category": "traction",
    "title": "Delayed Throttle Pickup",
    "filename": "traction_delayed_throttle.mp3",
    "scenario": "Delayed Throttle Application",
    "badge": "THROTTLE ON",
    "text": "Throttle pickup was delayed on exit. Trust the rear grip and get on power earlier.",
    "url": "/voice/clips/traction_delayed_throttle.mp3"
  },
  {
    "id": "tyre_soft_deg_5pct",
    "category": "tyre_deg",
    "title": "Soft Deg > 5%",
    "filename": "tyre_soft_deg_5pct.mp3",
    "scenario": "Soft Tyre High Degradation (>5%/lap)",
    "badge": "SOFT DEG > 5%",
    "compound": "Soft",
    "wear_rate": 5,
    "text": "Soft tyre degradation is high, over 5 percent per lap. Protect the rear traction.",
    "url": "/voice/clips/tyre_soft_deg_5pct.mp3"
  },
  {
    "id": "tyre_soft_deg_10pct",
    "category": "tyre_deg",
    "title": "Soft Deg > 10% (Critical)",
    "filename": "tyre_soft_deg_10pct.mp3",
    "scenario": "Soft Tyre Critical Degradation (>10%/lap)",
    "badge": "SOFT CRITICAL",
    "compound": "Soft",
    "wear_rate": 10,
    "text": "Critical degradation on the Softs, dropping 10 percent a lap. Tyres are falling off a cliff.",
    "url": "/voice/clips/tyre_soft_deg_10pct.mp3"
  },
  {
    "id": "tyre_med_deg_5pct",
    "category": "tyre_deg",
    "title": "Medium Deg > 5%",
    "filename": "tyre_med_deg_5pct.mp3",
    "scenario": "Medium Tyre High Degradation (>5%/lap)",
    "badge": "MED DEG > 5%",
    "compound": "Medium",
    "wear_rate": 5,
    "text": "Degradation on the Medium is higher than expected, roughly 5 percent a lap. Manage high speed loads.",
    "url": "/voice/clips/tyre_med_deg_5pct.mp3"
  },
  {
    "id": "tyre_med_deg_10pct",
    "category": "tyre_deg",
    "title": "Medium Deg > 10% (Critical)",
    "filename": "tyre_med_deg_10pct.mp3",
    "scenario": "Medium Tyre Critical Degradation (>10%/lap)",
    "badge": "MED CRITICAL",
    "compound": "Medium",
    "wear_rate": 10,
    "text": "Severe degradation on Mediums, nearly 10 percent a lap. We cannot sustain this stint.",
    "url": "/voice/clips/tyre_med_deg_10pct.mp3"
  },
  {
    "id": "tyre_hard_deg_5pct",
    "category": "tyre_deg",
    "title": "Hard Deg > 5%",
    "filename": "tyre_hard_deg_5pct.mp3",
    "scenario": "Hard Tyre High Degradation (>5%/lap)",
    "badge": "HARD DEG > 5%",
    "compound": "Hard",
    "wear_rate": 5,
    "text": "Hard tyre wear is running at 5 percent per lap. We need to nurse them to hit our target lap.",
    "url": "/voice/clips/tyre_hard_deg_5pct.mp3"
  },
  {
    "id": "tyre_hard_deg_10pct",
    "category": "tyre_deg",
    "title": "Hard Deg > 10% (Critical)",
    "filename": "tyre_hard_deg_10pct.mp3",
    "scenario": "Hard Tyre Critical Degradation (>10%/lap)",
    "badge": "HARD CRITICAL",
    "compound": "Hard",
    "wear_rate": 10,
    "text": "Hard tyres are tearing up, 10 percent wear per lap. Prepare for an emergency stop.",
    "url": "/voice/clips/tyre_hard_deg_10pct.mp3"
  },
  {
    "id": "box_window_open",
    "category": "tyre_deg",
    "title": "Box Window Open",
    "filename": "box_window_open.mp3",
    "scenario": "Pit Stop Window Open",
    "badge": "PIT WINDOW",
    "text": "Box window is open, Max. Standby for the pit call.",
    "url": "/voice/clips/box_window_open.mp3"
  },
  {
    "id": "box_this_lap",
    "category": "tyre_deg",
    "title": "Box This Lap",
    "filename": "box_this_lap.mp3",
    "scenario": "Immediate Pit Call (Box, Box!)",
    "badge": "BOX THIS LAP",
    "text": "Box this lap, Max. Box this lap. Confirm we are boxing.",
    "url": "/voice/clips/box_this_lap.mp3"
  },
  {
    "id": "pace_green",
    "category": "pace_delta",
    "title": "Pace Strong (-0.2s)",
    "filename": "pace_green.mp3",
    "scenario": "Pace Improving (-0.2s faster)",
    "badge": "DELTA -0.2S",
    "delta_sec": -0.2,
    "text": "Pace is very strong, delta is negative two tenths. Keep this rhythm.",
    "url": "/voice/clips/pace_green.mp3"
  },
  {
    "id": "pace_drop_half_sec",
    "category": "pace_delta",
    "title": "Pace Drop (+0.5s)",
    "filename": "pace_drop_half_sec.mp3",
    "scenario": "Pace Slower (+0.5s drop)",
    "badge": "DELTA +0.5S",
    "delta_sec": 0.5,
    "text": "Pace dropped by roughly half a second compared to last lap. Watch the mid-corner rotation.",
    "url": "/voice/clips/pace_drop_half_sec.mp3"
  },
  {
    "id": "pace_drop_1sec_box",
    "category": "pace_delta",
    "title": "Pace Drop > 1.0s (Box Order)",
    "filename": "pace_drop_1sec_box.mp3",
    "scenario": "Severe Pace Loss (>1.0s) -> Urgent Box Call",
    "badge": "DELTA +1.0S BOX",
    "delta_sec": 1.0,
    "text": "Pace has dropped over a full second compared to last lap. Tyres are finished, box this lap for fresh rubber.",
    "url": "/voice/clips/pace_drop_1sec_box.mp3"
  },
  {
    "id": "pace_drop_severe_box",
    "category": "pace_delta",
    "title": "Pace Drop > 1.2s (Bleeding Time)",
    "filename": "pace_drop_severe_box.mp3",
    "scenario": "Severe Degradation (>1.2s drop) -> Immediate Box",
    "badge": "DELTA +1.2S BOX",
    "delta_sec": 1.2,
    "text": "Delta is plus 1.2 seconds, we are bleeding too much lap time. Box this lap, box this lap.",
    "url": "/voice/clips/pace_drop_severe_box.mp3"
  },
  {
    "id": "gap_ahead_drs",
    "category": "rival_gap",
    "title": "Car Ahead < 1.0s (DRS)",
    "filename": "gap_ahead_drs.mp3",
    "scenario": "Rival Ahead in DRS Range (<1.0s)",
    "badge": "AHEAD < 1.0S",
    "target": "ahead",
    "gap_sec": 0.8,
    "text": "Gap to car ahead is under a second. DRS is available, push now.",
    "url": "/voice/clips/gap_ahead_drs.mp3"
  },
  {
    "id": "gap_ahead_1_5s",
    "category": "rival_gap",
    "title": "Car Ahead 1.5s",
    "filename": "gap_ahead_1_5s.mp3",
    "scenario": "Rival Ahead 1.5s Interval",
    "badge": "AHEAD 1.5S",
    "target": "ahead",
    "gap_sec": 1.5,
    "text": "Gap to car ahead is roughly 1.5 seconds. You are closing by two tenths a lap.",
    "url": "/voice/clips/gap_ahead_1_5s.mp3"
  },
  {
    "id": "gap_ahead_2s",
    "category": "rival_gap",
    "title": "Car Ahead 2.0s",
    "filename": "gap_ahead_2s.mp3",
    "scenario": "Rival Ahead 2.0s Interval",
    "badge": "AHEAD 2.0S",
    "target": "ahead",
    "gap_sec": 2.0,
    "text": "Gap to car ahead is 2 seconds. Keep chipping away.",
    "url": "/voice/clips/gap_ahead_2s.mp3"
  },
  {
    "id": "gap_ahead_3s",
    "category": "rival_gap",
    "title": "Car Ahead 3.0s",
    "filename": "gap_ahead_3s.mp3",
    "scenario": "Rival Ahead 3.0s Interval",
    "badge": "AHEAD 3.0S",
    "target": "ahead",
    "gap_sec": 3.0,
    "text": "Gap to car ahead is 3 seconds. Clean air ahead, build the tyre delta.",
    "url": "/voice/clips/gap_ahead_3s.mp3"
  },
  {
    "id": "gap_ahead_5s",
    "category": "rival_gap",
    "title": "Car Ahead 5.0s",
    "filename": "gap_ahead_5s.mp3",
    "scenario": "Rival Ahead 5.0s Interval",
    "badge": "AHEAD 5.0S",
    "target": "ahead",
    "gap_sec": 5.0,
    "text": "Gap to car ahead is 5 seconds. Focus on your own delta.",
    "url": "/voice/clips/gap_ahead_5s.mp3"
  },
  {
    "id": "gap_leader_3s",
    "category": "rival_gap",
    "title": "Leader 3.0s",
    "filename": "gap_leader_3s.mp3",
    "scenario": "Gap to Race Leader 3.0s",
    "badge": "LEADER 3.0S",
    "target": "leader",
    "gap_sec": 3.0,
    "text": "Gap to the leader is roughly 3 seconds. Your pace is matching.",
    "url": "/voice/clips/gap_leader_3s.mp3"
  },
  {
    "id": "gap_leader_5s",
    "category": "rival_gap",
    "title": "Leader 5.0s",
    "filename": "gap_leader_5s.mp3",
    "scenario": "Gap to Race Leader 5.0s",
    "badge": "LEADER 5.0S",
    "target": "leader",
    "gap_sec": 5.0,
    "text": "Gap to the leader is 5 seconds. Managing the gap well.",
    "url": "/voice/clips/gap_leader_5s.mp3"
  },
  {
    "id": "gap_leader_10s",
    "category": "rival_gap",
    "title": "Leader 10.0s",
    "filename": "gap_leader_10s.mp3",
    "scenario": "Gap to Race Leader 10.0s",
    "badge": "LEADER 10.0S",
    "target": "leader",
    "gap_sec": 10.0,
    "text": "Gap to the leader is 10 seconds. We are running in clean air.",
    "url": "/voice/clips/gap_leader_10s.mp3"
  },
  {
    "id": "gap_teammate_2s",
    "category": "rival_gap",
    "title": "Teammate 2.0s",
    "filename": "gap_teammate_2s.mp3",
    "scenario": "Gap to Teammate 2.0s",
    "badge": "TEAMMATE 2.0S",
    "target": "teammate",
    "gap_sec": 2.0,
    "text": "Gap to your teammate is 2 seconds. Maintaining position.",
    "url": "/voice/clips/gap_teammate_2s.mp3"
  },
  {
    "id": "gap_teammate_5s",
    "category": "rival_gap",
    "title": "Teammate 5.0s Behind",
    "filename": "gap_teammate_5s.mp3",
    "scenario": "Teammate 5.0s Behind",
    "badge": "TEAMMATE 5.0S",
    "target": "teammate",
    "gap_sec": 5.0,
    "text": "Teammate is 5 seconds behind. No pressure from behind.",
    "url": "/voice/clips/gap_teammate_5s.mp3"
  }
];


// Driver -> engineer questions. Free text (Korean / English keywords) or one of the presets.
function EngineerAskBox({ language, onAnswer }) {
  const [presets, setPresets] = useState([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8080/api/qa/presets')
      .then((r) => r.json())
      .then((d) => setPresets(d.presets || []))
      .catch(() => {});
  }, []);

  const ask = async (question) => {
    const q = (question || '').trim();
    if (!q || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('http://localhost:8080/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: q }),
      });
      const data = await res.json();
      if (data.event) onAnswer(data.event);
      setText('');
    } catch (e) {
      setError(language === 'ko' ? '엔지니어와 연결되지 않았습니다.' : 'No connection to the engineer.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff', marginBottom: '8px' }}>
        🎧 {language === 'ko' ? '엔지니어에게 질문' : 'Ask the engineer'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
        {presets.map((p) => (
          <button
            key={p.intent}
            type="button"
            disabled={busy}
            onClick={() => ask(language === 'ko' ? p.ko : p.en)}
            className="btn-secondary-light"
            style={{ fontSize: '11px', padding: '4px 10px' }}
          >
            {language === 'ko' ? p.ko : p.en}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(text);
        }}
        style={{ display: 'flex', gap: '6px' }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={language === 'ko' ? '예: 앞차 잡으려면 어떻게 해?' : 'e.g. How do I catch the car ahead?'}
          className="cb-select"
          style={{ flex: 1, minWidth: 0 }}
        />
        <button type="submit" disabled={busy || !text.trim()} className="btn-secondary-light" style={{ fontSize: '12px' }}>
          {busy ? '…' : language === 'ko' ? '질문' : 'Ask'}
        </button>
      </form>
      {error && <div style={{ fontSize: '11px', color: '#ff8a8a', marginTop: '6px' }}>{error}</div>}
    </div>
  );
}

function RadioTestConsole({
  manifestClips,
  isPlayingVoice,
  currentVoiceClip,
  onPlayClip,
  onStopClip,
  t = {},
  isDarkMode = true,
}) {
  const [voiceCategory, setVoiceCategory] = useState("all");

  const categories = [
    { id: 'all', label: 'ALL', count: manifestClips.length, color: '#0052FF' },
    { id: 'braking', label: 'BRAKING (5~30M)', count: manifestClips.filter(c => c.category === 'braking').length, color: '#FF3B30' },
    { id: 'traction', label: 'TRACTION', count: manifestClips.filter(c => c.category === 'traction').length, color: '#FF9500' },
    { id: 'tyre_deg', label: 'TYRE & BOX', count: manifestClips.filter(c => c.category === 'tyre_deg').length, color: '#AF52DE' },
    { id: 'pace_delta', label: 'PACE DELTA', count: manifestClips.filter(c => c.category === 'pace_delta').length, color: '#34C759' },
    { id: 'rival_gap', label: 'RIVAL GAP', count: manifestClips.filter(c => c.category === 'rival_gap').length, color: '#5856D6' },
  ];

  const filteredClips = manifestClips.filter(
    (c) => voiceCategory === 'all' || c.category === voiceCategory
  );

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Category Pills Bar (Multi-row Wrap with High-Contrast Accent Pills) */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          flexWrap: 'wrap',
          padding: '8px 10px',
          borderRadius: 'var(--rounded-md)',
          backgroundColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.04)',
          border: isDarkMode ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.1)',
          marginBottom: '12px',
        }}
      >
        {categories.map((cat) => {
          const isActive = voiceCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setVoiceCategory(cat.id)}
              style={{
                backgroundColor: isActive
                  ? cat.color
                  : isDarkMode
                  ? 'rgba(255, 255, 255, 0.08)'
                  : '#ffffff',
                color: isActive ? '#ffffff' : isDarkMode ? '#cfd3dc' : '#374151',
                border: isActive
                  ? `1px solid ${cat.color}`
                  : isDarkMode
                  ? '1px solid rgba(255, 255, 255, 0.16)'
                  : '1px solid #d1d5db',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: 'var(--rounded-pill)',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? `0 0 10px ${cat.color}66` : 'none',
              }}
            >
              <span>{cat.label}</span>
              <span
                style={{
                  backgroundColor: isActive
                    ? 'rgba(255,255,255,0.28)'
                    : isDarkMode
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(0,0,0,0.08)',
                  color: isActive ? '#ffffff' : isDarkMode ? '#ffffff' : '#1f2937',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                }}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Voice Clips Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '8px',
          maxHeight: isDarkMode ? '240px' : '220px',
          overflowY: 'auto',
          paddingRight: '4px',
        }}
      >
        {filteredClips.map((clip) => {
          const isPlaying = isPlayingVoice && currentVoiceClip?.id === clip.id;
          return (
            <button
              key={clip.id}
              onClick={() => onPlayClip(clip)}
              className={`voice-test-btn ${isPlaying ? 'active' : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '8px 10px',
                gap: '4px',
                backgroundColor: isPlaying
                  ? 'var(--color-primary)'
                  : isDarkMode
                  ? 'var(--color-surface-dark-elevated)'
                  : '#ffffff',
                border: isPlaying
                  ? '1px solid var(--color-primary)'
                  : isDarkMode
                  ? '1px solid rgba(255,255,255,0.1)'
                  : '1px solid var(--color-hairline)',
                color: isPlaying ? '#ffffff' : isDarkMode ? '#ffffff' : 'var(--color-ink)',
                borderRadius: 'var(--rounded-md)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, fontSize: '11px' }}>{clip.title}</span>
                {isPlaying && <span style={{ fontSize: '10px' }}>🔊</span>}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: isPlaying ? 'rgba(255,255,255,0.9)' : isDarkMode ? '#888ea0' : 'var(--color-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {clip.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Team-radio chime played in front of every engineer line (backend/data/voice/f1_radio.mp3, served at /voice).
// Decoded once; its leading/trailing silence is trimmed so the voice follows right after the chime.
// It plays as recorded (not through the radio filter). If the file is missing, lines play without it.
const RADIO_INTRO_URL = 'http://localhost:8080/voice/f1_radio.mp3';
const RADIO_INTRO_GAP_S = 0.08;   // pause between the chime and the voice
let radioIntroPromise = null;
const loadRadioIntro = (ctx) => {
  if (!radioIntroPromise) {
    radioIntroPromise = (async () => {
      const res = await fetch(RADIO_INTRO_URL);
      if (!res.ok) return null;
      const buffer = await ctx.decodeAudioData(await res.arrayBuffer());
      const thr = 0.01;   // -40 dBFS
      let on = buffer.length, off = 0;
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        const d = buffer.getChannelData(ch);
        let i = 0; while (i < d.length && Math.abs(d[i]) < thr) i++;
        let j = d.length - 1; while (j > i && Math.abs(d[j]) < thr) j--;
        if (i < d.length) { on = Math.min(on, i); off = Math.max(off, j); }
      }
      if (on >= off) return null;
      const start = Math.max(0, on / buffer.sampleRate - 0.01);
      const end = Math.min(buffer.duration, off / buffer.sampleRate + 0.03);
      return { buffer, start, duration: end - start };
    })().catch(() => { radioIntroPromise = null; return null; });
  }
  return radioIntroPromise;
};

// The engineer lines were synthesised at 0.9x (GPT-SoVITS speed_factor 0.9, see project/README.md). Play them at
// 1/0.9 so they come out at the voice's natural pace; the pitch is kept (browser time-stretch, preservesPitch).
const VOICE_SPEED = 1.11;

// Cut leading/trailing silence (below about -44 dBFS), keeping short pads so words are not clipped.
// Used on every decoded line and on each segment before stitching, so joined segments do not leave
// long pauses between words.
const trimSilence = (ctx, buf, padStart = 0.03, padEnd = 0.06, thr = 0.006) => {
  let on = buf.length, off = 0;
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const d = buf.getChannelData(ch);
    let i = 0; while (i < d.length && Math.abs(d[i]) < thr) i++;
    let j = d.length - 1; while (j > i && Math.abs(d[j]) < thr) j--;
    if (i < d.length) { on = Math.min(on, i); off = Math.max(off, j); }
  }
  if (on >= off) return buf;
  const sr = buf.sampleRate;
  const a = Math.max(0, on - Math.round(padStart * sr)), b = Math.min(buf.length, off + Math.round(padEnd * sr));
  if (a === 0 && b === buf.length) return buf;
  const out = ctx.createBuffer(buf.numberOfChannels, b - a, sr);
  for (let ch = 0; ch < buf.numberOfChannels; ch++) out.copyToChannel(buf.getChannelData(ch).subarray(a, b), ch);
  return out;
};

// AudioBuffer -> 16-bit PCM WAV object URL, so the line can play through an <audio> element (pitch-kept speed-up).
const bufferToWavUrl = (buf) => {
  const ch = buf.numberOfChannels, n = buf.length, bytes = 44 + n * ch * 2;
  const view = new DataView(new ArrayBuffer(bytes));
  const str = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, bytes - 8, true); str(8, 'WAVEfmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, ch, true);
  view.setUint32(24, buf.sampleRate, true); view.setUint32(28, buf.sampleRate * ch * 2, true);
  view.setUint16(32, ch * 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, n * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++, o += 2) {
    const s = Math.max(-1, Math.min(1, data[c][i]));
    view.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return URL.createObjectURL(new Blob([view.buffer], { type: 'audio/wav' }));
};

function useVoicePlayer() {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [currentVoiceClip, setCurrentVoiceClip] = useState(null);
  const [activeVoiceTranscript, setActiveVoiceTranscript] = useState(null);
  const audioRef = useRef(null);
  const activeSourcesRef = useRef([]);   // chime + voice nodes of the line now playing
  const playTokenRef = useRef(0);        // a newer line cancels one still loading

  // Chime first, then the voice through the radio filter at VOICE_SPEED with the pitch kept.
  const startWithRadioIntro = async (ctx, voiceBuffer, token) => {
    const intro = await loadRadioIntro(ctx);
    if (token !== playTokenRef.current) return null;
    const nodes = [];
    let voiceDelayS = 0.02;
    if (intro) {
      const chime = ctx.createBufferSource();
      chime.buffer = intro.buffer;
      chime.connect(ctx.destination);
      chime.start(ctx.currentTime + 0.02, intro.start, intro.duration);
      nodes.push(chime);
      voiceDelayS = 0.02 + intro.duration + RADIO_INTRO_GAP_S;
    }
    const url = bufferToWavUrl(trimSilence(ctx, voiceBuffer));
    const voice = new Audio(url);
    voice.preservesPitch = true;
    voice.defaultPlaybackRate = VOICE_SPEED;
    voice.playbackRate = VOICE_SPEED;
    ctx.createMediaElementSource(voice).connect(createF1RadioFX(ctx, ctx.destination));
    let released = false;
    const release = () => { if (!released) { released = true; URL.revokeObjectURL(url); } };
    const finish = () => {
      release();
      if (token !== playTokenRef.current) return;
      setIsPlayingVoice(false);
      activeSourcesRef.current = [];
    };
    voice.onended = finish;
    voice.onerror = finish;
    const timer = setTimeout(() => {
      if (token === playTokenRef.current) voice.play().catch(finish);
    }, voiceDelayS * 1000);
    nodes.push({ stop: () => { clearTimeout(timer); voice.pause(); release(); } });
    activeSourcesRef.current = nodes;
    return voice;
  };

  const stopVoiceClip = () => {
    playTokenRef.current += 1;
    for (const node of activeSourcesRef.current) {
      try { node.stop(); } catch (e) {}
    }
    activeSourcesRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlayingVoice(false);
  };

  const playVoiceClip = async (clip) => {
    if (!clip) return;
    stopVoiceClip();
    const token = playTokenRef.current;

    setCurrentVoiceClip(clip);
    setActiveVoiceTranscript({
      text: clip.text,
      text_ko: clip.text_ko,
      details: clip.details,
      question: clip.question,
      scenario: clip.scenario,
      title: clip.title,
      badge: clip.badge || 'RADIO',
    });
    setIsPlayingVoice(true);

    // Engineer answers / setup advice are built from pre-baked lines; if none of the files exist
    // yet, show the text instead of falling back to an unrelated clip.
    if ((clip.type === 'qa_answer' || clip.type === 'setup_advice') && !(clip.segments && clip.segments.length)) {
      setTimeout(() => setIsPlayingVoice(false), 2500);
      return;
    }

    const ctx = getAudioContext();

    // Modular stitched event with multiple segments
    if (clip.segments && clip.segments.length > 0 && ctx) {
      try {
        const decodedBuffers = [];
        for (const segUrl of clip.segments) {
          const fullUrl = segUrl.startsWith('http') ? segUrl : `http://localhost:8080${segUrl}`;
          try {
            const res = await fetch(fullUrl);
            if (res.ok) {
              const arrayBuf = await res.arrayBuffer();
              const decoded = await ctx.decodeAudioData(arrayBuf);
              decodedBuffers.push(trimSilence(ctx, decoded, 0.02, 0.05));   // no long pauses at the joins
            } else {
              console.warn(`Segment 404: ${fullUrl}, skipping segment`);
            }
          } catch (e) {
            console.warn(`Segment decode error: ${fullUrl}`);
          }
        }

        if (token !== playTokenRef.current) return;
        if (decodedBuffers.length > 0) {
          const stitchedBuffer = stitchAudioBuffers(ctx, decodedBuffers, 35);
          if (stitchedBuffer) {
            // radio chime, then the stitched line through the F1 radio bandpass & saturation FX
            await startWithRadioIntro(ctx, stitchedBuffer, token);
            return;
          }
        }
      } catch (err) {
        console.warn("Modular stitching error, falling back smoothly:", err);
      }
    }

    // Standard audio clip playback (resolve url or filename)
    const rawPath = clip.url || (clip.filename ? `/voice/clips/${clip.filename}` : null) || clip.fallback_url || '/voice/clips/radio_check.mp3';
    const audioUrl = rawPath.startsWith('http') ? rawPath : `http://localhost:8080${rawPath}`;

    // Prefer Web Audio API with realistic F1 team radio bandpass filter
    if (ctx) {
      try {
        const res = await fetch(audioUrl);
        if (res.ok) {
          const arrayBuf = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuf);
          if (token !== playTokenRef.current) return;
          await startWithRadioIntro(ctx, decoded, token);
          return;
        } else {
          // File not yet present on disk: display transcript and reset after 3s
          setTimeout(() => setIsPlayingVoice(false), 3000);
          return;
        }
      } catch (e) {
        setTimeout(() => setIsPlayingVoice(false), 3000);
        return;
      }
    }

    const audio = new Audio(audioUrl);
    audio.preservesPitch = true;
    audio.defaultPlaybackRate = VOICE_SPEED;
    audio.playbackRate = VOICE_SPEED;
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlayingVoice(false);
    };

    audio.onerror = () => {
      setIsPlayingVoice(false);
    };

    audio.play().catch(() => {
      setIsPlayingVoice(false);
    });
  };

  return {
    isPlayingVoice,
    setIsPlayingVoice,
    currentVoiceClip,
    activeVoiceTranscript,
    setActiveVoiceTranscript,
    playVoiceClip,
    stopVoiceClip,
  };
}

// ---- TV overlay switch. The backend owns the ON/OFF state (remembered, default ON): when ON, the overlay starts
// by itself on the first game packet it parses and draws only while game data flows; OFF stops it.
const TV_TEXT = {
  en: {
    off: ['📺 TV OFF', 'TV overlay is off. Click to turn it on.'],
    needs_install: ['📺 TV INSTALL', 'The overlay window is not installed yet. Click to download it once (Electron, ~370 MB).'],
    installing: ['📺 TV INSTALLING…', 'Downloading the overlay window (one time). It starts by itself when game data arrives.'],
    waiting: ['📺 TV READY', 'ON: waiting for game data. The overlay appears by itself as soon as the game sends telemetry. Click to turn off.'],
    starting: ['📺 TV STARTING…', 'Game data detected: starting the overlay.'],
    ready: ['📺 TV READY', 'ON: overlay running, no game data right now. Click to turn off.'],
    live: ['📺 TV ON', 'ON: showing live game data. Ctrl+Alt+H show/hide, Ctrl+Alt+E edit layout. Click to turn off.'],
    error: ['📺 TV ERROR', 'TV overlay error'],
  },
  ko: {
    off: ['📺 TV OFF', 'TV 오버레이가 꺼져 있어요. 누르면 켜집니다.'],
    needs_install: ['📺 TV 설치', '오버레이 창이 아직 설치되지 않았어요. 누르면 한 번만 내려받아요 (Electron, 약 370MB).'],
    installing: ['📺 TV 설치 중…', '오버레이 창을 내려받는 중이에요 (최초 1회). 끝나면 게임 데이터가 들어올 때 자동으로 켜져요.'],
    waiting: ['📺 TV 대기', 'ON: 게임 데이터를 기다리는 중이에요. 게임이 텔레메트리를 보내는 순간 오버레이가 자동으로 나타나요. 누르면 꺼집니다.'],
    starting: ['📺 TV 시작 중…', '게임 데이터 감지: 오버레이를 켜는 중이에요.'],
    ready: ['📺 TV 대기', 'ON: 오버레이는 켜져 있고 지금은 게임 데이터가 없어요. 누르면 꺼집니다.'],
    live: ['📺 TV ON', 'ON: 실시간 게임 데이터를 표시 중이에요. Ctrl+Alt+H 표시/숨김, Ctrl+Alt+E 배치 편집. 누르면 꺼집니다.'],
    error: ['📺 TV 오류', 'TV 오버레이 오류'],
  },
};
const TV_DOT = { live: 'var(--color-semantic-up)', error: 'var(--color-semantic-down)' };

function useTvOverlay() {
  const [st, setSt] = useState(null);
  const call = (path, method = 'GET', body) =>
    fetch(`http://localhost:8080/api/overlay/${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
      .then((r) => r.json())
      .then((s) => { setSt(s); return s; })
      .catch(() => setSt({ enabled: false, state: 'error', error: 'Backend not reachable' }));
  useEffect(() => {
    call('status');
    const id = setInterval(() => call('status'), 2500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setEnabled = (on) => call('enable', 'POST', { enabled: on });
  const install = () => call('install', 'POST');
  // one-button form (dashboard header): install when needed, otherwise ON <-> OFF
  const toggle = () => (st?.state === 'needs_install' ? install() : setEnabled(!st?.enabled));
  return { st, state: st?.state || 'off', setEnabled, install, toggle };
}

function tvText(language, state) {
  return (TV_TEXT[language] || TV_TEXT.en)[state] || TV_TEXT.en.off;
}

function TvOverlayButton({ tv, language }) {
  const [label, tip] = tvText(language, tv.state);
  const dot = TV_DOT[tv.state] || (tv.st?.enabled ? '#f5a623' : null);
  return (
    <button
      onClick={tv.toggle}
      className={`btn-secondary-light ${tv.st?.enabled ? 'active' : ''}`}
      title={tv.state === 'error' && tv.st?.error ? `${tip}: ${tv.st.error}` : tip}
      style={tv.state === 'error' ? { borderColor: 'var(--color-semantic-down)', color: 'var(--color-semantic-down)' } : undefined}
    >
      {label}
      {dot && <span style={{ color: dot, marginLeft: '6px' }}>●</span>}
    </button>
  );
}

function Dashboard({ settings, setSettings, onExit }) {
  const t = i18n[settings.language || 'ko'];
  const [data, setData] = useState(null);
    const [manifestClips, setManifestClips] = useState(DEFAULT_MANIFEST_CLIPS);
  const [autoRadioEnabled, setAutoRadioEnabled] = useState(true);
  const lastTriggeredVoiceIdRef = useRef(null);

  // Load clips from manifest.json API on mount
  useEffect(() => {
    fetch('http://localhost:8080/api/voice/clips')
      .then((res) => res.json())
      .then((resData) => {
        if (resData.clips && resData.clips.length > 0) {
          setManifestClips(resData.clips);
        }
      })
      .catch(() => {});
  }, []);

  const {
    isPlayingVoice,
    currentVoiceClip,
    activeVoiceTranscript,
    setActiveVoiceTranscript,
    playVoiceClip,
    stopVoiceClip,
  } = useVoicePlayer();

  // ---- TV overlay switch (state lives in the backend; see useTvOverlay)
  const tv = useTvOverlay();



  // Initial Radio Check on session start if TTS enabled
  useEffect(() => {
    if (settings.tts && settings.voice === 'redbull') {
      const timer = setTimeout(() => {
        if (!lastTriggeredVoiceIdRef.current) {
          lastTriggeredVoiceIdRef.current = 'initial_auto_check';
          playVoiceClip(manifestClips[0]);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);
  const [connected, setConnected] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedLapId, setSelectedLapId] = useState(null);
  const [comparisonMode, setComparisonMode] = useState('ahead');
  const [selectedMapPoint, setSelectedMapPoint] = useState(0);
  const [showTelemetryBars, setShowTelemetryBars] = useState(true);

  // Track whether initial lap auto-selection has occurred so WebSocket frames never overwrite user clicks
  const hasAutoSelectedLapRef = useRef(false);

  const [visibleSpeeds, setVisibleSpeeds] = useState({});
  const toggleSpeed = (id) =>
    setVisibleSpeeds((prev) => ({
      ...prev,
      [id]: prev[id] === undefined ? false : !prev[id],
    }));
  const historyRef = useRef([]);

  const defaultPlayer =
    data?.players?.find((p) => p.name && p.name.includes('(You)')) ||
    data?.players?.[0];
  const activePlayerId =
    selectedPlayerId || (defaultPlayer ? defaultPlayer.id : 'p_0');

  useEffect(() => {
    let wsUrl = `ws://localhost:8080/ws?port=${settings.port}&rate=${settings.updateRate}&units=${settings.units}&replay=${settings.useRawReplay}`;
    if (settings.useRawReplay) {
      wsUrl += `&circuit=${encodeURIComponent(settings.replayCircuit || 'circuit_Catalunya')}&lap=${encodeURIComponent(settings.replayLap || 'all')}&speed=${settings.replaySpeed || 2.0}&loop=true`;
      if (settings.replaySession) wsUrl += `&session=${encodeURIComponent(settings.replaySession)}`;
    }
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const parsedData = JSON.parse(event.data);
        if (parsedData.status === 'waiting_for_data') {
          return;
        }
        setData(parsedData);

        if (parsedData.voice_clips && parsedData.voice_clips.length > 0) {
          setManifestClips(parsedData.voice_clips);
        }

        // Auto Radio Briefing integration
        if (parsedData.voice_event && settings.tts) {
          const ev = parsedData.voice_event;
          if (ev.event_id && ev.event_id !== lastTriggeredVoiceIdRef.current) {
            lastTriggeredVoiceIdRef.current = ev.event_id;
            if (autoRadioEnabled) {
              playVoiceClip(ev);
            } else {
              setActiveVoiceTranscript({
                text: ev.text,
                scenario: ev.scenario,
                title: ev.title,
                badge: ev.badge || 'RADIO',
              });
            }
          }
        }

        if (!hasAutoSelectedLapRef.current && parsedData.players) {
          const you =
            parsedData.players.find((p) => p.name && p.name.includes('(You)')) ||
            parsedData.players[0];
          if (you && you.lap_history && you.lap_history.length > 0) {
            // Find the latest lap that has valid corners passed, or fallback to last lap
            const validLaps = you.lap_history.filter(
              (l) => l.corners && l.corners.some((c) => c.passed && c.entry_speed !== '-')
            );
            const targetLap =
              validLaps.length > 0
                ? validLaps[validLaps.length - 1].lap
                : you.lap_history[you.lap_history.length - 1].lap;
            hasAutoSelectedLapRef.current = true;
            setSelectedLapId((prev) => (prev !== null ? prev : targetLap));
          }
        }
      } catch (err) {
        console.error('Failed to parse telemetry payload:', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [
    settings.port,
    settings.units,
    settings.updateRate,
    settings.useRawReplay,
    settings.replayCircuit,
    settings.replaySession,
    settings.replayLap,
    settings.replaySpeed,
  ]);

  if (data && data.players) {
    const newPoint = { time: Date.now() };
    data.players.forEach((p) => {
      newPoint[`speed_${p.id}`] = p.live_telemetry.speed;
      if (p.id === activePlayerId) {
        newPoint.throttle = p.live_telemetry.throttle;
        newPoint.brake = p.live_telemetry.brake;
      }
    });
    historyRef.current.push(newPoint);
    if (historyRef.current.length > 160) historyRef.current.shift();
  }
  const history = historyRef.current;

  if (!data) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: 'var(--color-canvas)',
          color: 'var(--color-ink)',
          gap: '16px',
        }}
      >
        <div className="cb-brand-mark" style={{ width: '48px', height: '48px', fontSize: '18px' }}>
          F1
        </div>
        <h2 className="hero-heading" style={{ fontSize: '32px' }}>
          Connecting to Telemetry Stream...
        </h2>
        <p style={{ color: 'var(--color-body)', fontSize: '14px', margin: 0 }}>
          ws://localhost:8080/ws · Port {settings.port}
        </p>
      </div>
    );
  }

  const {
    circuit_environment,
    players,
    sector_comparisons,
    circuit_corners = [],
    reference_track = [],
  } = data;
  const selectedPlayer =
    players.find((p) => p.id === activePlayerId) || players[0];
  const {
    live_telemetry,
    car_setup,
    lap_history = [],
    current_lap,
    name,
    tyre_compound,
    strategy,
    sector_history = [],
    best_info = {},
    current_telemetry = [],
    live_corners = [],
  } = selectedPlayer;

  const isLiveLapSelected = selectedLapId === 'live';
  const selectedLap =
    !isLiveLapSelected && lap_history.length > 0
      ? lap_history.find((l) => String(l.lap) === String(selectedLapId)) ||
        lap_history[lap_history.length - 1]
      : null;

  // Resolve active corner analysis list for the selected lap (or live lap)
  const resolveCornerList = () => {
    if (!isLiveLapSelected && selectedLap && selectedLap.corners && selectedLap.corners.length > 0) {
      return selectedLap.corners;
    }
    if (live_corners && live_corners.length > 0) {
      return live_corners;
    }
    if (lap_history.length > 0) {
      const lastCompleted = lap_history[lap_history.length - 1];
      if (lastCompleted.corners && lastCompleted.corners.length > 0) {
        return lastCompleted.corners;
      }
    }
    return [];
  };

  const activeCorners = resolveCornerList();
  const speedUnit = settings.units === 'imperial' ? 'mph' : 'km/h';
  const fmtSpeedVal = (spd) => {
    if (spd === undefined || spd === null || spd === '-') return '-';
    const n = Number(spd);
    if (Number.isNaN(n)) return '-';
    return settings.units === 'imperial' ? Math.round(n * 0.621371) : Math.round(n);
  };

  // --- Track Map Logic ---
  const playerData = players.find((p) => p.name && p.name.includes('(You)')) || selectedPlayer;
  let trackPoints = [];
  if (selectedLap && selectedLap.telemetry_points && selectedLap.telemetry_points.length > 0) {
    trackPoints = selectedLap.telemetry_points;
  } else if (playerData) {
    trackPoints = playerData.current_telemetry || [];
    if (playerData.lap_history && playerData.lap_history.length > 0) {
      const lastPlayerLapPoints =
        playerData.lap_history[playerData.lap_history.length - 1].telemetry_points || [];
      if (lastPlayerLapPoints.length > trackPoints.length) {
        trackPoints = lastPlayerLapPoints;
      }
    }
  }

  const mapPoints = reference_track.length > 0 ? reference_track : trackPoints;

  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  mapPoints.forEach((p) => {
    if (p.x !== undefined && p.z !== undefined) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
  });

  const mapPadding = 28;
  const rangeX = maxX - minX || 1;
  const rangeZ = maxZ - minZ || 1;
  const mapScale = Math.min(
    (400 - mapPadding * 2) / rangeX,
    (400 - mapPadding * 2) / rangeZ
  );

  const offsetX = (400 - rangeX * mapScale) / 2;
  const offsetZ = (400 - rangeZ * mapScale) / 2;

  const mapX = (x) => offsetX + (x - minX) * mapScale;
  const mapZ = (z) => 400 - (offsetZ + (z - minZ) * mapScale);

  const s2Dist = circuit_environment.sector2_start;
  const s3Dist = circuit_environment.sector3_start;
  let s1Point = null;
  let s2Point = null;
  let s3Point = null;

  const getDist = (p) => (p.distance_m !== undefined ? p.distance_m : p.dist || 0);

  if (mapPoints.length > 0) {
    s1Point = mapPoints.reduce((prev, curr) =>
      Math.abs(getDist(curr) - 0) < Math.abs(getDist(prev) - 0) ? curr : prev
    );
  }
  if (s2Dist > 0 && mapPoints.length > 0) {
    s2Point = mapPoints.reduce((prev, curr) =>
      Math.abs(getDist(curr) - s2Dist) < Math.abs(getDist(prev) - s2Dist) ? curr : prev
    );
  }
  if (s3Dist > 0 && mapPoints.length > 0) {
    s3Point = mapPoints.reduce((prev, curr) =>
      Math.abs(getDist(curr) - s3Dist) < Math.abs(getDist(prev) - s3Dist) ? curr : prev
    );
  }

  const buildSmoothPath = (points) => {
    const validPoints = points.filter((p) => p.x !== undefined && p.z !== undefined);
    if (validPoints.length === 0) return '';
    let d = `M ${mapX(validPoints[0].x)} ${mapZ(validPoints[0].z)}`;
    for (let i = 1; i < validPoints.length - 1; i++) {
      const xc = (mapX(validPoints[i].x) + mapX(validPoints[i + 1].x)) / 2;
      const zc = (mapZ(validPoints[i].z) + mapZ(validPoints[i + 1].z)) / 2;
      d += ` Q ${mapX(validPoints[i].x)} ${mapZ(validPoints[i].z)}, ${xc} ${zc}`;
    }
    d += ` L ${mapX(validPoints[validPoints.length - 1].x)} ${mapZ(validPoints[validPoints.length - 1].z)}`;
    return d;
  };

  const getPerpLine = (pt) => {
    if (!pt || pt.x === undefined) return null;
    const idx = mapPoints.indexOf(pt);
    if (idx === -1)
      return {
        x1: mapX(pt.x),
        y1: mapZ(pt.z) - 12,
        x2: mapX(pt.x),
        y2: mapZ(pt.z) + 12,
      };

    const prev = mapPoints[Math.max(0, idx - 1)];
    const next = mapPoints[Math.min(mapPoints.length - 1, idx + 1)];

    let dx = mapX(next.x) - mapX(prev.x);
    let dz = mapZ(next.z) - mapZ(prev.z);
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    dx /= len;
    dz /= len;

    const px = -dz * 12;
    const pz = dx * 12;

    return {
      x1: mapX(pt.x) + px,
      y1: mapZ(pt.z) + pz,
      x2: mapX(pt.x) - px,
      y2: mapZ(pt.z) - pz,
    };
  };

  const selectedCornerDetail =
    selectedMapPoint !== null && activeCorners[selectedMapPoint]
      ? activeCorners[selectedMapPoint]
      : activeCorners[0] || null;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)' }}>
      {/* Top Navigation Bar (top-nav-light from DESIGN-coinbase.md) */}
      <header className="cb-top-nav">
        <div className="cb-top-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div className="cb-brand">
              <span className="cb-brand-mark">F1</span>
              <span>Race Engineer</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="badge-pill">
                📍 {circuit_environment.track_name} ·{' '}
                <span className="mono-num">{circuit_environment.track_length}m</span>
              </span>
              {circuit_environment.session?.name && (
                <span
                  className="badge-pill"
                  title={`Session UID ${circuit_environment.session.uid || '-'}`}
                  style={{
                    backgroundColor:
                      circuit_environment.session.group === 'race'
                        ? 'rgba(207, 32, 47, 0.12)'
                        : circuit_environment.session.group === 'qualifying'
                        ? 'rgba(245, 185, 66, 0.15)'
                        : 'rgba(0, 82, 255, 0.1)',
                    fontWeight: 600,
                  }}
                >
                  🏁 {circuit_environment.session.name}
                </span>
              )}
              <span className="badge-pill">🌤️ {circuit_environment.weather}</span>
              <span className="badge-pill">
                Track <span className="mono-num">{circuit_environment.track_temp}°</span>
              </span>
              <span className="badge-pill">
                Air <span className="mono-num">{circuit_environment.air_temp}°</span>
              </span>
              <span className="badge-pill">
                Laps <span className="mono-num">{circuit_environment.total_laps}</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {settings.useRawReplay && (
              <div
                className="badge-pill"
                style={{
                  backgroundColor: 'rgba(0, 82, 255, 0.1)',
                  color: 'var(--color-primary)',
                  border: '1px solid rgba(0, 82, 255, 0.25)',
                }}
              >
                <span>
                  {t.replayModeBadge}:{' '}
                  {data?.replay_info?.file ||
                    (settings.replayLap === 'all' ? 'All Laps' : `Lap ${settings.replayLap}`)}
                </span>
                {data?.replay_info?.progress_pct !== undefined && (
                  <span className="mono-num" style={{ fontSize: '11px' }}>
                    {data.replay_info.progress_pct}%
                  </span>
                )}
                <span className="mono-num">[{settings.replaySpeed || 2}x]</span>
              </div>
            )}
            <button
              onClick={() => setSettings({ ...settings, tts: !settings.tts })}
              className={`btn-secondary-light ${settings.tts ? 'active' : ''}`}
            >
              TTS {settings.tts ? `ON (${settings.voice.toUpperCase()})` : 'OFF'}
            </button>
            <TvOverlayButton tv={tv} language={settings.language} />
            <div
              className="badge-pill"
              style={{
                backgroundColor: 'var(--color-surface-strong)',
                color: connected ? 'var(--color-semantic-up)' : 'var(--color-semantic-down)',
              }}
            >
              ● {connected ? (settings.useRawReplay ? 'REPLAY STREAM' : `LIVE :${settings.port}`) : 'OFFLINE'}
            </div>
            <button
              onClick={() => {
                const el = document.getElementById('gp-radio-console');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="btn-secondary-light"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: isPlayingVoice ? 'rgba(0,82,255,0.2)' : undefined,
                borderColor: isPlayingVoice ? 'var(--color-primary)' : undefined,
                color: isPlayingVoice ? 'var(--color-primary)' : undefined,
                cursor: 'pointer',
              }}
              title="Jump to Engineer Team Radio Console"
            >
              📻 <span>Team Radio</span>
              {isPlayingVoice && <span style={{ fontSize: '10px', color: 'var(--color-semantic-up)' }}>● LIVE</span>}
            </button>
            <button
              onClick={onExit}
              className="btn-secondary-light"
            >
              EXIT
            </button>
          </div>
        </div>
      </header>

      {/* Band 1: Full-Bleed Dark Editorial Hero (hero-band-dark + product-ui-card-dark) */}
      <section className="cb-band-dark">
        <div className="dashboard-container">
          <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div
                className="badge-pill"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  color: 'var(--color-on-dark)',
                  marginBottom: '12px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.6px',
                }}
              >
                LIVE TELEMETRY & KINEMATICS
              </div>
              <h1 className="hero-heading">
                {name} — Lap <span className="mono-num">{current_lap}</span>
              </h1>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span
                className="badge-pill"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  padding: '6px 14px',
                }}
              >
                Compound: {tyre_compound}
              </span>
              <span
                className="badge-pill mono-num"
                style={{
                  backgroundColor: 'var(--color-surface-dark-elevated)',
                  color: 'var(--color-on-dark)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  padding: '6px 14px',
                }}
              >
                P{selectedPlayer.position} · {selectedPlayer.gap}
              </span>
            </div>
          </div>

          <div className="grid-3">
            {/* Live Telemetry Mockup Card (product-ui-card-dark) */}
            <div className="product-ui-card-dark" style={{ gridColumn: 'span 2' }}>
              <div className="grid-3" style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-dark)',
                    padding: '20px',
                    borderRadius: 'var(--rounded-lg)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-on-dark-soft)', fontWeight: 600, marginBottom: '6px' }}>
                    SPEED
                  </div>
                  <div className="stat-value">
                    {live_telemetry.speed}{' '}
                    <span style={{ fontSize: '16px', color: 'var(--color-on-dark-soft)', fontWeight: 400 }}>
                      {speedUnit.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-dark)',
                    padding: '20px',
                    borderRadius: 'var(--rounded-lg)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-on-dark-soft)', fontWeight: 600, marginBottom: '6px' }}>
                    GEAR
                  </div>
                  <div className="stat-value" style={{ color: 'var(--color-primary)' }}>
                    {live_telemetry.gear === 0 ? 'N' : live_telemetry.gear === -1 ? 'R' : `G${live_telemetry.gear}`}
                  </div>
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--color-surface-dark)',
                    padding: '20px',
                    borderRadius: 'var(--rounded-lg)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div style={{ fontSize: '12px', color: 'var(--color-on-dark-soft)', fontWeight: 600, marginBottom: '6px' }}>
                    ENGINE RPM
                  </div>
                  <div className="stat-value">{live_telemetry.rpm.toLocaleString()}</div>
                </div>
              </div>

              {/* Speed Graph */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-dark)',
                  padding: '16px',
                  borderRadius: 'var(--rounded-lg)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-dark)' }}>
                    SPEED TRACE ({name})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
                    <span className="mono-num" style={{ color: '#60a5fa', fontWeight: 600 }}>
                      ● {live_telemetry.speed} {speedUnit}
                    </span>
                    <span style={{ color: 'var(--color-on-dark-soft)', fontSize: '11px' }}>
                      Click driver in Live Classification
                    </span>
                  </div>
                </div>
                <svg
                  viewBox="0 0 400 140"
                  style={{ width: '100%', height: '160px', display: 'block' }}
                >
                  <line x1="0" y1="35" x2="400" y2="35" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
                  <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
                  <line x1="0" y1="105" x2="400" y2="105" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
                  {(() => {
                    const maxSpeed = settings.units === 'imperial' ? 225 : 360;
                    const xScale = 400 / Math.max(history.length - 1, 1);
                    const pathData = history
                      .map((pt, i) => {
                        const x = i * xScale;
                        const spd =
                          pt[`speed_${activePlayerId}`] !== undefined
                            ? pt[`speed_${activePlayerId}`]
                            : live_telemetry.speed || 0;
                        const y = 135 - (Math.min(maxSpeed, spd) / maxSpeed) * 125;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ');
                    return (
                      <path
                        key={activePlayerId}
                        d={pathData}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2.5"
                      />
                    );
                  })()}
                </svg>
              </div>

              {/* Throttle & Brake Graph */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-dark)',
                  padding: '16px',
                  borderRadius: 'var(--rounded-lg)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-dark)' }}>
                    PEDAL TELEMETRY ({name})
                  </span>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                    <span className="text-up">
                      ● Throttle {live_telemetry.throttle}%
                    </span>
                    <span className="text-down">
                      ● Brake {live_telemetry.brake}%
                    </span>
                  </div>
                </div>
                <svg
                  viewBox="0 0 400 120"
                  style={{ width: '100%', height: '140px', display: 'block' }}
                >
                  <line x1="0" y1="30" x2="400" y2="30" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
                  <line x1="0" y1="60" x2="400" y2="60" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
                  <line x1="0" y1="90" x2="400" y2="90" stroke="rgba(255,255,255,0.08)" strokeDasharray="3" />
                  <path
                    d={history
                      .map((pt, i) => {
                        const x = i * (400 / Math.max(history.length - 1, 1));
                        const y = 115 - ((pt.throttle || 0) / 100) * 105;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="var(--color-semantic-up)"
                    strokeWidth="2"
                  />
                  <path
                    d={history
                      .map((pt, i) => {
                        const x = i * (400 / Math.max(history.length - 1, 1));
                        const y = 115 - ((pt.brake || 0) / 100) * 105;
                        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      })
                      .join(' ')}
                    fill="none"
                    stroke="var(--color-semantic-down)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>

            {/* Leaderboard Card (product-ui-card-dark with asset-row list) */}
            <div className="product-ui-card-dark" style={{ maxHeight: '580px', display: 'flex', flexDirection: 'column' }}>
              <div className="card-header" style={{ color: 'var(--color-on-dark)' }}>
                <span>Live Classification</span>
                <span className="badge-pill" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--color-on-dark)' }}>
                  {players.length} Cars
                </span>
              </div>
              <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {players.map((driver) => {
                  const isSelected = activePlayerId === driver.id;
                  const isYou = driver.name && driver.name.includes('(You)');
                  return (
                    <div
                      key={driver.id}
                      onClick={() => {
                        setSelectedPlayerId(driver.id);
                        if (driver.lap_history && driver.lap_history.length > 0) {
                          const hasSameLap = driver.lap_history.some(
                            (l) => String(l.lap) === String(selectedLapId)
                          );
                          if (!hasSameLap && selectedLapId !== 'live') {
                            setSelectedLapId(driver.lap_history[driver.lap_history.length - 1].lap);
                          }
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: 'var(--rounded-md)',
                        marginBottom: '6px',
                        cursor: 'pointer',
                        backgroundColor: isSelected
                          ? 'var(--color-primary)'
                          : 'var(--color-surface-dark)',
                        border: isSelected
                          ? '1px solid var(--color-primary)'
                          : '1px solid rgba(255,255,255,0.06)',
                        color: 'var(--color-on-dark)',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          className="asset-icon-circular"
                          style={{
                            width: '28px',
                            height: '28px',
                            minWidth: '28px',
                            backgroundColor: isSelected
                              ? 'rgba(255,255,255,0.2)'
                              : 'var(--color-surface-dark-elevated)',
                            color: 'var(--color-on-dark)',
                          }}
                        >
                          P{driver.position}
                        </span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>
                            {driver.name}
                          </div>
                          <div style={{ fontSize: '11px', color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--color-on-dark-soft)' }}>
                            {driver.tyre_compound} · Lap {driver.current_lap}
                          </div>
                        </div>
                      </div>
                      <span
                        className="mono-num"
                        style={{
                          fontSize: '13px',
                          color: isSelected
                            ? '#ffffff'
                            : isYou
                            ? 'var(--color-semantic-up)'
                            : 'var(--color-on-dark-soft)',
                        }}
                      >
                        {driver.gap}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Band 2: White Editorial Canvas — Lap History (with Corner-by-Corner Telemetry) & Car Setup */}
      <section className="cb-band-light">
        <div className="dashboard-container">
          <div className="grid-2">
            {/* Lap History & Selected Lap Corner-by-Corner Telemetry */}
            <div className="card">
              <div className="card-header">
                <div>
                  <span className="badge-pill" style={{ marginBottom: '6px' }}>
                    LAP ARCHIVE & CORNER TELEMETRY
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>
                    {name}'s Lap History
                  </div>
                </div>
                <span className="badge-pill badge-primary">
                  {lap_history.length} Completed Laps
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: 0, marginBottom: '16px' }}>
                {t.selectLapPrompt}
              </p>

              {/* Live Current Lap Option + Completed Lap Rows */}
              <div style={{ maxHeight: '280px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                <div
                  className={`leaderboard-row clickable-row ${isLiveLapSelected ? 'active' : ''}`}
                  onClick={() => setSelectedLapId('live')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      className="asset-icon-circular"
                      style={{
                        backgroundColor: isLiveLapSelected ? 'var(--color-primary)' : 'var(--color-surface-strong)',
                        color: isLiveLapSelected ? '#ffffff' : 'var(--color-primary)',
                      }}
                    >
                      LIVE
                    </span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px' }}>
                        Current Lap {current_lap} (In Progress)
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                        Real-time corner telemetry buffer
                      </div>
                    </div>
                  </div>
                  <span className="badge-pill" style={{ color: 'var(--color-primary)' }}>
                    LIVE STREAM
                  </span>
                </div>

                {lap_history.map((lap) => {
                  const isSelected = !isLiveLapSelected && String(selectedLap?.lap) === String(lap.lap);
                  const isBest = String(lap.delta).includes('Best');
                  const isFaster = String(lap.delta).startsWith('-') || isBest;
                  const cornerCount = (lap.corners || []).filter((c) => c.passed).length;

                  return (
                    <div
                      key={`lap-row-${lap.lap}`}
                      className={`leaderboard-row clickable-row ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedLapId(lap.lap)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          className="asset-icon-circular"
                          style={{
                            backgroundColor: isSelected
                              ? 'var(--color-primary)'
                              : isBest
                              ? 'rgba(5, 177, 105, 0.12)'
                              : 'var(--color-surface-strong)',
                            color: isSelected
                              ? '#ffffff'
                              : isBest
                              ? 'var(--color-semantic-up)'
                              : 'var(--color-ink)',
                          }}
                        >
                          L{lap.lap}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '15px' }}>
                              Lap {lap.lap}
                            </span>
                            {isBest && (
                              <span
                                className="badge-pill"
                                style={{
                                  backgroundColor: 'rgba(5, 177, 105, 0.12)',
                                  color: 'var(--color-semantic-up)',
                                  padding: '2px 8px',
                                  fontSize: '11px',
                                }}
                              >
                                BEST LAP
                              </span>
                            )}
                          </div>
                          <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                            {lap.sector1 && lap.sector1 !== '-'
                              ? `S1 ${lap.sector1} · S2 ${lap.sector2} · S3 ${lap.sector3}`
                              : `${cornerCount} Corners Mapped`}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div className="mono-num" style={{ fontSize: '16px', fontWeight: 600 }}>
                          {lap.time}
                        </div>
                        <div
                          className={isFaster ? 'text-up' : 'text-down'}
                          style={{ fontSize: '12px' }}
                        >
                          {lap.delta}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Selected Lap Corner-by-Corner Telemetry Inspector */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-soft)',
                  padding: '20px',
                  borderRadius: 'var(--rounded-lg)',
                  border: '1px solid var(--color-hairline)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {t.cornerTelemetryTitle}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>
                      {isLiveLapSelected
                        ? `LIVE (Lap ${current_lap}) — ${activeCorners.length} Corners`
                        : `Lap ${selectedLap?.lap} (${selectedLap?.time}) — ${activeCorners.length} Corners`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button
                      onClick={() => setComparisonMode('ahead')}
                      className={`btn-secondary-light ${comparisonMode === 'ahead' ? 'active' : ''}`}
                    >
                      {t.vsAhead}
                    </button>
                    <button
                      onClick={() => setComparisonMode('leader')}
                      className={`btn-secondary-light ${comparisonMode === 'leader' ? 'active' : ''}`}
                    >
                      {t.vsLeader}
                    </button>
                    <button
                      onClick={() => setShowTelemetryBars(!showTelemetryBars)}
                      className="btn-secondary-light"
                    >
                      {showTelemetryBars ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>

                {selectedLap && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <span className="badge-pill" style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-hairline)' }}>
                      Tyre Wear Consumed:{' '}
                      <span className="text-down">
                        {selectedLap.avg_tyre_wear_lap || selectedLap.tyre_wear_consumed || 1.25}%
                      </span>
                    </span>
                    {selectedLap.sector1 && selectedLap.sector1 !== '-' && (
                      <span className="badge-pill mono-num" style={{ backgroundColor: 'var(--color-canvas)', border: '1px solid var(--color-hairline)' }}>
                        S1: {selectedLap.sector1} · S2: {selectedLap.sector2} · S3: {selectedLap.sector3}
                      </span>
                    )}
                  </div>
                )}

                {showTelemetryBars && (
                  <div style={{ maxHeight: '460px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeCorners.length > 0 ? (
                      activeCorners.map((c, idx) => {
                        const compBrake =
                          comparisonMode === 'ahead'
                            ? c.rival_brake
                            : c.leader_brake ?? c.rival_brake;
                        const compThrottle =
                          comparisonMode === 'ahead'
                            ? c.rival_throttle
                            : c.leader_throttle ?? c.rival_throttle;
                        const compApexSpeed =
                          comparisonMode === 'ahead'
                            ? c.rival_apex_speed
                            : c.leader_apex_speed ?? c.rival_apex_speed;
                        const compBrakePt =
                          comparisonMode === 'ahead'
                            ? c.rival_brake_point
                            : c.leader_brake_point ?? c.rival_brake_point;
                        const compTimeDiff =
                          comparisonMode === 'ahead'
                            ? c.time_diff_to_rival
                            : c.time_diff_leader || c.time_diff_to_rival;
                        const compLabelEng = comparisonMode === 'ahead' ? 'Ahead' : 'Leader';
                        const isFaster = String(compTimeDiff || '').includes('Faster');
                        const isCornerSelected = selectedMapPoint === idx;

                        const entryBrkNum = typeof c.entry_brake === 'number' ? c.entry_brake : 0;
                        const exitThrNum = typeof c.exit_throttle === 'number' ? c.exit_throttle : 0;

                        return (
                          <div
                            key={`lap-corner-${idx}`}
                            onClick={() => setSelectedMapPoint(idx)}
                            style={{
                              padding: '14px 16px',
                              backgroundColor: 'var(--color-canvas)',
                              borderRadius: 'var(--rounded-md)',
                              border: isCornerSelected
                                ? '1.5px solid var(--color-primary)'
                                : '1px solid var(--color-hairline)',
                              cursor: 'pointer',
                              transition: 'border-color 0.15s ease',
                            }}
                          >
                            {/* Top Row: Turn Name, Direction, Zone, Delta */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span
                                  className="asset-icon-circular"
                                  style={{
                                    backgroundColor: isCornerSelected
                                      ? 'var(--color-primary)'
                                      : 'var(--color-surface-strong)',
                                    color: isCornerSelected ? '#ffffff' : 'var(--color-ink)',
                                  }}
                                >
                                  T{c.turn || idx + 1}
                                </span>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span>{c.name}</span>
                                    <span
                                      className="badge-pill"
                                      style={{ padding: '1px 8px', fontSize: '11px' }}
                                    >
                                      {c.direction === 'Right' ? '↱ Right' : '↰ Left'}
                                    </span>
                                  </div>
                                  <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                    Zone {c.nom_entry_dist || c.entry_dist}m → {c.nom_apex_dist || c.apex_dist}m → {c.nom_exit_dist || c.exit_dist}m
                                  </div>
                                </div>
                              </div>

                              {compTimeDiff && (
                                <span
                                  className={isFaster ? 'text-up' : 'text-down'}
                                  style={{ fontSize: '12px' }}
                                >
                                  {String(compTimeDiff)
                                    .replace('Faster', `Faster vs ${compLabelEng}`)
                                    .replace('Slower', `Slower vs ${compLabelEng}`)}
                                </span>
                              )}
                            </div>

                            {/* Entry / Apex / Exit Telemetry Metrics */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '8px',
                                backgroundColor: 'var(--color-surface-soft)',
                                padding: '10px 12px',
                                borderRadius: 'var(--rounded-sm)',
                                marginBottom: '10px',
                                fontSize: '12px',
                              }}
                            >
                              <div>
                                <div style={{ color: 'var(--color-muted)', fontSize: '11px', fontWeight: 600 }}>
                                  ENTRY ({c.entry_dist}m)
                                </div>
                                <div className="mono-num" style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>
                                  {fmtSpeedVal(c.entry_speed)} {speedUnit} · G{c.entry_gear}
                                </div>
                                <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-body)' }}>
                                  THR {c.entry_throttle}% · BRK {c.entry_brake}%
                                </div>
                              </div>

                              <div style={{ borderLeft: '1px solid var(--color-hairline)', paddingLeft: '10px' }}>
                                <div style={{ color: 'var(--color-primary)', fontSize: '11px', fontWeight: 600 }}>
                                  APEX ({c.apex_dist}m)
                                </div>
                                <div className="mono-num" style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px', color: 'var(--color-primary)' }}>
                                  {fmtSpeedVal(c.apex_speed)} {speedUnit} · G{c.apex_gear}
                                </div>
                                <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-body)' }}>
                                  THR {c.apex_throttle}% · {compLabelEng}: {fmtSpeedVal(compApexSpeed)} {speedUnit}
                                </div>
                              </div>

                              <div style={{ borderLeft: '1px solid var(--color-hairline)', paddingLeft: '10px' }}>
                                <div style={{ color: 'var(--color-muted)', fontSize: '11px', fontWeight: 600 }}>
                                  EXIT ({c.exit_dist}m)
                                </div>
                                <div className="mono-num" style={{ fontSize: '15px', fontWeight: 600, marginTop: '2px' }}>
                                  {fmtSpeedVal(c.exit_speed)} {speedUnit} · G{c.exit_gear}
                                </div>
                                <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-body)' }}>
                                  THR {c.exit_throttle}% · BRK {c.exit_brake}%
                                </div>
                              </div>
                            </div>

                            {/* Braking Point & Peak G Metadata */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-body)', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                              <span className="mono-num">
                                🔴 Brake Pt: <strong>{c.brake_point ? `${c.brake_point}m` : '-'}</strong>
                                {compBrakePt ? ` (${compLabelEng}: ${compBrakePt}m)` : ''}
                              </span>
                              <span className="mono-num">
                                🟢 Throttle On: <strong>{c.throttle_on_dist ? `${c.throttle_on_dist}m` : '-'}</strong>
                              </span>
                              <span className="mono-num">
                                ⚡ Max Lateral G: <strong>{c.max_g_lat}G</strong>
                              </span>
                            </div>

                            {/* Brake & Exit Throttle Comparison Bars */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="mono-num" style={{ fontSize: '11px', width: '58px', color: 'var(--color-muted)' }}>
                                ENTRY BRK
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  position: 'relative',
                                  height: '8px',
                                  backgroundColor: 'var(--color-surface-strong)',
                                  borderRadius: 'var(--rounded-pill)',
                                  overflow: 'hidden',
                                }}
                              >
                                {compBrake !== undefined && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: `${Math.min(99, Math.max(0, compBrake))}%`,
                                      width: '2px',
                                      height: '100%',
                                      backgroundColor: 'var(--color-ink)',
                                      zIndex: 10,
                                    }}
                                  />
                                )}
                                <div
                                  style={{
                                    width: `${entryBrkNum}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--color-semantic-down)',
                                    borderRadius: 'var(--rounded-pill)',
                                  }}
                                />
                              </div>
                              <span className="mono-num" style={{ fontSize: '11px', width: '36px', textAlign: 'right' }}>
                                {entryBrkNum}%
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                              <span className="mono-num" style={{ fontSize: '11px', width: '58px', color: 'var(--color-muted)' }}>
                                EXIT THR
                              </span>
                              <div
                                style={{
                                  flex: 1,
                                  position: 'relative',
                                  height: '8px',
                                  backgroundColor: 'var(--color-surface-strong)',
                                  borderRadius: 'var(--rounded-pill)',
                                  overflow: 'hidden',
                                }}
                              >
                                {compThrottle !== undefined && (
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: `${Math.min(99, Math.max(0, compThrottle))}%`,
                                      width: '2px',
                                      height: '100%',
                                      backgroundColor: 'var(--color-ink)',
                                      zIndex: 10,
                                    }}
                                  />
                                )}
                                <div
                                  style={{
                                    width: `${exitThrNum}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--color-semantic-up)',
                                    borderRadius: 'var(--rounded-pill)',
                                  }}
                                />
                              </div>
                              <span className="mono-num" style={{ fontSize: '11px', width: '36px', textAlign: 'right' }}>
                                {exitThrNum}%
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-muted)' }}>
                        No corner telemetry available for this lap.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Car Setup, Live Tyre Wear & AI Strategy */}
            <div className="card">
              <div className="card-header">
                <div>
                  <span className="badge-pill" style={{ marginBottom: '6px' }}>
                    VEHICLE CONFIGURATION
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>
                    {name}'s Car Setup
                  </div>
                </div>
                <span className="badge-pill badge-primary">
                  Tyre: {tyre_compound}
                </span>
              </div>

              <div className="grid-3" style={{ gap: '12px', marginBottom: '24px' }}>
                <div style={{ backgroundColor: 'var(--color-surface-soft)', padding: '14px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    AERODYNAMICS
                  </div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Front Wing</span>
                    <strong className="mono-num">{car_setup.front_wing ?? '-'}</strong>
                  </div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rear Wing</span>
                    <strong className="mono-num">{car_setup.rear_wing ?? '-'}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-surface-soft)', padding: '14px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    DIFFERENTIAL
                  </div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>On Throttle</span>
                    <strong className="mono-num">{car_setup.on_throttle_diff ?? '-'}</strong>
                  </div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Off Throttle</span>
                    <strong className="mono-num">{car_setup.off_throttle_diff ?? '-'}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-surface-soft)', padding: '14px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    BRAKE SYSTEM
                  </div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Pressure</span>
                    <strong className="mono-num">{car_setup.brake_pressure ?? '-'}</strong>
                  </div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span>Brake Bias</span>
                    <strong className="mono-num">{car_setup.brake_bias ?? '-'}</strong>
                  </div>
                  <div style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Engine Brk</span>
                    <strong className="mono-num">{car_setup.engine_braking ?? '-'}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-surface-soft)', padding: '14px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    SUSPENSION GEOMETRY
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Front Camber</span>
                    <strong className="mono-num">{car_setup.front_camber ?? '-'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Rear Camber</span>
                    <strong className="mono-num">{car_setup.rear_camber ?? '-'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Front Toe</span>
                    <strong className="mono-num">{car_setup.front_toe ?? '-'}</strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Rear Toe</span>
                    <strong className="mono-num">{car_setup.rear_toe ?? '-'}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-surface-soft)', padding: '14px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    SPRINGS & RIDE HEIGHT
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Susp (F / R)</span>
                    <strong className="mono-num">
                      {car_setup.front_suspension ?? '-'} / {car_setup.rear_suspension ?? '-'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>ARB (F / R)</span>
                    <strong className="mono-num">
                      {car_setup.front_anti_roll_bar ?? '-'} / {car_setup.rear_anti_roll_bar ?? '-'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Ride Ht (F / R)</span>
                    <strong className="mono-num">
                      {car_setup.front_suspension_height ?? '-'} / {car_setup.rear_suspension_height ?? '-'}
                    </strong>
                  </div>
                </div>

                <div style={{ backgroundColor: 'var(--color-surface-soft)', padding: '14px', borderRadius: 'var(--rounded-md)', border: '1px solid var(--color-hairline-soft)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '6px' }}>
                    TYRE PRESSURES & FUEL
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Front PSI (L/R)</span>
                    <strong className="mono-num">
                      {car_setup.tyre_pressures?.[2] ?? '-'} / {car_setup.tyre_pressures?.[3] ?? '-'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span>Rear PSI (L/R)</span>
                    <strong className="mono-num">
                      {car_setup.tyre_pressures?.[0] ?? '-'} / {car_setup.tyre_pressures?.[1] ?? '-'}
                    </strong>
                  </div>
                  <div style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fuel Load</span>
                    <strong className="mono-num">{car_setup.fuel_load ?? '-'} kg</strong>
                  </div>
                </div>
              </div>

              {/* Live Tyre Wear */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>
                  Live Tyre Surface Wear
                </div>
                <div className="grid-2" style={{ gap: '10px' }}>
                  {[
                    { label: 'Front Left (FL)', val: live_telemetry.tyre_wear[2] ?? live_telemetry.tyre_wear[0] },
                    { label: 'Front Right (FR)', val: live_telemetry.tyre_wear[3] ?? live_telemetry.tyre_wear[1] },
                    { label: 'Rear Left (RL)', val: live_telemetry.tyre_wear[0] },
                    { label: 'Rear Right (RR)', val: live_telemetry.tyre_wear[1] },
                  ].map((tItem, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        backgroundColor: 'var(--color-surface-soft)',
                        borderRadius: 'var(--rounded-md)',
                        border: '1px solid var(--color-hairline-soft)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                        <span style={{ color: 'var(--color-body)' }}>{tItem.label}</span>
                        <span className={tItem.val > 40 ? 'text-down' : 'text-up'}>
                          {tItem.val}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          backgroundColor: 'var(--color-surface-strong)',
                          borderRadius: 'var(--rounded-pill)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, tItem.val)}%`,
                            height: '100%',
                            backgroundColor:
                              tItem.val > 40
                                ? 'var(--color-semantic-down)'
                                : 'var(--color-primary)',
                            borderRadius: 'var(--rounded-pill)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Race Engineer Strategy & Voice Test Console */}
              <div id="gp-radio-console"
                style={{
                  backgroundColor: 'var(--color-surface-dark)',
                  color: 'var(--color-on-dark)',
                  padding: '20px 24px',
                  borderRadius: 'var(--rounded-lg)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isPlayingVoice ? '0 0 24px rgba(0, 82, 255, 0.25)' : 'none',
                  transition: 'box-shadow 0.3s ease',
                }}
              >
                {/* Header with Radio Wave Animation & Auto Radio Switch */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', letterSpacing: '0.6px' }}>
                      🎙️ {t.radioTitle || 'RED BULL ENGINEER TEAM RADIO'}
                    </span>
                    <span className="badge-pill" style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: '11px', padding: '2px 8px' }}>
                      {settings.voice === 'redbull' ? 'RED BULL ENGINEER' : (settings.voice?.toUpperCase() || 'ENGINEER')}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isPlayingVoice ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '16px' }}>
                          <span className="radio-wave-bar"></span>
                          <span className="radio-wave-bar"></span>
                          <span className="radio-wave-bar"></span>
                          <span className="radio-wave-bar"></span>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-semantic-up)', letterSpacing: '0.5px' }}>
                          {t.radioActive || 'RADIO ACTIVE'}
                        </span>
                        <button
                          onClick={stopVoiceClip}
                          className="voice-test-btn"
                          style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: 'var(--color-semantic-down)', borderColor: 'var(--color-semantic-down)' }}
                        >
                          ⏹ {t.stopRadio || 'STOP'}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                        STANDBY · 20777 UDP
                      </span>
                    )}

                    {/* Auto Radio Briefing Toggle */}
                    <button
                      onClick={() => setAutoRadioEnabled(!autoRadioEnabled)}
                      className={`btn-secondary-light ${autoRadioEnabled ? 'active' : ''}`}
                      style={{ padding: '3px 10px', fontSize: '11px', borderRadius: 'var(--rounded-pill)' }}
                      title="Automatically voice contextual radio updates during race"
                    >
                      {t.autoRadio || 'Auto Radio'}: {autoRadioEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* Radio Message Speech Box */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 'var(--rounded-md)',
                    padding: '14px 16px',
                    marginBottom: '16px',
                    minHeight: '68px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-primary)', letterSpacing: '0.4px' }}>
                      {activeVoiceTranscript?.scenario || 'REAL-TIME TELEMETRY STRATEGY'}
                    </span>
                    {activeVoiceTranscript?.badge && (
                      <span className="badge-pill" style={{ backgroundColor: 'rgba(0,82,255,0.2)', color: 'var(--color-primary)', fontSize: '10px', padding: '1px 6px' }}>
                        {activeVoiceTranscript.badge}
                      </span>
                    )}
                  </div>

                  {activeVoiceTranscript?.question && (
                    <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: '4px' }}>
                      🙋 {activeVoiceTranscript.question}
                    </div>
                  )}
                  <div style={{ fontSize: '14px', lineHeight: 1.55, color: '#ffffff', fontWeight: 500 }}>
                    "{activeVoiceTranscript ? activeVoiceTranscript.text : strategy}"
                  </div>
                  {activeVoiceTranscript?.text_ko && settings.language === 'ko' && (
                    <div style={{ fontSize: '12px', lineHeight: 1.5, color: '#c7cbd6', marginTop: '6px' }}>
                      {activeVoiceTranscript.text_ko}
                    </div>
                  )}
                  {activeVoiceTranscript?.details && activeVoiceTranscript.details.length > 0 && (
                    <ul style={{ margin: '8px 0 0', paddingLeft: '18px', fontSize: '11px', color: '#9aa1b2', lineHeight: 1.6 }}>
                      {activeVoiceTranscript.details.map((d, i) => (
                        <li key={i} className="mono-num">{d}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <EngineerAskBox
                  language={settings.language || 'ko'}
                  onAnswer={(ev) => {
                    if (settings.tts) {
                      playVoiceClip(ev);
                    } else {
                      setActiveVoiceTranscript({
                        text: ev.text,
                        text_ko: ev.text_ko,
                        details: ev.details,
                        question: ev.question,
                        scenario: ev.scenario,
                        title: ev.title,
                        badge: ev.badge,
                      });
                    }
                  }}
                />

                {/* Engineer Radio Test Console (TTS / Voice Tester) */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#ffffff' }}>
                      📻 {t.radioTestConsole || 'Engineer Radio Test Console (TTS/Voice Tester)'}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      {manifestClips.length} High-Res Voice Clips
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#888ea0', marginBottom: '10px' }}>
                    {t.radioTestDesc || 'Click any button to test the engineer\'s pit-wall voice clips and verify telemetry sync:'}
                  </div>

                  <RadioTestConsole
                    manifestClips={manifestClips}
                    isPlayingVoice={isPlayingVoice}
                    currentVoiceClip={currentVoiceClip}
                    onPlayClip={playVoiceClip}
                    onStopClip={stopVoiceClip}
                    t={t}
                    isDarkMode={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Band 3: Soft Gray Elevation Band — Corner Analysis Full Matrix */}
      <section className="cb-band-soft">
        <div className="dashboard-container">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
              <div>
                <span className="badge-pill" style={{ marginBottom: '6px' }}>
                  TURN-BY-TURN KINEMATICS
                </span>
                <h2 className="section-title" style={{ fontSize: '26px' }}>
                  {t.cornerAnalysis}
                </h2>
              </div>

              {/* Quick Lap Selector Pills right inside Corner Analysis */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => setSelectedLapId('live')}
                  className={`btn-secondary-light ${isLiveLapSelected ? 'active' : ''}`}
                >
                  LIVE (L{current_lap})
                </button>
                {lap_history.map((l) => {
                  const isActive = !isLiveLapSelected && String(selectedLap?.lap) === String(l.lap);
                  return (
                    <button
                      key={`ca-pill-${l.lap}`}
                      onClick={() => setSelectedLapId(l.lap)}
                      className={`btn-secondary-light mono-num ${isActive ? 'active' : ''}`}
                    >
                      Lap {l.lap}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeCorners.length > 0 ? (
              <>
                <div style={{ width: '100%', overflowX: 'auto' }}>
                  <table className="cb-table" style={{ textAlign: 'center' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--color-surface-soft)' }}>
                        <th rowSpan="2" style={{ textAlign: 'left', paddingLeft: '14px' }}>
                          TURN
                        </th>
                        <th colSpan="4" style={{ borderLeft: '1px solid var(--color-hairline)' }}>
                          ENTRY
                        </th>
                        <th colSpan="4" style={{ borderLeft: '1px solid var(--color-hairline)' }}>
                          APEX (MIN SPEED)
                        </th>
                        <th colSpan="4" style={{ borderLeft: '1px solid var(--color-hairline)' }}>
                          EXIT
                        </th>
                        <th rowSpan="2" style={{ borderLeft: '1px solid var(--color-hairline)' }}>
                          BRAKE PT
                        </th>
                        <th rowSpan="2">MAX G</th>
                        <th rowSpan="2">VS RIVAL</th>
                      </tr>
                      <tr style={{ backgroundColor: 'var(--color-surface-soft)' }}>
                        <th style={{ borderLeft: '1px solid var(--color-hairline)' }}>SPD</th>
                        <th>GEAR</th>
                        <th>THR</th>
                        <th>BRK</th>
                        <th style={{ borderLeft: '1px solid var(--color-hairline)' }}>SPD</th>
                        <th>GEAR</th>
                        <th>THR</th>
                        <th>BRK</th>
                        <th style={{ borderLeft: '1px solid var(--color-hairline)' }}>SPD</th>
                        <th>GEAR</th>
                        <th>THR</th>
                        <th>BRK</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeCorners.map((c, i) => {
                        const fmtPct = (v) =>
                          v !== undefined && v !== '-' && v !== null ? `${v}%` : '-';
                        const fmtGear = (v) =>
                          v !== undefined && v !== '-' && v !== null
                            ? v === 0
                              ? 'N'
                              : `G${v}`
                            : '-';
                        const fmtBrakePt = (v) =>
                          v !== undefined && v !== null && v !== '-' ? `${v}m` : '-';
                        const fmtG = (v) =>
                          v !== undefined && v !== '-' && v !== null ? `${v}G` : '-';

                        const compTimeDiff =
                          comparisonMode === 'ahead'
                            ? c.time_diff_to_rival
                            : c.time_diff_leader || c.time_diff_to_rival;
                        const isFaster = String(compTimeDiff || '').includes('Faster');
                        const isRowSelected = selectedMapPoint === i;

                        return (
                          <tr
                            key={`ca-row-${i}`}
                            className={`clickable-row ${isRowSelected ? 'selected-row' : ''}`}
                            onClick={() => setSelectedMapPoint(i)}
                            style={{ opacity: c.passed === false && !c.is_reference ? 0.55 : 1 }}
                          >
                            <td style={{ textAlign: 'left', paddingLeft: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span
                                  className="asset-icon-circular"
                                  style={{
                                    width: '26px',
                                    height: '26px',
                                    minWidth: '26px',
                                    fontSize: '11px',
                                    backgroundColor: isRowSelected
                                      ? 'var(--color-primary)'
                                      : 'var(--color-surface-strong)',
                                    color: isRowSelected ? '#ffffff' : 'var(--color-ink)',
                                  }}
                                >
                                  T{c.turn || i + 1}
                                </span>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                                  <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                                    {c.direction} · {c.nom_apex_dist || c.apex_dist}m
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* ENTRY */}
                            <td className="mono-num" style={{ borderLeft: '1px solid var(--color-hairline-soft)', fontWeight: 600 }}>
                              {fmtSpeedVal(c.entry_speed)}
                            </td>
                            <td className="mono-num" style={{ color: 'var(--color-body)' }}>
                              {fmtGear(c.entry_gear)}
                            </td>
                            <td className="text-up">{fmtPct(c.entry_throttle)}</td>
                            <td className="text-down">{fmtPct(c.entry_brake)}</td>

                            {/* APEX */}
                            <td className="mono-num" style={{ borderLeft: '1px solid var(--color-hairline-soft)', fontWeight: 600, color: 'var(--color-primary)' }}>
                              {fmtSpeedVal(c.apex_speed)}
                            </td>
                            <td className="mono-num" style={{ color: 'var(--color-body)' }}>
                              {fmtGear(c.apex_gear)}
                            </td>
                            <td className="text-up">{fmtPct(c.apex_throttle)}</td>
                            <td className="text-down">{fmtPct(c.apex_brake)}</td>

                            {/* EXIT */}
                            <td className="mono-num" style={{ borderLeft: '1px solid var(--color-hairline-soft)', fontWeight: 600 }}>
                              {fmtSpeedVal(c.exit_speed)}
                            </td>
                            <td className="mono-num" style={{ color: 'var(--color-body)' }}>
                              {fmtGear(c.exit_gear)}
                            </td>
                            <td className="text-up">{fmtPct(c.exit_throttle)}</td>
                            <td className="text-down">{fmtPct(c.exit_brake)}</td>

                            {/* BRAKE PT / MAX G / DELTA */}
                            <td className="mono-num" style={{ borderLeft: '1px solid var(--color-hairline-soft)', color: 'var(--color-primary)', fontWeight: 600 }}>
                              {fmtBrakePt(c.brake_point)}
                            </td>
                            <td className="mono-num">{fmtG(c.max_g_lat)}</td>
                            <td className={isFaster ? 'text-up' : 'text-down'} style={{ fontSize: '12px' }}>
                              {compTimeDiff ? String(compTimeDiff).split(' ')[0] : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Selected Corner Deep-Dive Bar below Table */}
                {selectedCornerDetail && (
                  <div
                    style={{
                      marginTop: '20px',
                      padding: '18px 22px',
                      backgroundColor: 'var(--color-surface-soft)',
                      borderRadius: 'var(--rounded-lg)',
                      border: '1px solid var(--color-hairline)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="cb-brand-mark" style={{ width: '38px', height: '38px' }}>
                        T{selectedCornerDetail.turn}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '16px' }}>
                          {selectedCornerDetail.name} ({selectedCornerDetail.direction} Turn) —{' '}
                          {isLiveLapSelected ? `LIVE Lap ${current_lap}` : `Lap ${selectedLap?.lap}`}
                        </div>
                        <div className="mono-num" style={{ fontSize: '12px', color: 'var(--color-body)' }}>
                          Braking Point: {selectedCornerDetail.brake_point}m · Apex: {selectedCornerDetail.apex_dist}m · Throttle On: {selectedCornerDetail.throttle_on_dist}m
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>
                          ENTRY SPEED
                        </div>
                        <div className="mono-num" style={{ fontSize: '18px', fontWeight: 600 }}>
                          {fmtSpeedVal(selectedCornerDetail.entry_speed)} {speedUnit}{' '}
                          <span style={{ fontSize: '12px', color: 'var(--color-body)' }}>
                            (vs {fmtSpeedVal(selectedCornerDetail.rival_entry_speed)} {speedUnit})
                          </span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-primary)', fontWeight: 600 }}>
                          APEX MIN SPEED
                        </div>
                        <div className="mono-num" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {fmtSpeedVal(selectedCornerDetail.apex_speed)} {speedUnit}{' '}
                          <span style={{ fontSize: '12px', color: 'var(--color-body)' }}>
                            (vs {fmtSpeedVal(selectedCornerDetail.rival_apex_speed)} {speedUnit})
                          </span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>
                          EXIT SPEED
                        </div>
                        <div className="mono-num" style={{ fontSize: '18px', fontWeight: 600 }}>
                          {fmtSpeedVal(selectedCornerDetail.exit_speed)} {speedUnit}{' '}
                          <span style={{ fontSize: '12px', color: 'var(--color-body)' }}>
                            (vs {fmtSpeedVal(selectedCornerDetail.rival_exit_speed)} {speedUnit})
                          </span>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 }}>
                          PEAK LATERAL LOAD
                        </div>
                        <div className="mono-num" style={{ fontSize: '18px', fontWeight: 600 }}>
                          {selectedCornerDetail.max_g_lat}G
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--color-muted)', padding: '24px', textAlign: 'center' }}>
                No circuit corner data configured for this track.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Band 4: White Editorial Canvas — Interactive Circuit Map & Sector Analysis */}
      <section className="cb-band-light">
        <div className="dashboard-container">
          <div className="grid-2">
            {/* Interactive Circuit Map */}
            <div className="card">
              <div className="card-header">
                <div>
                  <span className="badge-pill" style={{ marginBottom: '6px' }}>
                    SPATIAL TELEMETRY
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>
                    {t.circuitMap}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', fontSize: '12px', alignItems: 'center' }}>
                  <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                    ● Racing Line
                  </span>
                  <span style={{ color: 'var(--color-semantic-down)', fontWeight: 600 }}>
                    ● Corner Apex (Click)
                  </span>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--color-surface-dark)',
                  borderRadius: 'var(--rounded-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                {mapPoints.length > 5 ? (
                  <>
                    <svg
                      viewBox="0 0 400 400"
                      style={{ width: '100%', maxWidth: '460px', height: '420px' }}
                    >
                      {/* Racing Line Track Path */}
                      <path
                        d={buildSmoothPath(mapPoints)}
                        fill="none"
                        stroke="rgba(255,255,255,0.16)"
                        strokeWidth="8"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                      <path
                        d={buildSmoothPath(mapPoints)}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="3.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />

                      {/* Sector Dividers */}
                      {[
                        { pt: s1Point, label: 'S1' },
                        { pt: s2Point, label: 'S2' },
                        { pt: s3Point, label: 'S3' },
                      ].map(
                        (sObj, sIdx) =>
                          sObj.pt &&
                          sObj.pt.x !== undefined &&
                          (() => {
                            const pLine = getPerpLine(sObj.pt);
                            if (!pLine) return null;
                            return (
                              <g key={`sec-line-${sIdx}`}>
                                <line
                                  x1={pLine.x1}
                                  y1={pLine.y1}
                                  x2={pLine.x2}
                                  y2={pLine.y2}
                                  stroke="#ffffff"
                                  strokeWidth="2"
                                  opacity="0.85"
                                />
                                <text
                                  x={pLine.x1 + 5}
                                  y={pLine.y1 - 4}
                                  fill="#ffffff"
                                  fontSize="10"
                                  fontWeight="600"
                                >
                                  {sObj.label}
                                </text>
                              </g>
                            );
                          })()
                      )}

                      {/* Interactive Corner Markers from activeCorners / circuit_corners */}
                      {(activeCorners.length > 0 ? activeCorners : circuit_corners).map((c, idx) => {
                        const isSelected = selectedMapPoint === idx;
                        const entryPt =
                          c.entry_x !== undefined && c.entry_x !== 0
                            ? { x: c.entry_x, z: c.entry_z }
                            : mapPoints.find((p) => (p.distance_m || p.dist) >= (c.nom_entry_dist || c.entry_dist));
                        const apexPt =
                          c.apex_x !== undefined && c.apex_x !== 0
                            ? { x: c.apex_x, z: c.apex_z }
                            : mapPoints.find((p) => (p.distance_m || p.dist) >= (c.nom_apex_dist || c.apex_dist));
                        const exitPt =
                          c.exit_x !== undefined && c.exit_x !== 0
                            ? { x: c.exit_x, z: c.exit_z }
                            : mapPoints.find((p) => (p.distance_m || p.dist) >= (c.nom_exit_dist || c.exit_dist));

                        return (
                          <g
                            key={`corner-map-${idx}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedMapPoint(idx)}
                          >
                            {entryPt && entryPt.x !== undefined && (
                              <circle
                                cx={mapX(entryPt.x)}
                                cy={mapZ(entryPt.z)}
                                r={isSelected ? '4.5' : '2.5'}
                                fill="var(--color-accent-yellow)"
                              />
                            )}
                            {exitPt && exitPt.x !== undefined && (
                              <circle
                                cx={mapX(exitPt.x)}
                                cy={mapZ(exitPt.z)}
                                r={isSelected ? '4.5' : '2.5'}
                                fill="var(--color-semantic-up)"
                              />
                            )}
                            {apexPt && apexPt.x !== undefined && (
                              <g>
                                {isSelected && (
                                  <circle
                                    cx={mapX(apexPt.x)}
                                    cy={mapZ(apexPt.z)}
                                    r="11"
                                    fill="rgba(0, 82, 255, 0.35)"
                                  />
                                )}
                                <circle
                                  cx={mapX(apexPt.x)}
                                  cy={mapZ(apexPt.z)}
                                  r={isSelected ? '6.5' : '4.5'}
                                  fill={isSelected ? '#0052ff' : 'var(--color-semantic-down)'}
                                  stroke="#ffffff"
                                  strokeWidth={isSelected ? '2' : '1.2'}
                                />
                                <text
                                  x={mapX(apexPt.x) + 8}
                                  y={mapZ(apexPt.z) + 3}
                                  fill={isSelected ? '#ffffff' : '#d1d5db'}
                                  fontSize={isSelected ? '10.5' : '9'}
                                  fontWeight="600"
                                >
                                  T{c.turn || idx + 1}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}

                      {/* Active Cars */}
                      {players.map((p) => {
                        if (!p.current_telemetry || p.current_telemetry.length === 0) return null;
                        const latestPt = p.current_telemetry[p.current_telemetry.length - 1];
                        if (latestPt.x === undefined || latestPt.z === undefined) return null;
                        const isYou = p.name && p.name.includes('(You)');
                        return (
                          <circle
                            key={`car-dot-${p.id}`}
                            cx={mapX(latestPt.x)}
                            cy={mapZ(latestPt.z)}
                            r={isYou ? 6 : 3.5}
                            fill={isYou ? 'var(--color-semantic-up)' : '#ffffff'}
                            stroke={isYou ? '#ffffff' : 'none'}
                            strokeWidth={isYou ? 2 : 0}
                          >
                            <title>{p.name}</title>
                          </circle>
                        );
                      })}
                    </svg>

                    {/* Selected Map Point Corner Inspector */}
                    {selectedCornerDetail && (
                      <div
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          padding: '16px',
                          backgroundColor: 'var(--color-surface-dark-elevated)',
                          borderRadius: 'var(--rounded-md)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          color: 'var(--color-on-dark)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                          <span style={{ fontWeight: 600, fontSize: '15px', color: '#ffffff' }}>
                            {selectedCornerDetail.name} ({selectedCornerDetail.direction}) —{' '}
                            {isLiveLapSelected ? `LIVE Lap ${current_lap}` : `Lap ${selectedLap?.lap}`}
                          </span>
                          <span className="mono-num" style={{ fontSize: '12px', color: 'var(--color-on-dark-soft)' }}>
                            Brake @ {selectedCornerDetail.brake_point}m · Max {selectedCornerDetail.max_g_lat}G
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
                          <div>
                            <div style={{ color: 'var(--color-on-dark-soft)' }}>Entry</div>
                            <div className="mono-num" style={{ fontSize: '16px', fontWeight: 600 }}>
                              {fmtSpeedVal(selectedCornerDetail.entry_speed)} {speedUnit} · G{selectedCornerDetail.entry_gear}
                            </div>
                            <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-on-dark-soft)' }}>
                              THR {selectedCornerDetail.entry_throttle}% · BRK {selectedCornerDetail.entry_brake}%
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--color-primary)' }}>Apex</div>
                            <div className="mono-num" style={{ fontSize: '16px', fontWeight: 600, color: '#60a5fa' }}>
                              {fmtSpeedVal(selectedCornerDetail.apex_speed)} {speedUnit} · G{selectedCornerDetail.apex_gear}
                            </div>
                            <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-on-dark-soft)' }}>
                              THR {selectedCornerDetail.apex_throttle}% · BRK {selectedCornerDetail.apex_brake}%
                            </div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--color-on-dark-soft)' }}>Exit</div>
                            <div className="mono-num" style={{ fontSize: '16px', fontWeight: 600 }}>
                              {fmtSpeedVal(selectedCornerDetail.exit_speed)} {speedUnit} · G{selectedCornerDetail.exit_gear}
                            </div>
                            <div className="mono-num" style={{ fontSize: '11px', color: 'var(--color-on-dark-soft)' }}>
                              THR {selectedCornerDetail.exit_throttle}% · BRK {selectedCornerDetail.exit_brake}%
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '40px', color: 'var(--color-on-dark-soft)', textAlign: 'center' }}>
                    Waiting for telemetry coordinates to render circuit map...
                  </div>
                )}
              </div>
            </div>

            {/* Sector Analysis Card */}
            <div className="card">
              <div className="card-header">
                <div>
                  <span className="badge-pill" style={{ marginBottom: '6px' }}>
                    SPLIT TIMING
                  </span>
                  <div style={{ fontSize: '20px', fontWeight: 600 }}>
                    {t.sectorAnalysis}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setComparisonMode('ahead')}
                    className={`btn-secondary-light ${comparisonMode === 'ahead' ? 'active' : ''}`}
                  >
                    {t.vsAhead}
                  </button>
                  <button
                    onClick={() => setComparisonMode('leader')}
                    className={`btn-secondary-light ${comparisonMode === 'leader' ? 'active' : ''}`}
                  >
                    {t.vsLeader}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-body)', marginBottom: '10px' }}>
                  {t.sectorHistory}
                </div>
                {sector_history && sector_history.length > 0 ? (
                  <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    <table className="cb-table">
                      <thead>
                        <tr>
                          <th style={{ textAlign: 'left' }}>Lap</th>
                          <th style={{ textAlign: 'left' }}>Lap Time</th>
                          <th style={{ textAlign: 'left' }}>Sector 1</th>
                          <th style={{ textAlign: 'left' }}>Sector 2</th>
                          <th style={{ textAlign: 'left' }}>Sector 3</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sector_history.map((h, i) => {
                          const isRowSelected =
                            !isLiveLapSelected && String(selectedLap?.lap) === String(h.lap);
                          return (
                            <tr
                              key={i}
                              className={`clickable-row ${isRowSelected ? 'selected-row' : ''}`}
                              onClick={() => setSelectedLapId(h.lap)}
                            >
                              <td className="mono-num" style={{ fontWeight: 600 }}>
                                Lap {h.lap}
                              </td>
                              <td
                                className="mono-num"
                                style={{
                                  color:
                                    best_info?.best_lap_num === h.lap
                                      ? 'var(--color-primary)'
                                      : h.valid
                                      ? 'var(--color-semantic-up)'
                                      : 'var(--color-semantic-down)',
                                  fontWeight: best_info?.best_lap_num === h.lap ? 600 : 500,
                                }}
                              >
                                {h.lap_time}
                              </td>
                              <td
                                className="mono-num"
                                style={{
                                  color:
                                    best_info?.best_sector1_lap === h.lap
                                      ? 'var(--color-primary)'
                                      : 'var(--color-ink)',
                                }}
                              >
                                {h.sector1}
                              </td>
                              <td
                                className="mono-num"
                                style={{
                                  color:
                                    best_info?.best_sector2_lap === h.lap
                                      ? 'var(--color-primary)'
                                      : 'var(--color-ink)',
                                }}
                              >
                                {h.sector2}
                              </td>
                              <td
                                className="mono-num"
                                style={{
                                  color:
                                    best_info?.best_sector3_lap === h.lap
                                      ? 'var(--color-primary)'
                                      : 'var(--color-ink)',
                                }}
                              >
                                {h.sector3}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                    No official sector history recorded yet.
                  </div>
                )}
              </div>

              {/* Sector Comparison Bar Chart */}
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-body)', marginBottom: '10px' }}>
                  {t.sectorComparison} ({selectedLap ? `Lap ${selectedLap.lap}` : `Latest Lap`})
                </div>
                {sector_comparisons && sector_comparisons[`vs_${comparisonMode}`] ? (
                  (() => {
                    const list = sector_comparisons[`vs_${comparisonMode}`];
                    const targetLapNum = selectedLap ? selectedLap.lap : list[list.length - 1]?.lap;
                    const compData =
                      list.find((c) => String(c.lap) === String(targetLapNum)) ||
                      list[list.length - 1];
                    if (!compData) {
                      return (
                        <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                          No sector comparison available for this lap.
                        </div>
                      );
                    }

                    return (
                      <div>
                        <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>
                          Lap {compData.lap} Total Delta:{' '}
                          <span className={compData.lap_delta_ms <= 0 ? 'text-up' : 'text-down'}>
                            {compData.lap_delta_ms <= 0 ? '' : '+'}
                            {(compData.lap_delta_ms / 1000).toFixed(3)}s
                          </span>
                        </div>
                        {compData.sectors.map((s, i) => (
                          <div
                            key={i}
                            style={{
                              marginBottom: '10px',
                              backgroundColor: 'var(--color-surface-soft)',
                              padding: '12px 14px',
                              borderRadius: 'var(--rounded-md)',
                              border: '1px solid var(--color-hairline-soft)',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px', fontWeight: 600 }}>
                              <span>Sector {s.sector}</span>
                              <span className={s.delta_ms <= 0 ? 'text-up' : 'text-down'}>
                                {s.delta_ms <= 0 ? '' : '+'}
                                {(s.delta_ms / 1000).toFixed(3)}s
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '11px', width: '40px', color: 'var(--color-muted)' }}>
                                YOU
                              </span>
                              <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--color-surface-strong)', borderRadius: 'var(--rounded-pill)', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${s.player_ms >= s.rival_ms ? 100 : (s.player_ms / s.rival_ms) * 100}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--color-primary)',
                                    borderRadius: 'var(--rounded-pill)',
                                  }}
                                />
                              </div>
                              <span className="mono-num" style={{ fontSize: '11px', width: '56px', textAlign: 'right' }}>
                                {s.player_time}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '11px', width: '40px', color: 'var(--color-muted)' }}>
                                RIVAL
                              </span>
                              <div style={{ flex: 1, height: '8px', backgroundColor: 'var(--color-surface-strong)', borderRadius: 'var(--rounded-pill)', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${s.rival_ms >= s.player_ms ? 100 : (s.rival_ms / s.player_ms) * 100}%`,
                                    height: '100%',
                                    backgroundColor: 'var(--color-muted-soft)',
                                    borderRadius: 'var(--rounded-pill)',
                                  }}
                                />
                              </div>
                              <span className="mono-num" style={{ fontSize: '11px', width: '56px', textAlign: 'right' }}>
                                {s.rival_time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
                    Select a lap from Lap History to view sector delta comparisons.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function SetupPage({ onStart }) {
  const [port, setPort] = useState(20777);
  const [cornerMapOpen, setCornerMapOpen] = useState(false);
  const [tts, setTts] = useState(true);
  const tv = useTvOverlay();
  const [units, setUnits] = useState('metric');
  const [updateRate, setUpdateRate] = useState(60);
  const [voice, setVoice] = useState('redbull');
  const [language, setLanguage] = useState('ko');
  const [useRawReplay, setUseRawReplay] = useState(true);
  const [availableReplays, setAvailableReplays] = useState([]);
  const [replayCircuit, setReplayCircuit] = useState('circuit_Catalunya');
  const [replayLap, setReplayLap] = useState('all');
  const [replaySession, setReplaySession] = useState('');
  const [replaySpeed, setReplaySpeed] = useState(2.0);
  const t = i18n[language];

  useEffect(() => {
    fetch('http://localhost:8080/api/replays')
      .then((res) => res.json())
      .then((data) => {
        if (data.circuits && data.circuits.length > 0) {
          setAvailableReplays(data.circuits);
          const cat = data.circuits.find((c) => c.name.toLowerCase().includes('catalunya'));
          if (cat) {
            setReplayCircuit(cat.id);
          } else {
            setReplayCircuit(data.circuits[0].id);
          }
        }
      })
      .catch(() => {});
  }, []);

  const currentCircuitObj =
    availableReplays.find((c) => c.id === replayCircuit) ||
    (availableReplays.length > 0 ? availableReplays[0] : null);
  const circuitSessions = (currentCircuitObj && currentCircuitObj.sessions) || [];
  const currentSessionObj = circuitSessions.find((s) => s.uid === replaySession) || null;

  useEffect(() => {
    if (circuitSessions.length > 0 && !circuitSessions.some((s) => s.uid === replaySession)) {
      const longest = circuitSessions.reduce((a, b) => (b.frames > a.frames ? b : a));
      setReplaySession(longest.uid);
      setReplayLap('all');
    }
  }, [replayCircuit, availableReplays]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-canvas)' }}>
      {/* Coinbase Top Nav */}
      <header className="cb-top-nav">
        <div className="cb-top-nav-inner">
          <div className="cb-brand">
            <span className="cb-brand-mark">F1</span>
            <span>Race Engineer</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setLanguage('ko')}
              className={`btn-secondary-light ${language === 'ko' ? 'active' : ''}`}
            >
              한국어
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`btn-secondary-light ${language === 'en' ? 'active' : ''}`}
            >
              English
            </button>
          </div>
        </div>
      </header>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 20px 80px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '640px', marginBottom: '36px' }}>
          <span className="badge-pill" style={{ marginBottom: '12px' }}>
            F1 26 TELEMETRY ANALYTICS
          </span>
          <h1 className="hero-heading" style={{ fontSize: '48px', marginBottom: '12px' }}>
            {t.title}
          </h1>
          <p style={{ color: 'var(--color-body)', fontSize: '16px', margin: 0 }}>
            {t.subtitle}
          </p>
          <button
            onClick={() => setCornerMapOpen(true)}
            className="btn-secondary-light"
            style={{ marginTop: '20px' }}
          >
            🗺 Corner Map
          </button>
        </div>

        <div className="card" style={{ width: '100%', maxWidth: '600px', marginBottom: '24px' }}>
          <h2 className="card-header" style={{ fontSize: '20px', marginBottom: '24px' }}>
            {t.sessionSetup}
          </h2>

          {/* Recorded Telemetry Replay Mode */}
          <div
            style={{
              padding: '20px',
              backgroundColor: 'var(--color-surface-soft)',
              borderRadius: 'var(--rounded-lg)',
              border: useRawReplay
                ? '1.5px solid var(--color-primary)'
                : '1px solid var(--color-hairline)',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '16px', color: 'var(--color-ink)' }}>
                  {t.useRawReplay}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-body)', marginTop: '4px' }}>
                  {t.useRawReplayDesc}
                </div>
              </div>
              <button
                onClick={() => setUseRawReplay(!useRawReplay)}
                className={`btn-secondary-light ${useRawReplay ? 'active' : ''}`}
              >
                {useRawReplay ? 'ENABLED' : 'OFF'}
              </button>
            </div>

            {useRawReplay && (
              <div
                style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--color-hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--color-body)', fontWeight: 600 }}>
                    {t.replayCircuit}
                  </label>
                  <select
                    value={replayCircuit}
                    onChange={(e) => {
                      setReplayCircuit(e.target.value);
                      setReplayLap('all');
                    }}
                    className="cb-select"
                    style={{ width: '100%' }}
                  >
                    {availableReplays.length > 0 ? (
                      availableReplays.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.sessions && c.sessions.length > 0
                            ? ` (${c.sessions.length} Sessions)`
                            : ` (${c.files.length} Completed Laps)`}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="circuit_Catalunya">Catalunya (9 Laps)</option>
                        <option value="circuit_Austria">Austria (1 Lap)</option>
                      </>
                    )}
                  </select>
                </div>

                {circuitSessions.length > 0 && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--color-body)', fontWeight: 600 }}>
                      {t.replaySession}
                    </label>
                    <select
                      value={replaySession}
                      onChange={(e) => {
                        setReplaySession(e.target.value);
                        setReplayLap('all');
                      }}
                      className="cb-select"
                      style={{ width: '100%' }}
                    >
                      {circuitSessions.map((s) => (
                        <option key={s.uid} value={s.uid}>
                          {s.label}
                          {s.laps && s.laps.length > 0
                            ? ` · Lap ${s.laps[0]}–${s.laps[s.laps.length - 1]}`
                            : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--color-body)', fontWeight: 600 }}>
                      {t.replayLap}
                    </label>
                    <select
                      value={replayLap}
                      onChange={(e) => setReplayLap(e.target.value)}
                      className="cb-select"
                      style={{ width: '100%' }}
                    >
                      <option value="all">{t.replayAllLaps}</option>
                      {currentSessionObj && currentSessionObj.laps && currentSessionObj.laps.length > 0
                        ? currentSessionObj.laps.map((l) => (
                            <option key={l} value={String(l)}>
                              Lap {l}
                            </option>
                          ))
                        : currentCircuitObj && currentCircuitObj.files
                        ? currentCircuitObj.files.map((f) => (
                            <option key={f.filename} value={String(f.lap)}>
                              Lap {f.lap} ({f.size_mb} MB)
                            </option>
                          ))
                        : [1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                            <option key={l} value={String(l)}>
                              Lap {l}
                            </option>
                          ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: 'var(--color-body)', fontWeight: 600 }}>
                      {t.replaySpeed}
                    </label>
                    <select
                      value={replaySpeed}
                      onChange={(e) => setReplaySpeed(Number(e.target.value))}
                      className="cb-select"
                      style={{ width: '100%' }}
                    >
                      <option value={1.0}>1x (Real-time)</option>
                      <option value={2.0}>2x (Recommended)</option>
                      <option value={4.0}>4x (Fast)</option>
                      <option value={8.0}>8x (Ultra Fast)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
              {t.udpPort}
            </label>
            <input
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              className="cb-input mono-num"
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '6px' }}>
              {t.udpDesc}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                {t.updateRate}
              </label>
              <select
                value={updateRate}
                onChange={(e) => setUpdateRate(Number(e.target.value))}
                className="cb-select"
                style={{ width: '100%' }}
              >
                <option value={30}>30 Hz</option>
                <option value={60}>60 Hz</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '13px' }}>
                {t.units}
              </label>
              <select
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                className="cb-select"
                style={{ width: '100%' }}
              >
                <option value="metric">Metric (km/h, °C)</option>
                <option value="imperial">Imperial (mph, °F)</option>
              </select>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-surface-soft)',
              borderRadius: 'var(--rounded-md)',
              border: '1px solid var(--color-hairline-soft)',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>📺 {t.overlay}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '2px' }}>
                  {t.overlayDesc}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    marginTop: '6px',
                    color: TV_DOT[tv.state] || (tv.st?.enabled ? '#f5a623' : 'var(--color-body)'),
                  }}
                >
                  ● {tvText(language, tv.state)[1]}
                  {tv.state === 'error' && tv.st?.error ? ` (${tv.st.error})` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                {tv.state === 'needs_install' && (
                  <button onClick={tv.install} className="btn-secondary-light">
                    {language === 'ko' ? '설치' : 'Install'}
                  </button>
                )}
                <button
                  onClick={() => tv.setEnabled(!tv.st?.enabled)}
                  className={`btn-secondary-light ${tv.st?.enabled ? 'active' : ''}`}
                >
                  {tv.st?.enabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--color-surface-soft)',
              borderRadius: 'var(--rounded-md)',
              border: '1px solid var(--color-hairline-soft)',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{t.tts}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '2px' }}>
                  {t.ttsDesc}
                </div>
              </div>
              <button
                onClick={() => setTts(!tts)}
                className={`btn-secondary-light ${tts ? 'active' : ''}`}
              >
                {tts ? 'ON' : 'OFF'}
              </button>
            </div>

            {tts && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--color-hairline)' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '12px', color: 'var(--color-body)' }}>
                  {t.persona}
                </label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="cb-select"
                  style={{ width: '100%' }}
                >
                  <option value="redbull">Red Bull Engineer — Red Bull Racing</option>
                  <option value="bono" disabled>Bono (Peter Bonnington) — Mercedes-AMG ({t.comingSoon})</option>
                  <option value="adami" disabled>Ricky (Riccardo Adami) — Scuderia Ferrari ({t.comingSoon})</option>
                </select>

                <div style={{ marginTop: '14px', fontSize: '12px', fontWeight: 600, color: 'var(--color-body)' }}>
                  {t.radioPlanTitle}
                </div>
                <ul style={{ margin: '6px 0 0', paddingLeft: '18px', fontSize: '12px', color: 'var(--color-body)', lineHeight: 1.6 }}>
                  {t.radioPlan.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() =>
            onStart({
              port,
              tts,
              units,
              updateRate,
              voice,
              language,
              useRawReplay,
              replayCircuit,
              replaySession,
              replayLap,
              replaySpeed,
            })
          }
          className="btn-pill-cta"
          style={{ width: '100%', maxWidth: '600px' }}
        >
          {t.connect}
        </button>
      </div>
      <CornerMapModal open={cornerMapOpen} onClose={() => setCornerMapOpen(false)} language={language} />
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ hasError: true, error: error, errorInfo: errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', color: 'var(--color-semantic-down)', backgroundColor: 'var(--color-canvas)', minHeight: '100vh' }}>
          <h2>Something went wrong in React.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [sessionActive, setSessionActive] = useState(false);
  const [settings, setSettings] = useState({
    port: 20777,
    tts: true,
    units: 'metric',
    updateRate: 60,
    voice: 'redbull',
    language: 'ko',
    useRawReplay: true,
    replayCircuit: 'circuit_Catalunya',
    replaySession: '',
    replayLap: 'all',
    replaySpeed: 2.0,
  });

  return (
    <ErrorBoundary>
      {!sessionActive ? (
        <SetupPage
          onStart={(s) => {
            setSettings(s);
            setSessionActive(true);
          }}
        />
      ) : (
        <Dashboard
          settings={settings}
          setSettings={setSettings}
          onExit={() => setSessionActive(false)}
        />
      )}
    </ErrorBoundary>
  );
}
