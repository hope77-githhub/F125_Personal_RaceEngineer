import React, { useEffect, useState } from 'react';

// QA tab (main screen): what the TV overlay can show and which game data it is getting.
//  - source "live": the real overlay fed by F1 25 (port 8090)
//  - source "demo": a simulated race / qualifying on its own overlay server (port 8095), no game needed
// Backend: GET /api/qa/overlay, POST /api/qa/overlay/demo, POST /api/qa/overlay/ui (backend/main.py).

// the backend that served this page (normally :8080); the Vite dev server (:5173) talks to :8080
const API =
  typeof window !== 'undefined' && window.location.protocol.startsWith('http') && window.location.port !== '5173'
    ? window.location.origin
    : 'http://localhost:8080';

const PACKETS = {
  0: 'Motion',
  1: 'Session',
  2: 'Lap Data',
  3: 'Event',
  4: 'Participants',
  5: 'Car Setups',
  6: 'Car Telemetry',
  7: 'Car Status',
  8: 'Final Classification',
  9: 'Lobby Info',
  10: 'Car Damage',
  11: 'Session History',
  12: 'Tyre Sets',
  13: 'Motion Ex',
  14: 'Time Trial',
  15: 'Lap Positions',
  16: 'Car Telemetry 2 (2026)',
};

// every overlay element, what it shows and the packets it needs (opt = only some seasons / situations)
const ELEMENTS = [
  { key: 'tower', needs: [2, 4, 7, 1], opt: [11],
    ko: ['순위표 (타워)', '순위, 드라이버, 간격 또는 기록, 타이어와 사용 랩, 피트 상태, 레드 플래그·SC 배너'],
    en: ['Standings tower', 'Position, driver, gap or lap time, tyre and its age, pit status, red flag / SC banner'] },
  { key: 'cards', needs: [2, 4, 1], opt: [11],
    ko: ['퀄리 랩 카드 (최대 3장)', '퀄리에서 달리는 차의 섹터 진행, 섹터 색(보라/초록/노랑), 랩 기록'],
    en: ['Qualifying lap cards (up to 3)', 'Qualifying: sector progress, sector colours (purple / green / yellow), lap time'] },
  { key: 'lap', needs: [2], opt: [11],
    ko: ['내 랩 카드', '프랙티스·레이스에서 내 차의 현재 랩 타임과 섹터 (우측 상단)'],
    en: ['My lap card', 'Practice / race: my current lap time and sectors (top right)'] },
  { key: 'halo', needs: [6, 7, 2], opt: [16],
    ko: ['헤일로 HUD', '속도(km/h·mph), 기어, RPM, 스로틀·브레이크, DRS 또는 액티브 에어로, ERS·부스트, 코너 번호와 좌우 방향(화살표)'],
    en: ['Halo HUD', 'Speed (km/h, mph), gear, RPM, throttle / brake, DRS or active aero, ERS / boost, turn number and left / right arrow'] },
  { key: 'flags', needs: [1, 3, 2], opt: [],
    ko: ['SC / VSC 델타', '세이프티카·VSC·레드 플래그, 노란 깃발 구역 수, SC 델타(양수/음수)'],
    en: ['SC / VSC delta', 'Safety car, VSC, red flag, yellow-flag sectors, safety-car delta'] },
  { key: 'fastest', needs: [3, 4], opt: [],
    ko: ['패스티스트 랩 배너', '패스티스트 랩을 세운 드라이버와 기록 (8초간)'],
    en: ['Fastest lap banner', 'Who set the fastest lap and the time (8 s)'] },
  { key: 'onboard', needs: [4, 1], opt: [],
    ko: ['온보드 카드', '보고 있는 차의 드라이버 이름, 팀, 차 번호'],
    en: ['Onboard card', 'Viewed car: driver name, team, car number'] },
];

