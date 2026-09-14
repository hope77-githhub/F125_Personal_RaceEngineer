import React, { useState, useEffect, useRef } from 'react';
import { getDummyPayload } from './dummyData.js';
import dummyJson from '../../docs/dummy.json';

const i18n = {
  en: {
    title: "F1 AI RACE ENGINEER",
    sessionSetup: "Session Setup",
    udpPort: "UDP Port (Local)",
    udpDesc: "{t.udpDesc}",
    updateRate: "Telemetry Update Rate",
    updateDesc: "Determines the backend parsing and frontend transmission rate.",
    units: "Measurement Units",
    unitsDesc: "Select the measurement units to display.",
    tts: "AI Engineer TTS (Voice)",
    ttsDesc: "Enables real-time voice briefings from your engineer.",
    persona: "Select Engineer Persona",
    overlay: "Overlay Mode (HUD)",
    overlayDesc: "Enables transparent overlay rendering over the game screen.",
    language: "Language",
    languageDesc: "Select the display language for the dashboard.",
    connect: "CONNECT & START SESSION",
    vsAhead: "vs Ahead",
    vsLeader: "vs Leader",
    whiteLine: "*White line: {compLabelEng}'s input",
    sectorAnalysis: "SECTOR ANALYSIS",
    sectorHistory: "Sector History",
    sectorComparison: "Sector Comparison",
    circuitMap: "CIRCUIT MAP",
    sector1Start: "Sector 1",
    sector2Start: "Sector 2",
    sector3Start: "Sector 3",
    cornerAnalysis: "CORNER ANALYSIS",
    useRawReplay: "Use Raw Data (Replay)",
    useRawReplayDesc: "Replay the accumulated raw telemetry data from the backend jsonl log."
  },
  ko: {
    title: "F1 AI 레이스 엔지니어",
    sessionSetup: "세션 셋업",
    udpPort: "UDP 포트 (로컬)",
    udpDesc: "* F1 26 게임 내 Telemetry 설정의 UDP Port 번호와 일치시켜 주세요. (기본값: 20777)",
    updateRate: "데이터 갱신 주기",
    updateDesc: "백엔드 파싱 및 프론트엔드 전송 주기를 결정합니다.",
    units: "측정 단위",
    unitsDesc: "표시할 측정 단위를 선택합니다. (Metric / Imperial)",
    tts: "AI 엔지니어 음성 (TTS)",
    ttsDesc: "엔지니어의 실시간 음성 브리핑을 활성화합니다.",
    persona: "엔지니어 페르소나 선택",
    overlay: "오버레이 모드 (HUD)",
    overlayDesc: "게임 화면 위에 투명하게 표시되는 오버레이를 사용합니다.",
    language: "언어 (Language)",
    languageDesc: "대시보드 표시 언어를 선택합니다.",
    connect: "세션 연결 및 시작",
    vsAhead: "vs 앞차 (Ahead)",
    vsLeader: "vs 선두 (Leader)",
    whiteLine: "*흰색 선: 경쟁자 조작량",
    sectorAnalysis: "섹터 분석",
    sectorHistory: "섹터 히스토리",
    sectorComparison: "섹터 비교",
    circuitMap: "서킷 맵 (LIVE)",
    sector1Start: "섹터 1",
    sector2Start: "섹터 2",
    sector3Start: "섹터 3",
    cornerAnalysis: "코너 구간 분석",
    useRawReplay: "Raw Data 리플레이 사용",
    useRawReplayDesc: "백엔드에 누적된 raw_telemetry_log.jsonl 데이터를 바탕으로 주행을 시뮬레이션합니다."
  }
};

import './styles/design-system.css';

