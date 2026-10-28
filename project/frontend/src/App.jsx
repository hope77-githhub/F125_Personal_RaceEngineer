import React, { useState, useEffect, useRef } from 'react';
import './styles/design-system.css';

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
    ttsDesc: "Enable real-time voice briefings from your race engineer.",
    persona: "Engineer Persona",
    overlay: "HUD Overlay Mode",
    overlayDesc: "Enable transparent overlay rendering above the game window.",
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
    replaySpeed: "Playback Speed",
    replayAllLaps: "All Completed Laps (Sequential)",
    replayModeBadge: "REPLAY",
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
    ttsDesc: "레이스 엔지니어의 실시간 음성 브리핑을 활성화합니다.",
    persona: "엔지니어 페르소나 선택",
    overlay: "오버레이 모드 (HUD)",
    overlayDesc: "게임 화면 위에 표시되는 오버레이 모드를 설정합니다.",
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
    replaySpeed: "재생 배속",
    replayAllLaps: "전체 완주 랩 순차 재생 (권장)",
    replayModeBadge: "리플레이",
  },
};

function Dashboard({ settings, setSettings, onExit }) {
  const t = i18n[settings.language || 'ko'];
  const [data, setData] = useState(null);
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
            <button
              onClick={() => setSettings({ ...settings, overlay: !settings.overlay })}
              className={`btn-secondary-light ${settings.overlay ? 'active' : ''}`}
            >
              HUD {settings.overlay ? 'ON' : 'OFF'}
            </button>
            <div
              className="badge-pill"
              style={{
                backgroundColor: 'var(--color-surface-strong)',
                color: connected ? 'var(--color-semantic-up)' : 'var(--color-semantic-down)',
              }}
            >
              ● {connected ? (settings.useRawReplay ? 'REPLAY STREAM' : `LIVE :${settings.port}`) : 'OFFLINE'}
            </div>
            <button onClick={onExit} className="btn-secondary-light">
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

              {/* AI Race Engineer Strategy Card (pricing-tier-featured dark card style) */}
              <div
                style={{
                  backgroundColor: 'var(--color-surface-dark)',
                  color: 'var(--color-on-dark)',
                  padding: '20px 24px',
                  borderRadius: 'var(--rounded-lg)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', letterSpacing: '0.5px' }}>
                    AI RACE ENGINEER BRIEFING
                  </span>
                  <span className="badge-pill" style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }}>
                    {settings.voice?.toUpperCase() || 'GP'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', lineHeight: 1.55, color: 'var(--color-on-dark)' }}>
                  {strategy}
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
  const [tts, setTts] = useState(true);
  const [overlay, setOverlay] = useState(false);
  const [units, setUnits] = useState('metric');
  const [updateRate, setUpdateRate] = useState(60);
  const [voice, setVoice] = useState('gp');
  const [language, setLanguage] = useState('ko');
  const [useRawReplay, setUseRawReplay] = useState(true);
  const [availableReplays, setAvailableReplays] = useState([]);
  const [replayCircuit, setReplayCircuit] = useState('circuit_Catalunya');
  const [replayLap, setReplayLap] = useState('all');
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
                          {c.name} ({c.files.length} Completed Laps)
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
                      {currentCircuitObj && currentCircuitObj.files
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
                  <option value="gp">GP (Gianpiero Lambiase) — Red Bull Racing</option>
                  <option value="bono">Bono (Peter Bonnington) — Mercedes-AMG</option>
                  <option value="adami">Ricky (Riccardo Adami) — Scuderia Ferrari</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() =>
            onStart({
              port,
              tts,
              overlay,
              units,
              updateRate,
              voice,
              language,
              useRawReplay,
              replayCircuit,
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
    overlay: false,
    units: 'metric',
    updateRate: 60,
    voice: 'gp',
    language: 'ko',
    useRawReplay: true,
    replayCircuit: 'circuit_Catalunya',
    replayLap: 'all',
    replaySpeed: 2.0,
  });

  if (!sessionActive) {
    return (
      <SetupPage
        onStart={(s) => {
          setSettings(s);
          setSessionActive(true);
        }}
      />
    );
  }

  return (
    <ErrorBoundary>
      <Dashboard
        settings={settings}
        setSettings={setSettings}
        onExit={() => setSessionActive(false)}
      />
    </ErrorBoundary>
  );
}
