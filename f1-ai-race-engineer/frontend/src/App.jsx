import React, { useState, useEffect } from 'react';
import './styles/design-system.css';

function Dashboard({ settings, setSettings, onExit }) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('p_1');
  const [selectedLap, setSelectedLap] = useState(null);
  const [comparisonMode, setComparisonMode] = useState('ahead');

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8080/ws?port=${settings.port}&units=${settings.units}&rate=${settings.updateRate}&tts=${settings.tts}&overlay=${settings.overlay}&voice=${settings.voice}`);

    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      const parsedData = JSON.parse(event.data);
      setData(parsedData);
    };
    ws.onclose = () => setConnected(false);

    return () => ws.close();
  }, []);

  if (!data) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2 className="hero-heading">Connecting to Telemetry...</h2>
      </div>
    );
  }

  const { circuit_environment, players } = data;
  const selectedPlayer = players.find(p => p.id === selectedPlayerId) || players[0];
  const { live_telemetry, car_setup, lap_history, current_lap, name, tyre_compound, strategy } = selectedPlayer;

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
          <div className="grid-3" style={{ marginBottom: 0 }}>
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
          
          <div style={{ marginTop: 'var(--spacing-xl)' }} className="grid-2">
             <div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>THROTTLE: {live_telemetry.throttle}%</div>
                <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${live_telemetry.throttle}%` }}></div></div>
             </div>
             <div>
                <div style={{ fontSize: '14px', opacity: 0.8 }}>BRAKE: {live_telemetry.brake}%</div>
                <div className="progress-bar-bg"><div className="progress-bar-fill red" style={{ width: `${live_telemetry.brake}%` }}></div></div>
             </div>
          </div>
        </div>

        {/* Leaderboard (Player Selection) */}
        <div className="card">
          <div className="card-header">LEADERBOARD (SELECT)</div>
          {players.map((driver) => (
             <div 
               key={driver.id} 
               className={`leaderboard-row clickable-row ${selectedPlayerId === driver.id ? 'active' : ''}`}
               onClick={() => { setSelectedPlayerId(driver.id); setSelectedLap(null); }}
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
               onClick={() => setSelectedLap(lap)}
               style={{ backgroundColor: selectedLap?.lap === lap.lap ? 'var(--color-surface-indigo)' : 'var(--color-surface-onyx)', border: selectedLap?.lap === lap.lap ? '1px solid var(--color-primary)' : '1px solid transparent' }}
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
                    >vs Ahead (앞차)</button>
                    <button 
                       onClick={() => setComparisonMode('leader')}
                       style={{ backgroundColor: comparisonMode === 'leader' ? 'var(--color-primary)' : 'var(--color-surface-onyx)', color: comparisonMode === 'leader' ? '#000' : '#fff', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                    >vs Leader (선두)</button>
                 </div>
               </div>
               
               <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                 <div className="badge" style={{ backgroundColor: 'var(--color-surface-indigo)' }}>
                   Tyre wear consumed: <span style={{color: '#ff3366'}}>{selectedLap.avg_tyre_wear_lap || selectedLap.tyre_wear_consumed}%</span>
                 </div>
               </div>

               {selectedLap.telemetry_points.map((tp, idx) => {
                  const compBrake = comparisonMode === 'ahead' ? tp.rival_brake : (tp.leader_brake || tp.rival_brake);
                  const compThrottle = comparisonMode === 'ahead' ? tp.rival_throttle : (tp.leader_throttle || tp.rival_throttle);
                  const compTimeDiff = comparisonMode === 'ahead' ? tp.time_diff_to_rival : (tp.time_diff_leader || tp.time_diff_to_rival);
                  const compWearDiff = comparisonMode === 'ahead' ? tp.wear_diff : (tp.wear_diff_leader || tp.wear_diff);
                  const compLabelKor = comparisonMode === 'ahead' ? '앞차' : '선두';
                  const compLabelEng = comparisonMode === 'ahead' ? 'Ahead' : 'Leader';

                  return (
                    <div key={idx} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                         <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{tp.distance}</span>
                         {compTimeDiff && (
                             <span style={{ fontSize: '12px', fontWeight: 'bold', color: compTimeDiff.includes('Faster') ? 'var(--color-green)' : (compTimeDiff.includes('Equal') ? 'var(--color-ink)' : '#ff3366') }}>
                               {compTimeDiff.replace('Faster', `Faster vs ${compLabelEng}`).replace('Slower', `Slower vs ${compLabelEng}`).replace('Equal', `Equal to ${compLabelEng}`)}
                             </span>
                         )}
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
                            *White line: {compLabelEng}'s input ({compLabelKor} 조작량)
                          </div>
                      )}
                    </div>
                  );
               })}
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px', paddingBottom: '60px' }}>
      <h1 className="hero-heading" style={{ marginBottom: '40px', fontSize: '36px' }}>F1 AI RACE ENGINEER</h1>
      
      <div className="card" style={{ width: '100%', maxWidth: '550px', marginBottom: '24px' }}>
        <h2 className="card-header" style={{ fontSize: '20px', marginBottom: '24px' }}>Session Setup</h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>UDP Port (Local)</label>
          <input 
            type="number" 
            value={port} 
            onChange={(e) => setPort(Number(e.target.value))} 
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-surface-indigo)', backgroundColor: 'var(--color-surface-onyx)', color: '#fff', fontSize: '16px' }}
          />
          <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '8px' }}>
            * F1 26 게임 내 Telemetry 설정의 UDP Port 번호와 일치시켜 주세요. (기본값: 20777)
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Telemetry Update Rate</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>백엔드 파싱 및 프론트엔드 전송 주기를 결정합니다.</div>
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
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Measurement Units</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>표시할 측정 단위를 선택합니다. (Metric / Imperial)</div>
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
              <div style={{ fontWeight: 'bold', fontSize: '16px' }}>AI Engineer TTS (Voice)</div>
              <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>엔지니어의 실시간 음성 브리핑을 활성화합니다.</div>
            </div>
            <button 
               onClick={() => setTts(!tts)}
               style={{ backgroundColor: tts ? 'var(--color-green)' : 'var(--color-surface-indigo)', color: tts ? '#000' : '#fff', border: 'none', padding: '8px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >{tts ? 'ON' : 'OFF'}</button>
          </div>
          
          {tts && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--color-surface-indigo)' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '12px', color: 'var(--color-link)' }}>엔지니어 페르소나 선택 (Engineer Persona)</label>
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', backgroundColor: 'var(--color-surface-onyx)', borderRadius: '8px' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>Overlay Mode (HUD)</div>
            <div style={{ fontSize: '12px', color: 'var(--color-link)', marginTop: '4px' }}>게임 화면 위에 투명하게 표시되는 오버레이를 사용합니다.</div>
          </div>
          <button 
             onClick={() => setOverlay(!overlay)}
             style={{ backgroundColor: overlay ? 'var(--color-green)' : 'var(--color-surface-indigo)', color: overlay ? '#000' : '#fff', border: 'none', padding: '8px 24px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >{overlay ? 'ON' : 'OFF'}</button>
        </div>
      </div>

      <button 
        onClick={() => onStart({ port, tts, overlay, units, updateRate, voice })}
        className="badge"
        style={{ width: '100%', maxWidth: '550px', padding: '20px', backgroundColor: 'var(--color-primary)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', textAlign: 'center' }}
      >CONNECT & START SESSION</button>
    </div>
  );
}

export default function App() {
  const [sessionActive, setSessionActive] = useState(false);
  const [settings, setSettings] = useState({ port: 20777, tts: true, overlay: false, units: 'metric', updateRate: 60, voice: 'gp' });

  if (!sessionActive) {
    return <SetupPage onStart={(s) => { setSettings(s); setSessionActive(true); }} />;
  }

  return <Dashboard settings={settings} setSettings={setSettings} onExit={() => setSessionActive(false)} />;
}