const T = {
  ko: {
    title: 'QA 테스트',
    intro: 'TV 오버레이가 게임에서 어떤 정보를 받아 어떻게 보여 주는지 확인하는 화면이에요. 게임 없이도 데모(시뮬레이션 데이터)로 모든 요소를 볼 수 있어요.',
    source: '확인할 오버레이',
    live: '실제 게임 오버레이',
    demo: '데모 (시뮬레이션)',
    raceDemo: '레이스 데모 시작',
    qualiDemo: '퀄리 데모 시작',
    stopDemo: '데모 중지',
    liveOff: (on) => (on ? '실제 오버레이가 아직 실행되지 않았어요. 게임 데이터가 들어오면 자동으로 시작돼요.' : '실제 오버레이 스위치가 꺼져 있어요 (대시보드의 TV 오버레이 버튼).'),
    demoOff: '데모가 꺼져 있어요. 레이스 또는 퀄리 데모를 시작하세요.',
    gameAge: (s) => (s == null ? '게임 데이터: 아직 없음' : s < 5 ? '게임 데이터: 수신 중' : `게임 데이터: ${s}초 전 마지막 수신`),
    demoNote: '데모는 8초마다 노란 깃발 → VSC → SC → 레드 플래그 상황을 돌아가며 보여 주고, 패스티스트 랩 배너도 주기적으로 나와요.',
    preview: '미리 보기',
    hud: '표시 요소 켜기/끄기',
    layout: '레이아웃',
    toast: '토스트 테스트',
    elements: '오버레이 요소와 필요한 게임 데이터',
    colEl: '요소',
    colShows: '보여 주는 정보',
    colNeeds: '필요한 데이터 (패킷)',
    colStatus: '상태',
    st: { ok: '수신 중', part: '일부만', none: '없음', demo: '데모 데이터', off: '-' },
    optional: '(있으면 사용)',
    data: '오버레이가 받은 값',
    session: '세션',
    sessionType: '세션 종류',
    laps: '총 랩',
    timeLeft: '남은 시간',
    sc: '세이프티카',
    red: '레드 플래그',
    yellow: '노란 깃발 구역',
    paused: '일시정지',
    car: '보는 차 (헤일로)',
    speed: '속도',
    gear: '기어',
    rpm: 'RPM',
    thr: '스로틀 / 브레이크',
    drs: 'DRS',
    ers: 'ERS',
    turn: '코너',
    standings: '순위 (상위 8)',
    packets: '받은 패킷',
    colId: 'ID',
    colName: '종류',
    colCount: '수신 수',
    colLayout: '형식 확인',
    noPackets: '받은 패킷이 없어요.',
    yes: '예',
    no: '아니오',
    scNames: ['없음', 'SC', 'VSC', '포메이션 랩'],
    backendDown: '백엔드(8080)에 연결되지 않았어요.',
  },
  en: {
    title: 'QA test',
    intro: 'Check what the TV overlay receives from the game and how it shows it. Without the game, a demo (simulated data) shows every element.',
    source: 'Overlay to check',
    live: 'Real game overlay',
    demo: 'Demo (simulated)',
    raceDemo: 'Start race demo',
    qualiDemo: 'Start qualifying demo',
    stopDemo: 'Stop demo',
    liveOff: (on) => (on ? 'The real overlay is not running yet. It starts when game data arrives.' : 'The real overlay switch is OFF (TV overlay button on the dashboard).'),
    demoOff: 'The demo is off. Start a race or qualifying demo.',
    gameAge: (s) => (s == null ? 'Game data: none yet' : s < 5 ? 'Game data: arriving' : `Game data: last seen ${s}s ago`),
    demoNote: 'Every 8 s the demo cycles through yellow flags, VSC, SC and a red flag, and shows the fastest-lap banner from time to time.',
    preview: 'Preview',
    hud: 'Elements on / off',
    layout: 'Layout',
    toast: 'Test toast',
    elements: 'Overlay elements and the game data they need',
    colEl: 'Element',
    colShows: 'Shows',
    colNeeds: 'Needs (packets)',
    colStatus: 'Status',
    st: { ok: 'Receiving', part: 'Partly', none: 'None', demo: 'Demo data', off: '-' },
    optional: '(used if present)',
    data: 'Values the overlay received',
    session: 'Session',
    sessionType: 'Session type',
    laps: 'Total laps',
    timeLeft: 'Time left',
    sc: 'Safety car',
    red: 'Red flag',
    yellow: 'Yellow sectors',
    paused: 'Paused',
    car: 'Viewed car (halo)',
    speed: 'Speed',
    gear: 'Gear',
    rpm: 'RPM',
    thr: 'Throttle / brake',
    drs: 'DRS',
    ers: 'ERS',
    turn: 'Turn',
    standings: 'Standings (top 8)',
    packets: 'Packets received',
    colId: 'ID',
    colName: 'Type',
    colCount: 'Count',
    colLayout: 'Layout OK',
    noPackets: 'No packets received.',
    yes: 'Yes',
    no: 'No',
    scNames: ['None', 'SC', 'VSC', 'Formation lap'],
    backendDown: 'No connection to the backend (8080).',
  },
};