function Dashboard({ settings, setSettings, onExit }) {
  const t = i18n[settings.language || 'ko'];
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('p_1');
  const [selectedLapId, setSelectedLapId] = useState(null);
  const [comparisonMode, setComparisonMode] = useState('ahead');
  const [selectedMapPoint, setSelectedMapPoint] = useState(null);
  const [showTelemetryBars, setShowTelemetryBars] = useState(true);

  const [visibleSpeeds, setVisibleSpeeds] = useState({ p_1: true, p_2: true, p_3: true });
  const toggleSpeed = (id) => setVisibleSpeeds(prev => ({ ...prev, [id]: !prev[id] }));
  const historyRef = useRef([]);

  if (data) {
     const newPoint = { time: Date.now() };
     data.players.forEach(p => {
        newPoint[`speed_${p.id}`] = p.live_telemetry.speed;
        if (p.id === selectedPlayerId) {
           newPoint.throttle = p.live_telemetry.throttle;
           newPoint.brake = p.live_telemetry.brake;
        }
     });
     historyRef.current.push(newPoint);
     if (historyRef.current.length > 200) historyRef.current.shift();
  }
  const history = historyRef.current;



  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8080/ws?port=${settings.port}&rate=${settings.updateRate}&units=${settings.units}&replay=${settings.useRawReplay}`);
    
    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      if (parsedData.status === "waiting_for_data") {
        // Keep waiting screen until real data arrives
        return;
      }
      setData(parsedData);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [settings.port, settings.units, settings.updateRate, settings.useRawReplay]);


  if (!data) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2 className="hero-heading">Connecting to Telemetry...</h2>
      </div>
    );
  }

  const { circuit_environment, players, sector_comparisons } = data;
  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0];
  const { live_telemetry, car_setup, lap_history, current_lap, name, tyre_compound, strategy, sector_history, best_info, current_telemetry } = selectedPlayer;
  const selectedLap = lap_history ? lap_history.find(l => String(l.lap) === String(selectedLapId)) : null;

  // --- Track Map Logic (always use player's data for the most accurate circuit drawing) ---
  const playerData = players.find(p => p.name && p.name.includes('(You)'));
  let trackPoints = [];
  if (playerData) {
    trackPoints = playerData.current_telemetry || [];
    if (playerData.lap_history && playerData.lap_history.length > 0) {
      const lastPlayerLapPoints = playerData.lap_history[playerData.lap_history.length - 1].telemetry_points || [];
      if (lastPlayerLapPoints.length > trackPoints.length) {
        trackPoints = lastPlayerLapPoints;
      }
    }
  }
  // Fallback to selected player if player not found
  if (trackPoints.length === 0) {
    trackPoints = current_telemetry || [];
    if (lap_history && lap_history.length > 0) {
      const lastLapPoints = lap_history[lap_history.length - 1].telemetry_points || [];
      if (lastLapPoints.length > trackPoints.length) {
        trackPoints = lastLapPoints;
      }
    }
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  trackPoints.forEach(p => {
      if (p.x !== undefined && p.z !== undefined) {
         if (p.x < minX) minX = p.x;
         if (p.x > maxX) maxX = p.x;
         if (p.z < minZ) minZ = p.z;
         if (p.z > maxZ) maxZ = p.z;
      }
  });

  const mapPadding = 20;
  const rangeX = (maxX - minX) || 1;
  const rangeZ = (maxZ - minZ) || 1;
  const mapScale = Math.min((400 - mapPadding*2) / rangeX, (400 - mapPadding*2) / rangeZ);
  
  const offsetX = (400 - (rangeX * mapScale)) / 2;
  const offsetZ = (400 - (rangeZ * mapScale)) / 2;
  
  const mapX = (x) => offsetX + (x - minX) * mapScale;
  const mapZ = (z) => 400 - (offsetZ + (z - minZ) * mapScale); // Flip Z for SVG

  const s2Dist = circuit_environment.sector2_start;
  const s3Dist = circuit_environment.sector3_start;
  let s1Point = null;
  let s2Point = null;
  let s3Point = null;
  
  if (trackPoints.length > 0) {
      s1Point = trackPoints.reduce((prev, curr) => Math.abs(curr.distance_m - 0) < Math.abs(prev.distance_m - 0) ? curr : prev);
  }
  if (s2Dist > 0 && trackPoints.length > 0) {
      s2Point = trackPoints.reduce((prev, curr) => Math.abs(curr.distance_m - s2Dist) < Math.abs(prev.distance_m - s2Dist) ? curr : prev);
  }
  if (s3Dist > 0 && trackPoints.length > 0) {
      s3Point = trackPoints.reduce((prev, curr) => Math.abs(curr.distance_m - s3Dist) < Math.abs(prev.distance_m - s3Dist) ? curr : prev);
  }

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-xl)' }}>
        <div>
           <h1 className="hero-heading" style={{ marginBottom: '8px' }}>RACE ENGINEER HUD</h1>
           <div style={{ display: 'flex', gap: '16px', color: 'var(--color-link)', fontSize: '14px', fontWeight: 'bold' }}>
             <span>📍 {circuit_environment.track_name} ({circuit_environment.track_length}m)</span>
             <span>🌤️ {circuit_environment.weather}</span>
             <span>🌡️ Track: {circuit_environment.track_temp}°C</span>
             <span>🌬️ Air: {circuit_environment.air_temp}°C</span>
             <span>🏁 Laps: {circuit_environment.total_laps}</span>
           </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setSettings({...settings, tts: !settings.tts})} className="badge" style={{ cursor: 'pointer', border: 'none', backgroundColor: settings.tts ? 'var(--color-green)' : 'var(--color-surface-onyx)', color: settings.tts ? '#000' : '#fff', fontWeight: 'bold', fontSize: '14px', padding: '8px 16px' }}>
             TTS: {settings.tts ? `ON (${settings.voice.toUpperCase()})` : 'OFF'}
          </button>
          <button onClick={() => setSettings({...settings, overlay: !settings.overlay})} className="badge" style={{ cursor: 'pointer', border: 'none', backgroundColor: settings.overlay ? 'var(--color-green)' : 'var(--color-surface-onyx)', color: settings.overlay ? '#000' : '#fff', fontWeight: 'bold', fontSize: '14px', padding: '8px 16px' }}>
             OVERLAY: {settings.overlay ? 'ON' : 'OFF'}
          </button>
          <button onClick={onExit} className="badge" style={{ cursor: 'pointer', border: 'none', backgroundColor: 'var(--color-surface-indigo)', color: '#fff', fontWeight: 'bold', fontSize: '14px', padding: '8px 16px' }}>
             EXIT
          </button>
          <div className="badge" style={{ backgroundColor: connected ? 'var(--color-green)' : '#ff3366', color: '#000', fontSize: '14px', padding: '8px 16px' }}>
            {connected ? `LIVE (UDP: ${settings.port})` : 'OFFLINE'}
          </div>
        </div>
      </div>

      <div className="grid-3">
        {/* Live Telemetry for Selected Player */}
                <div className="card-gradient" style={{ gridColumn: 'span 2' }}>
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{name} - LIVE TELEMETRY (LAP {current_lap})</span>
          </div>
          <div className="grid-3" style={{ marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>SPEED</div>
              <div className="stat-value">{settings.units === 'metric' ? live_telemetry.speed : Math.round(live_telemetry.speed * 0.621371)} <span style={{fontSize:'20px'}}>{settings.units === 'metric' ? 'KM/H' : 'MPH'}</span></div>
            </div>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>GEAR</div>
              <div className="stat-value" style={{ color: 'var(--color-ink)' }}>{live_telemetry.gear === 0 ? 'R' : live_telemetry.gear}</div>
            </div>
            <div>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>RPM</div>
              <div className="stat-value" style={{ color: 'var(--color-ink)' }}>{live_telemetry.rpm}</div>
            </div>
          </div>
          
          <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '12px', gap: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>SPEED (vs Rivals)</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                   {players.map(p => {
                       const isVisible = visibleSpeeds[p.id];
                       const color = p.id === 'p_1' ? 'var(--color-primary)' : p.id === 'p_2' ? 'var(--color-ink)' : 'var(--color-link)';
                       const shortName = p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name;
                       return (
                          <button 
                             key={p.id}
                             onClick={() => toggleSpeed(p.id)}
                             title={p.name}
                             style={{ backgroundColor: isVisible ? color : 'transparent', color: isVisible ? '#000' : color, border: `1px solid ${color}`, fontSize: '9px', padding: '2px 5px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}
                          >
                             {shortName}
                          </button>
                       );
                   })}
                </div>
            </div>
            <svg viewBox="0 0 400 200" style={{ width: '100%', height: '250px', backgroundColor: 'var(--color-canvas)', borderRadius: '4px', display: 'block' }}>
                <line x1="0" y1="50" x2="400" y2="50" stroke="#555" strokeDasharray="3" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="#555" strokeDasharray="3" />
                <line x1="0" y1="150" x2="400" y2="150" stroke="#555" strokeDasharray="3" />
                
                {players.map(p => {
                    if (!visibleSpeeds[p.id]) return null;
                    const color = p.id === 'p_1' ? 'var(--color-primary)' : p.id === 'p_2' ? 'var(--color-ink)' : 'var(--color-link)';
                    const maxSpeed = settings.units === 'imperial' ? 225 : 360;
                    const xScale = 400 / Math.max(history.length - 1, 1);
                    const pathData = history.map((pt, i) => {
                        const x = i * xScale;
                        const y = 200 - (Math.min(maxSpeed, (pt[`speed_${p.id}`] || 0)) / maxSpeed) * 200;
                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');
                    return <path key={p.id} d={pathData} fill="none" stroke={color} strokeWidth="2" />;
                })}
            </svg>
          </div>

          <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>THROTTLE & BRAKE ({name})</span>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                   <span style={{ color: 'var(--color-green)', fontWeight: 'bold' }}>■ Throttle</span>
                   <span style={{ color: '#ff3366', fontWeight: 'bold' }}>■ Brake</span>
                </div>
            </div>
            <svg viewBox="0 0 400 200" style={{ width: '100%', height: '250px', backgroundColor: 'var(--color-canvas)', borderRadius: '4px', display: 'block' }}>
                <line x1="0" y1="50" x2="400" y2="50" stroke="#555" strokeDasharray="3" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="#555" strokeDasharray="3" />
                <line x1="0" y1="150" x2="400" y2="150" stroke="#555" strokeDasharray="3" />
                <path d={history.map((pt, i) => { const x = i * (400 / Math.max(history.length - 1, 1)); return `${i === 0 ? 'M' : 'L'} ${x} ${200 - (pt.throttle / 100) * 200}`; }).join(' ')} fill="none" stroke="var(--color-green)" strokeWidth="2" />
                <path d={history.map((pt, i) => { const x = i * (400 / Math.max(history.length - 1, 1)); return `${i === 0 ? 'M' : 'L'} ${x} ${200 - (pt.brake / 100) * 200}`; }).join(' ')} fill="none" stroke="#ff3366" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* Leaderboard (Player Selection) */}
        <div className="card">
          <div className="card-header">LEADERBOARD (SELECT)</div>
          {players.map((driver) => (
             <div 
               key={driver.id} 
               className={`leaderboard-row clickable-row ${selectedPlayerId === driver.id ? 'active' : ''}`}
               onClick={() => { setSelectedPlayerId(driver.id); setSelectedLapId(null); }}
               style={{
                 backgroundColor: selectedPlayerId === driver.id ? 'var(--color-primary)' : 'var(--color-surface-onyx)'
               }}
             >
               <span style={{ width: '30px', fontWeight: 'bold' }}>P{driver.position}</span>
               <span style={{ flex: 1, fontWeight: 'bold' }}>{driver.name}</span>
               <span style={{ color: selectedPlayerId === driver.id ? 'var(--color-ink)' : 'var(--color-link)' }}>{driver.gap}</span>
             </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        {/* Car Setup & Tyre Wear */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{name}'s CAR SETUP</span>
            <span className="badge" style={{ backgroundColor: 'var(--color-primary)', color: '#000' }}>Tyre: {tyre_compound}</span>
          </div>
          <div className="grid-3" style={{ marginBottom: 'var(--spacing-md)', gap: '12px' }}>
            {/* AERO */}
            <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-link)', marginBottom: '4px' }}>AERO WING</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Front: {car_setup.front_wing}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Rear: {car_setup.rear_wing}</div>
            </div>
            {/* DIFFERENTIAL */}
            <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-link)', marginBottom: '4px' }}>TRANSMISSION DIFF</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>On Throttle: {car_setup.on_throttle_diff}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Off Throttle: {car_setup.off_throttle_diff}</div>
            </div>
            {/* GEOMETRY */}
            <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-link)', marginBottom: '4px' }}>GEOMETRY</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Camber (Front): {car_setup.front_camber}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Camber (Rear): {car_setup.rear_camber}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Toe (Front): {car_setup.front_toe}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Toe (Rear): {car_setup.rear_toe}</div>
            </div>
            {/* SUSPENSION & ARB */}
            <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-link)', marginBottom: '4px' }}>SUSPENSION</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Stiffness (Front): {car_setup.front_suspension}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Stiffness (Rear): {car_setup.rear_suspension}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Anti-Roll (Front): {car_setup.front_anti_roll_bar}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Anti-Roll (Rear): {car_setup.rear_anti_roll_bar}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Ride Ht (Front): {car_setup.front_suspension_height}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Ride Ht (Rear): {car_setup.rear_suspension_height}</div>
            </div>
            {/* BRAKES */}
            <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-link)', marginBottom: '4px' }}>BRAKES</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>Bias: {car_setup.brake_bias}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '6px' }}>Pressure: {car_setup.brake_pressure}</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>Engine Braking: {car_setup.engine_braking}</div>
            </div>
            {/* TYRES & WEIGHT */}
            <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-link)', marginBottom: '4px' }}>TYRES & WEIGHT</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Tyre PSI (Front L): {car_setup.tyre_pressures?.[0]}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Tyre PSI (Front R): {car_setup.tyre_pressures?.[1]}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Tyre PSI (Rear L): {car_setup.tyre_pressures?.[2]}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>Tyre PSI (Rear R): {car_setup.tyre_pressures?.[3]}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Ballast: {car_setup.ballast}</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold' }}>Fuel: {car_setup.fuel_load}kg</div>
            </div>
          </div>
          
          <div className="card-header" style={{ marginTop: 'var(--spacing-xl)', fontSize: '18px' }}>LIVE TYRE WEAR</div>
          <div className="grid-2" style={{ gap: '8px', marginBottom: 'var(--spacing-lg)' }}>
             <div className="leaderboard-row" style={{ marginBottom: 0 }}>FL: <span style={{fontWeight:'bold', color:'var(--color-magenta)'}}>{live_telemetry.tyre_wear[0]}%</span></div>
             <div className="leaderboard-row" style={{ marginBottom: 0 }}>FR: <span style={{fontWeight:'bold', color:'var(--color-magenta)'}}>{live_telemetry.tyre_wear[1]}%</span></div>
             <div className="leaderboard-row" style={{ marginBottom: 0 }}>RL: <span style={{fontWeight:'bold', color:'var(--color-magenta)'}}>{live_telemetry.tyre_wear[2]}%</span></div>
             <div className="leaderboard-row" style={{ marginBottom: 0 }}>RR: <span style={{fontWeight:'bold', color:'var(--color-magenta)'}}>{live_telemetry.tyre_wear[3]}%</span></div>
          </div>

          <div className="card-header" style={{ fontSize: '18px', color: 'var(--color-link)' }}>STRATEGY AI</div>
          <div style={{ backgroundColor: 'var(--color-surface-onyx)', padding: '16px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5', borderLeft: '4px solid var(--color-primary)' }}>
            {strategy}
          </div>
        </div>

        {/* Lap History */}
        <div className="card">
          <div className="card-header">{name}'s LAP HISTORY</div>
          {lap_history.map((lap, i) => (
             <div 
               key={i} 
               className="leaderboard-row clickable-row" 
               onClick={() => setSelectedLapId(selectedLapId === lap.lap ? null : lap.lap)}
               style={{ backgroundColor: selectedLapId === lap.lap ? 'var(--color-surface-indigo)' : 'var(--color-surface-onyx)', border: selectedLapId === lap.lap ? '1px solid var(--color-primary)' : '1px solid transparent' }}
             >
               <span style={{ fontWeight: 'bold' }}>Lap {lap.lap}</span>
               <span>{lap.time}</span>
               <span style={{ color: lap.delta.startsWith('-') ? 'var(--color-green)' : '#ff3366', fontWeight: 'bold' }}>{lap.delta}</span>
             </div>
          ))}

          {selectedLap && (
            <div style={{ marginTop: 'var(--spacing-xl)', backgroundColor: 'var(--color-canvas)', padding: 'var(--spacing-lg)', borderRadius: 'var(--rounded-lg)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                 <div className="card-header" style={{ fontSize: '18px', color: 'var(--color-green)', marginBottom: 0 }}>LAP {selectedLap.lap} ANALYSIS</div>
                 <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                       onClick={() => setComparisonMode('ahead')}
                       style={{ backgroundColor: comparisonMode === 'ahead' ? 'var(--color-primary)' : 'var(--color-surface-onyx)', color: comparisonMode === 'ahead' ? '#000' : '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >{t.vsAhead}</button>
                    <button 
                       onClick={() => setComparisonMode('leader')}
                       style={{ backgroundColor: comparisonMode === 'leader' ? 'var(--color-primary)' : 'var(--color-surface-onyx)', color: comparisonMode === 'leader' ? '#000' : '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >{t.vsLeader}</button>
                 </div>
               </div>
               
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                 <div className="badge" style={{ backgroundColor: 'var(--color-surface-indigo)' }}>
                   Tyre wear consumed: <span style={{color: '#ff3366'}}>{selectedLap.avg_tyre_wear_lap || selectedLap.tyre_wear_consumed}%</span>
                 </div>
               </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>Telemetry Points (Throttle/Brake):</strong>
                    <button 
                      onClick={() => setShowTelemetryBars(!showTelemetryBars)}
                      style={{ backgroundColor: 'var(--color-surface-onyx)', color: '#fff', border: 'none', padding: '2px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                    >
                      {showTelemetryBars ? 'HIDE' : 'SHOW'}
                    </button>
                  </div>

                              {showTelemetryBars && ((selectedLap.telemetry_points || []).length > 0 ? selectedLap.telemetry_points.map((tp, idx) => {
                  const compBrake = comparisonMode === 'ahead' ? tp.rival_brake : (tp.leader_brake || tp.rival_brake);
                  const compThrottle = comparisonMode === 'ahead' ? tp.rival_throttle : (tp.leader_throttle || tp.rival_throttle);
                  const compTimeDiff = comparisonMode === 'ahead' ? tp.time_diff_to_rival : (tp.time_diff_leader || tp.time_diff_to_rival);
                  const compWearDiff = comparisonMode === 'ahead' ? tp.wear_diff : (tp.wear_diff_leader || tp.wear_diff);
                  
                  const compLabelEng = comparisonMode === 'ahead' ? 'Ahead' : 'Leader';

                  return (
                    <div key={idx} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                         <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{tp.distance}</span>
                         {compTimeDiff ? (
                             <span style={{ fontSize: '12px', fontWeight: 'bold', color: String(compTimeDiff).includes('Faster') ? 'var(--color-green)' : (String(compTimeDiff).includes('Equal') ? 'var(--color-ink)' : '#ff3366') }}>
                               {String(compTimeDiff).replace('Faster', `Faster vs ${compLabelEng}`).replace('Slower', `Slower vs ${compLabelEng}`).replace('Equal', `Equal to ${compLabelEng}`)}
                             </span>
                         ) : null}
                      </div>
                      
                      {compWearDiff && (
                         <div style={{ fontSize: '11px', color: 'var(--color-link)', marginBottom: '8px' }}>
                           Tyre Wear Diff (vs {compLabelEng}): {compWearDiff}%
                         </div>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', width: '30px' }}>BRK</span>
                        <div style={{ flex: 1, position: 'relative', height: '12px', backgroundColor: 'var(--color-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                           {compBrake !== undefined && (
                               <div style={{ position: 'absolute', top: 0, left: `${compBrake}%`, width: '2px', height: '100%', backgroundColor: '#fff', zIndex: 10 }}></div>
                           )}
                           <div style={{ width: `${tp.brake}%`, height: '100%', backgroundColor: '#ff3366', opacity: 0.8 }}></div>
                        </div>
                        <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{tp.brake}%</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                        <span style={{ fontSize: '12px', width: '30px' }}>THR</span>
                        <div style={{ flex: 1, position: 'relative', height: '12px', backgroundColor: 'var(--color-canvas)', borderRadius: '4px', overflow: 'hidden' }}>
                           {compThrottle !== undefined && (
                               <div style={{ position: 'absolute', top: 0, left: `${compThrottle}%`, width: '2px', height: '100%', backgroundColor: '#fff', zIndex: 10 }}></div>
                           )}
                           <div style={{ width: `${tp.throttle}%`, height: '100%', backgroundColor: 'var(--color-green)', opacity: 0.8 }}></div>
                        </div>
                        <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{tp.throttle}%</span>
                      </div>
                      {compBrake !== undefined && (
                          <div style={{ fontSize: '10px', color: 'var(--color-ink)', textAlign: 'right', marginTop: '4px' }}>
                            {t.whiteLine ? t.whiteLine.replace('{compLabelEng}', compLabelEng) : ''} 
                          </div>
                      )}
                    </div>
                  );
               }) : (
                  <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-link)' }}>
                     No telemetry data available for this lap yet.
                  </div>
               ))}
            </div>
          )}
      </div>
    </div>


      {/* Sector Analysis Section */}
      <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="card-header">{t.sectorAnalysis}</div>
        <div className="grid-2">
          {/* Sector History Table */}
          <div>
            <h3 style={{ marginBottom: '12px', fontSize: '16px', color: 'var(--color-link)' }}>{t.sectorHistory}</h3>
            {sector_history && sector_history.length > 0 ? (
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #999' }}>
                    <th style={{ padding: '8px' }}>Lap</th>
                    <th style={{ padding: '8px' }}>Time</th>
                    <th style={{ padding: '8px' }}>S1</th>
                    <th style={{ padding: '8px' }}>S2</th>
                    <th style={{ padding: '8px' }}>S3</th>
                  </tr>
                </thead>
                <tbody>
                  {sector_history.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #999', color: h.valid ? 'var(--color-green)' : '#ff3366' }}>
                      <td style={{ padding: '8px', color: 'var(--color-ink)' }}>{h.lap}</td>
                      <td style={{ padding: '8px', color: best_info?.best_lap_num === h.lap ? 'var(--color-magenta)' : 'inherit', fontWeight: best_info?.best_lap_num === h.lap ? 'bold' : 'normal' }}>{h.lap_time}</td>
                      <td style={{ padding: '8px', color: best_info?.best_sector1_lap === h.lap ? 'var(--color-magenta)' : 'inherit', fontWeight: best_info?.best_sector1_lap === h.lap ? 'bold' : 'normal' }}>{h.sector1}</td>
                      <td style={{ padding: '8px', color: best_info?.best_sector2_lap === h.lap ? 'var(--color-magenta)' : 'inherit', fontWeight: best_info?.best_sector2_lap === h.lap ? 'bold' : 'normal' }}>{h.sector2}</td>
                      <td style={{ padding: '8px', color: best_info?.best_sector3_lap === h.lap ? 'var(--color-magenta)' : 'inherit', fontWeight: best_info?.best_sector3_lap === h.lap ? 'bold' : 'normal' }}>{h.sector3}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ color: 'var(--color-muted)' }}>No sector history available.</div>
            )}
          </div>

          {/* Sector Comparison Bar Chart */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', color: 'var(--color-link)' }}>{t.sectorComparison}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setComparisonMode('ahead')}
                  style={{ backgroundColor: comparisonMode === 'ahead' ? 'var(--color-primary)' : 'var(--color-surface-onyx)', color: comparisonMode === 'ahead' ? '#000' : '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >{t.vsAhead}</button>
                <button 
                  onClick={() => setComparisonMode('leader')}
                  style={{ backgroundColor: comparisonMode === 'leader' ? 'var(--color-primary)' : 'var(--color-surface-onyx)', color: comparisonMode === 'leader' ? '#000' : '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >{t.vsLeader}</button>
              </div>
            </div>
            
            {sector_comparisons && sector_comparisons[`vs_${comparisonMode}`] && selectedLapId ? (() => {
              const compData = sector_comparisons[`vs_${comparisonMode}`].find(c => String(c.lap) === String(selectedLapId));
              if (!compData) return <div style={{ color: 'var(--color-muted)' }}>No comparison data for Lap {selectedLapId}.</div>;
              
              return (
                <div>
                  <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>
                    Lap {compData.lap} Delta: <span style={{ color: compData.lap_delta_ms < 0 ? 'var(--color-green)' : '#ff3366' }}>{compData.lap_delta_ms < 0 ? '' : '+'}{(compData.lap_delta_ms / 1000).toFixed(3)}s</span>
                  </div>
                  {compData.sectors.map((s, i) => (
                    <div key={i} style={{ marginBottom: '16px', backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                        <span>Sector {s.sector}</span>
                        <span style={{ color: s.delta_ms < 0 ? 'var(--color-green)' : '#ff3366' }}>
                          {s.delta_ms < 0 ? '' : '+'}{(s.delta_ms / 1000).toFixed(3)}s
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '10px', width: '30px' }}>YOU</span>
                        <div style={{ flex: 1, height: '10px', backgroundColor: 'var(--color-canvas)', borderRadius: '4px' }}>
                          <div style={{ width: `${s.player_ms >= s.rival_ms ? 100 : (s.player_ms / s.rival_ms) * 100}%`, height: '100%', backgroundColor: 'var(--color-primary)', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '10px', width: '45px', textAlign: 'right' }}>{s.player_time}</span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', width: '30px' }}>RIVAL</span>
                        <div style={{ flex: 1, backgroundColor: 'var(--color-surface-onyx)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ width: `${s.rival_ms >= s.player_ms ? 100 : (s.rival_ms / s.player_ms) * 100}%`, height: '100%', backgroundColor: '#cccccc', borderRadius: '4px' }}></div>
                        </div>
                        <span style={{ fontSize: '10px', width: '45px', textAlign: 'right' }}>{s.rival_time}</span>
                      </div>
                      
                    </div>
                  ))}
                </div>
              );
            })() : (
              <div style={{ color: 'var(--color-muted)' }}>Select a lap from Lap History to see sector comparisons.</div>
            )}
          </div>
        </div>
      </div>

      {/* Corner Analysis Section */}
      <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="card-header">{t.cornerAnalysis}</div>
        {selectedLap && selectedLap.corners && selectedLap.corners.length > 0 ? (
           <div style={{ display: 'flex', overflowX: 'auto', gap: '16px', paddingBottom: '8px' }}>
             {selectedLap.corners.map((corner, idx) => (
                <div key={idx} style={{ minWidth: '150px', backgroundColor: 'var(--color-surface-onyx)', padding: '12px', borderRadius: '8px', borderLeft: `4px solid ${corner.direction === 'Right' ? 'var(--color-primary)' : 'var(--color-link)'}` }}>
                   <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--color-magenta)', marginBottom: '8px' }}>Turn {idx + 1} ({corner.direction})</div>
                   <div style={{ fontSize: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '4px' }}>
                     <span style={{ color: 'var(--color-muted)' }}>Entry:</span><span>{corner.entry_speed}</span>
                     <span style={{ color: 'var(--color-muted)' }}>Apex:</span><span style={{ color: '#fff', fontWeight: 'bold' }}>{corner.apex_speed}</span>
                     <span style={{ color: 'var(--color-muted)' }}>Exit:</span><span>{corner.exit_speed}</span>
                     <span style={{ color: 'var(--color-muted)' }}>Max G:</span><span style={{ color: 'var(--color-green)' }}>{corner.max_g_lat}G</span>
                   </div>
                </div>
             ))}
           </div>
        ) : (
           <div style={{ color: 'var(--color-muted)', padding: '20px', textAlign: 'center' }}>
             {selectedLap ? "No corner data detected for this lap." : "Select a lap from Lap History to see corner analysis."}
           </div>
        )}
      </div>

      {/* Circuit Map Section */}
      <div className="card" style={{ marginTop: 'var(--spacing-xl)' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
           <span>{t.circuitMap}</span>
           <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
              <span style={{ color: 'var(--color-primary)' }}>■ {circuit_environment.track_name}</span>
              <span style={{ color: '#fff' }}>● {t.sector1Start} / {t.sector2Start} / {t.sector3Start}</span>
              {selectedLap && <span style={{ color: '#aaa', marginLeft: '8px' }}>| 🔴 Braking Point</span>}
           </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: 'var(--color-canvas)', borderRadius: '8px', padding: '16px', minHeight: '500px' }}>
          {trackPoints.length > 5 ? (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 400 400" style={{ width: '600px', height: '600px', maxWidth: '100%', maxHeight: '600px' }}>
               {/* Track path */}
               <path 
                 d={trackPoints.filter(p => p.x !== undefined).map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.x)} ${mapZ(p.z)}`).join(' ')} 
                 fill="none" 
                 stroke="var(--color-primary)" 
                 strokeWidth="4"
                 strokeLinejoin="round"
               />
               
               {/* Sector 1 Marker (Start/Finish) */}
               {s1Point && s1Point.x !== undefined && (
                  <g>
                     <circle cx={mapX(s1Point.x)} cy={mapZ(s1Point.z)} r="6" fill="var(--color-canvas)" stroke="#fff" strokeWidth="2" />
                     <text x={mapX(s1Point.x) + 10} y={mapZ(s1Point.z) + 4} fill="#fff" fontSize="12" fontWeight="bold">S1</text>
                  </g>
               )}
               
               {/* Sector 2 Marker */}
               {s2Point && s2Point.x !== undefined && (
                  <g>
                     <circle cx={mapX(s2Point.x)} cy={mapZ(s2Point.z)} r="6" fill="var(--color-canvas)" stroke="#fff" strokeWidth="2" />
                     <text x={mapX(s2Point.x) + 10} y={mapZ(s2Point.z) + 4} fill="#fff" fontSize="12" fontWeight="bold">S2</text>
                  </g>
               )}
               
               {/* Sector 3 Marker */}
               {s3Point && s3Point.x !== undefined && (
                  <g>
                     <circle cx={mapX(s3Point.x)} cy={mapZ(s3Point.z)} r="6" fill="var(--color-canvas)" stroke="#fff" strokeWidth="2" />
                     <text x={mapX(s3Point.x) + 10} y={mapZ(s3Point.z) + 4} fill="#fff" fontSize="12" fontWeight="bold">S3</text>
                  </g>
               )}
               
               {/* Draw all active cars */}
               {players.map(p => {
                  if (!p.current_telemetry || p.current_telemetry.length === 0) return null;
                  const latestPt = p.current_telemetry[p.current_telemetry.length - 1];
                  if (latestPt.x === undefined || latestPt.z === undefined) return null;
                  const isPlayer = p.name.includes('(You)');
                  return (
                    <circle 
                      key={`car-${p.id}`} 
                      cx={mapX(latestPt.x)} 
                      cy={mapZ(latestPt.z)} 
                      r={isPlayer ? 5 : 3} 
                      fill={isPlayer ? "var(--color-magenta)" : "var(--color-ink)"} 
                      stroke={isPlayer ? "#fff" : "none"}
                      strokeWidth={isPlayer ? 2 : 0}
                    >
                      <title>{p.name}</title>
                    </circle>
                  );
               })}

              {/* Draw corner braking points */}
              {selectedLap && selectedLap.corners && selectedLap.corners.map((corner, idx) => {
                 const isSelected = selectedMapPoint === idx;
                 if (corner.entry_x === undefined || corner.entry_z === undefined) return null;
                 return (
                   <circle
                     key={`corner-${idx}`}
                     cx={mapX(corner.entry_x)}
                     cy={mapZ(corner.entry_z)}
                     r={isSelected ? 8 : 5}
                     fill="#ff3366"
                     stroke={isSelected ? '#fff' : 'none'}
                     strokeWidth={isSelected ? 2 : 0}
                     style={{ cursor: 'pointer' }}
                     onClick={() => setSelectedMapPoint(isSelected ? null : idx)}
                   >
                     <title>Turn {idx + 1} Braking Point</title>
                   </circle>
                 );
              })}
            </svg>

           {/* Selected point telemetry info */}
           {selectedMapPoint !== null && selectedLap && selectedLap.corners && selectedLap.corners[selectedMapPoint] && (() => {
             const corner = selectedLap.corners[selectedMapPoint];
             return (
               <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px', border: '1px solid var(--color-primary)' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ff3366' }}>Turn {selectedMapPoint + 1} Braking Point</span>
                   <span style={{ fontSize: '12px', color: '#aaa' }}>Distance: {corner.entry_dist}m</span>
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px' }}>
                   <div><span style={{ color: '#aaa' }}>Entry Speed</span><div style={{ fontWeight: 'bold', fontSize: '16px' }}>{corner.entry_speed}</div></div>
                   <div><span style={{ color: '#aaa' }}>Apex Speed</span><div style={{ fontWeight: 'bold', fontSize: '16px' }}>{corner.apex_speed}</div></div>
                   <div><span style={{ color: '#aaa' }}>Max Lat G</span><div style={{ fontWeight: 'bold', color: 'var(--color-green)' }}>{corner.max_g_lat}G</div></div>
                 </div>
               </div>
             );
           })()}
            </div>
          ) : (
            <div style={{ padding: '40px', color: 'var(--color-muted)', textAlign: 'center' }}>
               Waiting for car to move to draw circuit map...
            </div>
          )}
        </div>
      </div>

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
  const [useRawReplay, setUseRawReplay] = useState(false);
  const t = i18n[language];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', paddingBottom: '60px' }}>
      <h1 className="hero-heading" style={{ marginBottom: '40px', fontSize: '36px' }}>{t.title}</h1>
      
      <div className="card" style={{ width: '100%', maxWidth: '550px', marginBottom: '24px' }}>
        <h2 className="card-header" style={{ fontSize: '20px', marginBottom: '24px' }}>{t.sessionSetup}</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>{t.udpPort}</label>
          <input 
            type="number" 
            value={port} 
            onChange={(e) => setPort(Number(e.target.value))} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-surface-indigo)', backgroundColor: 'var(--color-surface-onyx)', color: '#fff', fontSize: '16px' }}
          />
          <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '8px' }}>
            {t.udpDesc}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{t.updateRate}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>{t.updateDesc}</div>
          </div>
          <select 
             value={updateRate}
             onChange={(e) => setUpdateRate(Number(e.target.value))}
             style={{ backgroundColor: 'var(--color-surface-indigo)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', outline: 'none' }}
          >
            <option value={30}>30 Hz</option>
            <option value={60}>60 Hz</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{t.units}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>{t.unitsDesc}</div>
          </div>
          <select 
             value={units}
             onChange={(e) => setUnits(e.target.value)}
             style={{ backgroundColor: 'var(--color-surface-indigo)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', outline: 'none' }}
          >
            <option value="metric">Metric (km/h, °C, kg)</option>
            <option value="imperial">Imperial (mph, °F, lbs)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{t.tts}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>{t.ttsDesc}</div>
            </div>
            <button 
               onClick={() => setTts(!tts)}
               style={{ backgroundColor: tts ? 'var(--color-green)' : 'var(--color-surface-indigo)', color: tts ? '#000' : '#fff', border: 'none', padding: '8px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >{tts ? 'ON' : 'OFF'}</button>
          </div>
          
          {tts && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-surface-indigo)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: 'var(--color-link)' }}>{t.persona}</label>
              <select 
                 value={voice}
                 onChange={(e) => setVoice(e.target.value)}
                 style={{ width: '100%', backgroundColor: 'var(--color-canvas)', color: '#fff', border: '1px solid var(--color-surface-indigo)', padding: '12px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', outline: 'none' }}
              >
                <option value="gp">GP (Gianpiero Lambiase) - Max Verstappen's Eng.</option>
                <option value="bono">Bono (Peter Bonnington) - Lewis Hamilton's Eng.</option>
                <option value="adami">Ricky (Riccardo Adami) - Carlos Sainz's Eng.</option>
              </select>
            </div>
          )}
        </div>

        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{t.language}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>{t.languageDesc}</div>
          </div>
          <select 
             value={language}
             onChange={(e) => setLanguage(e.target.value)}
             style={{ backgroundColor: 'var(--color-surface-indigo)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', outline: 'none' }}
          >
            <option value="ko">한국어 (KOR)</option>
            <option value="en">English (ENG)</option>
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{t.overlay}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>{t.overlayDesc}</div>
          </div>
          <button 
             onClick={() => setOverlay(!overlay)}
             style={{ backgroundColor: overlay ? 'var(--color-green)' : 'var(--color-surface-indigo)', color: overlay ? '#000' : '#fff', border: 'none', padding: '8px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >{overlay ? 'ON' : 'OFF'}</button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'var(--color-magenta)' }}>{t.useRawReplay}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>{t.useRawReplayDesc}</div>
          </div>
          <button 
             onClick={() => setUseRawReplay(!useRawReplay)}
             style={{ backgroundColor: useRawReplay ? 'var(--color-magenta)' : 'var(--color-surface-indigo)', color: useRawReplay ? '#000' : '#fff', border: 'none', padding: '8px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >{useRawReplay ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <button 
        onClick={() => onStart({ port, tts, overlay, units, updateRate, voice, language, useRawReplay })}
        className="badge"
        style={{ width: '100%', maxWidth: '550px', padding: '20px', backgroundColor: 'var(--color-primary)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}
      >{t.connect}</button>
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
        <div style={{ padding: '20px', color: 'red', backgroundColor: 'black', minHeight: '100vh' }}>
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
  const [settings, setSettings] = useState({ port: 20777, tts: true, overlay: false, units: 'metric', updateRate: 60, voice: 'gp', language: 'ko' });

  if (!sessionActive) {
    return <SetupPage onStart={(s) => { setSettings(s); setSessionActive(true); }} />;
  }

  return <ErrorBoundary><Dashboard settings={settings} setSettings={setSettings} onExit={() => setSessionActive(false)} /></ErrorBoundary>;
}