const sessionName = (t, lang) => {
  const ko = lang === 'ko';
  if (t >= 1 && t <= 4) return ko ? `프랙티스 (${t})` : `Practice (${t})`;
  if (t >= 5 && t <= 14) return ko ? `퀄리파잉 (${t})` : `Qualifying (${t})`;
  if (t >= 15 && t <= 17) return ko ? `레이스 (${t})` : `Race (${t})`;
  if (t === 18) return ko ? '타임 트라이얼' : 'Time trial';
  return t ? String(t) : '-';
};
const fmtLap = (ms) => (ms > 0 ? `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}` : '-');
const TYRES = { 16: 'S', 17: 'M', 18: 'H', 7: 'I', 8: 'W' };

const box = {
  padding: '14px 16px',
  borderRadius: 'var(--rounded-lg)',
  background: 'var(--color-surface-soft)',
  border: '1px solid var(--color-hairline)',
};
const small = { fontSize: '12px', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '6px' };
const cell = { padding: '7px 8px', borderTop: '1px solid var(--color-hairline)', verticalAlign: 'top', fontSize: '13px' };
const head = { ...cell, borderTop: 'none', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--color-muted)' };
const STATUS_COLOR = { ok: 'var(--color-semantic-up)', part: '#b7791f', none: 'var(--color-semantic-down)', demo: 'var(--color-primary)', off: 'var(--color-muted)' };

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '13px', padding: '2px 0' }}>
      <span style={{ color: 'var(--color-body)' }}>{label}</span>
      <span className="mono-num" style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function QaPage({ language = 'ko' }) {
  const t = T[language] || T.en;
  const [source, setSource] = useState('demo');
  const [snap, setSnap] = useState(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [frameKey, setFrameKey] = useState(0);

  useEffect(() => {
    let stop = false;
    let timer = null;
    const poll = async () => {
      try {
        const res = await fetch(`${API}/api/qa/overlay?source=${source}`);
        const data = await res.json();
        if (!stop) {
          setSnap(data);
          setOffline(false);
        }
      } catch (e) {
        if (!stop) setOffline(true);
      }
      if (!stop) timer = setTimeout(poll, 1000);
    };
    poll();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [source]);

  const post = async (path, body) => {
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  };

  const startDemo = async (mode) => {
    setBusy(true);
    setError('');
    try {
      const d = await post('/api/qa/overlay/demo', { mode });
      if (d.error) setError(d.error);
      setSource('demo');
      setFrameKey((k) => k + 1);
    } catch (e) {
      setOffline(true);
    } finally {
      setBusy(false);
    }
  };

  const ui = (body) => post('/api/qa/overlay/ui', { source, ...body }).catch(() => setOffline(true));

  const running = snap && snap.running;
  const st = (snap && snap.state) || {};
  const uiState = st.ui || {};
  const packets = (snap && snap.packets) || {};
  const isDemo = source === 'demo';
  const statusOf = (el) => {
    if (!running) return 'off';
    if (isDemo) return 'demo';
    const have = el.needs.filter((id) => (packets[id] || {}).count > 0).length;
    return have === el.needs.length ? 'ok' : have ? 'part' : 'none';
  };
  const car = st.car || {};
  const viewed = (st.cars || []).find((c) => c.idx === st.viewCar);
  const ersPct = st.ers ? Math.round(Math.max(0, Math.min(1, st.ers.store / 4000000)) * 100) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 20px 80px' }}>
      <div style={{ width: '100%', maxWidth: '1100px' }}>
        <h1 className="hero-heading" style={{ fontSize: '36px', marginBottom: '8px' }}>{t.title}</h1>
        <p style={{ color: 'var(--color-body)', fontSize: '15px', margin: '0 0 24px' }}>{t.intro}</p>
        {offline && (
          <div style={{ ...box, borderColor: 'var(--color-semantic-down)', color: 'var(--color-semantic-down)', marginBottom: '16px' }}>{t.backendDown}</div>
        )}

        {/* source + demo controls */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>{t.source}</span>
              <button type="button" className={`btn-secondary-light ${!isDemo ? 'active' : ''}`} onClick={() => { setSource('live'); setFrameKey((k) => k + 1); }}>{t.live}</button>
              <button type="button" className={`btn-secondary-light ${isDemo ? 'active' : ''}`} onClick={() => { setSource('demo'); setFrameKey((k) => k + 1); }}>{t.demo}</button>
            </div>
            {isDemo && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" className={`btn-secondary-light ${snap && snap.demo && snap.demo.mode === 'race' ? 'active' : ''}`} disabled={busy} onClick={() => startDemo('race')}>{t.raceDemo}</button>
                <button type="button" className={`btn-secondary-light ${snap && snap.demo && snap.demo.mode === 'quali' ? 'active' : ''}`} disabled={busy} onClick={() => startDemo('quali')}>{t.qualiDemo}</button>
                <button type="button" className="btn-secondary-light" disabled={busy || !(snap && snap.demo && snap.demo.running)} onClick={() => startDemo('off')}>{t.stopDemo}</button>
              </div>
            )}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-body)', marginTop: '10px' }}>
            {isDemo ? (running ? t.demoNote : t.demoOff) : running ? t.gameAge(snap.live_game_age_s) : t.liveOff(snap && snap.enabled)}
          </div>
          {error && <div style={{ fontSize: '12px', color: 'var(--color-semantic-down)', marginTop: '6px' }}>{error}</div>}
        </div>

        {/* preview + HUD switches */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 className="card-header" style={{ fontSize: '18px', marginBottom: '12px' }}>{t.preview}</h2>
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#1d2026', borderRadius: 'var(--rounded-md)', overflow: 'hidden' }}>
            {running ? (
              <iframe key={`${source}-${frameKey}`} title="overlay" src={snap.url} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9aa1ad', fontSize: '14px', padding: '20px', textAlign: 'center' }}>
                {isDemo ? t.demoOff : t.liveOff(snap && snap.enabled)}
              </div>
            )}
          </div>
          {running && (
            <div style={{ marginTop: '14px' }}>
              <div style={small}>{t.hud}</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['all', ...ELEMENTS.map((e) => e.key)].map((k) => {
                  const el = ELEMENTS.find((e) => e.key === k);
                  const on = !!uiState[k];
                  return (
                    <button key={k} type="button" className={`btn-secondary-light ${on ? 'active' : ''}`} style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }}
                      onClick={() => ui({ key: k, value: !on })}>
                      {k === 'all' ? 'ALL' : (el[language] || el.en)[0]}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '10px', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span style={{ ...small, marginBottom: 0 }}>{t.layout}</span>
                  {['auto', 'quali', 'race'].map((m) => (
                    <button key={m} type="button" className={`btn-secondary-light ${uiState.mode === m ? 'active' : ''}`} style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }} onClick={() => ui({ mode: m })}>
                      {m.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn-secondary-light" style={{ fontSize: '12px', padding: '4px 10px', height: 'auto' }} onClick={() => ui({ toast: 'QA TEST MESSAGE' })}>{t.toast}</button>
              </div>
            </div>
          )}
        </div>

        {/* elements */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 className="card-header" style={{ fontSize: '18px', marginBottom: '12px' }}>{t.elements}</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-ink)' }}>
              <thead>
                <tr><th style={head}>{t.colEl}</th><th style={head}>{t.colShows}</th><th style={head}>{t.colNeeds}</th><th style={head}>{t.colStatus}</th></tr>
              </thead>
              <tbody>
                {ELEMENTS.map((el) => {
                  const [name, shows] = el[language] || el.en;
                  const s = statusOf(el);
                  return (
                    <tr key={el.key}>
                      <td style={{ ...cell, fontWeight: 600, whiteSpace: 'nowrap' }}>{name}</td>
                      <td style={cell}>{shows}</td>
                      <td style={{ ...cell, fontSize: '12px' }}>
                        {el.needs.map((id) => `${PACKETS[id]} (${id})`).join(', ')}
                        {el.opt.length > 0 && (
                          <div style={{ color: 'var(--color-muted)' }}>{el.opt.map((id) => `${PACKETS[id]} (${id})`).join(', ')} {t.optional}</div>
                        )}
                      </td>
                      <td style={{ ...cell, fontWeight: 700, color: STATUS_COLOR[s], whiteSpace: 'nowrap' }}>{t.st[s]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* received values */}
        {running && (
          <div className="card">
            <h2 className="card-header" style={{ fontSize: '18px', marginBottom: '12px' }}>{t.data}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              <div style={box}>
                <div style={small}>{t.session}</div>
                <Row label={t.sessionType} value={sessionName(st.sessionType, language)} />
                <Row label={t.laps} value={st.totalLaps || '-'} />
                <Row label={t.timeLeft} value={st.sessionTimeLeft ? `${Math.floor(st.sessionTimeLeft / 60)}:${String(st.sessionTimeLeft % 60).padStart(2, '0')}` : '-'} />
                <Row label={t.sc} value={t.scNames[st.safetyCar] || st.safetyCar || '-'} />
                <Row label="SC delta" value={st.safetyDelta && st.safetyDelta.seconds != null ? `${st.safetyDelta.seconds.toFixed(2)}s` : '-'} />
                <Row label={t.red} value={st.redFlag ? t.yes : t.no} />
                <Row label={t.yellow} value={st.yellowZones ?? '-'} />
                <Row label={t.paused} value={st.gamePaused ? t.yes : t.no} />
              </div>
              <div style={box}>
                <div style={small}>{t.car}{viewed ? ` · ${viewed.name || viewed.code}` : ''}</div>
                <Row label={t.speed} value={car.speed != null ? `${car.speed} km/h` : '-'} />
                <Row label={t.gear} value={car.gear === 0 ? 'N' : car.gear === -1 ? 'R' : car.gear ?? '-'} />
                <Row label={t.rpm} value={car.rpm ?? '-'} />
                <Row label={t.thr} value={car.throttle != null ? `${Math.round(car.throttle * 100)}% / ${Math.round((car.brake || 0) * 100)}%` : '-'} />
                <Row label={t.drs} value={car.drs ? t.yes : t.no} />
                <Row label={t.ers} value={ersPct != null ? `${ersPct}%` : '-'} />
                <Row label={t.turn} value={st.turn && st.turn.n ? `T${st.turn.n}${st.turn.total ? ` / ${st.turn.total}` : ''}` : (st.turn && st.turn.status) || '-'} />
              </div>
              <div style={box}>
                <div style={small}>{t.standings}</div>
                {(st.cars || []).slice(0, 8).map((c) => (
                  <div key={c.idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '1px 0', fontWeight: c.idx === st.player ? 700 : 400 }}>
                    <span>P{c.pos} {c.name || c.code}</span>
                    <span className="mono-num">{TYRES[c.tyre] || '-'} · {c.bestLap ? fmtLap(c.bestLap) : c.lastLap ? fmtLap(c.lastLap) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
            {!isDemo && (
              <div style={{ marginTop: '16px' }}>
                <div style={small}>{t.packets}</div>
                {Object.keys(packets).length ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-ink)' }}>
                    <thead>
                      <tr><th style={head}>{t.colId}</th><th style={head}>{t.colName}</th><th style={head}>{t.colCount}</th><th style={head}>{t.colLayout}</th></tr>
                    </thead>
                    <tbody>
                      {Object.entries(packets).sort((a, b) => Number(a[0]) - Number(b[0])).map(([id, p]) => (
                        <tr key={id}>
                          <td style={cell}>{id}</td>
                          <td style={cell}>{PACKETS[id] || '-'}</td>
                          <td style={cell} className="mono-num">{p.count}</td>
                          <td style={cell}>{p.parsed === undefined || p.parsed === null ? '-' : p.parsed === false ? t.no : t.yes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{t.noPackets}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
