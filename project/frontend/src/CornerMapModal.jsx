import React, { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:8080';

const txt = {
  en: {
    title: 'Corner Map',
    mapped: 'Mapped corners',
    calib: 'Calibration tool',
    track: 'Track',
    corners: 'corners',
    lap: 'Lap length',
    method: 'Mapping method',
    source: 'Reference',
    files: 'Files',
    turn: 'Turn',
    name: 'Name',
    dir: 'Dir',
    type: 'Type',
    entry: 'Entry (m)',
    apex: 'Apex (m)',
    exit: 'Exit (m)',
    radius: 'Apex R',
    rotate: 'Rotate map',
    loadFile: 'Load raw telemetry file',
    loadServer: 'Load reference line',
    threshold: 'Sensitivity (threshold)',
    minLen: 'Min corner length',
    detected: 'Detected corners',
    export: 'Export JSON',
    matches: 'Mapped as',
    noData: 'Load a racing line file (.txt / .csv) or the track reference line to start.',
    offline: 'Backend not reachable on :8080. The calibration tool still works with a local file.',
    calibHint: 'Upload telemetry, tune the parameters and export the corner config for backend/circuit_data.',
    legendEntry: 'Entry',
    legendApex: 'Apex',
    legendExit: 'Exit',
    close: 'Close',
  },
  ko: {
    title: '코너 맵',
    mapped: '매핑된 코너',
    calib: '캘리브레이션 도구',
    track: '서킷',
    corners: '개 코너',
    lap: '랩 길이',
    method: '매핑 방법',
    source: '기준',
    files: '파일',
    turn: '턴',
    name: '이름',
    dir: '방향',
    type: '유형',
    entry: '진입 (m)',
    apex: '에이펙스 (m)',
    exit: '탈출 (m)',
    radius: '에이펙스 R',
    rotate: '맵 회전',
    loadFile: '원본 텔레메트리 파일 열기',
    loadServer: '기준 레이싱 라인 불러오기',
    threshold: '감도 (Threshold)',
    minLen: '최소 코너 길이',
    detected: '감지된 코너',
    export: 'JSON 내보내기',
    matches: '매핑 코너',
    noData: '레이싱 라인 파일(.txt / .csv)을 열거나 서킷 기준 라인을 불러오세요.',
    offline: '백엔드(:8080)에 연결할 수 없습니다. 로컬 파일로는 캘리브레이션 도구를 사용할 수 있습니다.',
    calibHint: '텔레메트리를 올리고 파라미터를 조정한 뒤 backend/circuit_data용 코너 설정을 내보냅니다.',
    legendEntry: '진입',
    legendApex: '에이펙스',
    legendExit: '탈출',
    close: '닫기',
  },
};

const DIR_COLOR = { Right: '#0052ff', Left: '#cf4500' };

// ---- math (same as the original Track Calibration Tool) ----
const gradient = (arr) => {
  const n = arr.length;
  const g = new Float32Array(n);
  if (n < 2) return g;
  g[0] = arr[1] - arr[0];
  g[n - 1] = arr[n - 1] - arr[n - 2];
  for (let i = 1; i < n - 1; i++) g[i] = (arr[i + 1] - arr[i - 1]) / 2.0;
  return g;
};

const smooth = (arr, w) => {
  const res = new Float32Array(arr.length);
  const half = Math.floor(w / 2);
  for (let i = 0; i < arr.length; i++) {
    let sum = 0;
    let c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(arr.length - 1, i + half); j++) {
      sum += arr[j];
      c++;
    }
    res[i] = sum / c;
  }
  return res;
};

// points: [{dist, x, y}] -> same array with .curvature
function withCurvature(points) {
  const n = points.length;
  const d = new Float32Array(n);
  const xs = new Float32Array(n);
  const ys = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    d[i] = points[i].dist;
    xs[i] = points[i].x;
    ys[i] = points[i].y;
  }
  const sx = smooth(xs, 11);
  const sy = smooth(ys, 11);
  const ds = gradient(d);
  for (let i = 0; i < n; i++) if (ds[i] === 0) ds[i] = 0.001;
  const dx = gradient(sx).map((v, i) => v / ds[i]);
  const dy = gradient(sy).map((v, i) => v / ds[i]);
  const ddx = gradient(dx).map((v, i) => v / ds[i]);
  const ddy = gradient(dy).map((v, i) => v / ds[i]);
  const curv = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const num = Math.abs(dx[i] * ddy[i] - dy[i] * ddx[i]);
    const den = Math.max(Math.pow(dx[i] * dx[i] + dy[i] * dy[i], 1.5), 0.0001);
    curv[i] = num / den;
  }
  const sc = smooth(curv, 15);
  return points.map((p, i) => ({ ...p, index: i, curvature: sc[i] }));
}

function detectCorners(track, threshold, minLength) {
  const out = [];
  let group = [];
  const flush = () => {
    if (group.length > 0 && group[group.length - 1].dist - group[0].dist >= minLength) {
      let apex = group[0];
      group.forEach((p) => {
        if (p.curvature > apex.curvature) apex = p;
      });
      out.push({ turn: out.length + 1, entry: group[0], apex, exit: group[group.length - 1] });
    }
    group = [];
  };
  track.forEach((p) => {
    if (p.curvature > threshold) group.push(p);
    else flush();
  });
  flush();
  return out;
}

function parseTelemetryText(text) {
  const lines = text.split(/\r?\n/);
  const headerLine = lines.find((l) => l.toLowerCase().includes('dist'));
  if (!headerLine) return null;
  const headers = headerLine.split(',').map((h) => h.replace(/"/g, '').trim().toLowerCase());
  const distIdx = headers.indexOf('dist');
  const zIdx = headers.findIndex((h) => h.includes('pos_z') || h === 'z');
  const xIdx = headers.findIndex((h) => h.includes('pos_x') || h === 'x');
  if (distIdx < 0 || zIdx < 0 || xIdx < 0) return null;
  const pts = [];
  let last = -Infinity;
  for (let i = lines.indexOf(headerLine) + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(',');
    const dist = parseFloat(parts[distIdx]);
    const pz = parseFloat(parts[zIdx]);
    const px = parseFloat(parts[xIdx]);
    if (!isNaN(dist) && !isNaN(pz) && !isNaN(px) && dist > last + 0.001) {
      // x = pos_z, y = pos_x (SVG y points down): the lap reads clockwise at Monaco and
      // right-handers turn clockwise on screen, matching the real circuit.
      pts.push({ dist, x: pz, y: px });
      last = dist;
    }
  }
  return pts;
}

// backend points are [dist, pos_z, pos_x]
const fromServerPoints = (raw) => {
  const pts = [];
  let last = -Infinity;
  raw.forEach(([dist, pz, px]) => {
    if (dist > last + 0.001) {
      pts.push({ dist, x: pz, y: px });
      last = dist;
    }
  });
  return pts;
};

// nearest index by distance (points sorted by dist)
const idxAtDist = (pts, dist) => {
  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].dist < dist) lo = mid + 1;
    else hi = mid;
  }
  return lo;
};

// ---- shared SVG track view ----
function TrackSvg({ points, segments, rotation, hovered, onHover }) {
  const view = useMemo(() => {
    if (!points.length) return null;
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rot = points.map((p) => ({ x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }));
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    rot.forEach((p) => {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    });
    const span = Math.max(maxX - minX, maxY - minY);
    const pad = span * 0.08;
    const path = (from, to) =>
      rot
        .slice(from, to + 1)
        .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
        .join(' ');
    return {
      rot,
      path,
      full: path(0, rot.length - 1),
      box: `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`,
      u: span / 600, // one "screen pixel" in track units
    };
  }, [points, rotation]);

  if (!view) return null;
  const { rot, path, full, box, u } = view;
  const start = rot[0];

  return (
    <svg viewBox={box} style={{ width: '100%', height: '100%', display: 'block' }}>
      <path d={full} fill="none" stroke="var(--color-hairline)" strokeWidth={9 * u} strokeLinejoin="round" />
      <path d={full} fill="none" stroke="var(--color-muted-soft)" strokeWidth={1.4 * u} strokeLinejoin="round" />
      <rect x={start.x - 5 * u} y={start.y - 5 * u} width={10 * u} height={10 * u} fill="var(--color-ink)" />
      {segments.map((s) => {
        const on = hovered === s.key;
        const a = rot[s.entryIdx];
        const ap = rot[s.apexIdx];
        const e = rot[s.exitIdx];
        return (
          <g
            key={s.key}
            onMouseEnter={() => onHover && onHover(s.key)}
            onMouseLeave={() => onHover && onHover(null)}
            style={{ cursor: 'pointer' }}
          >
            <path
              d={path(s.entryIdx, s.exitIdx)}
              fill="none"
              stroke={s.color}
              strokeOpacity={hovered && !on ? 0.35 : 1}
              strokeWidth={(on ? 8 : 5.5) * u}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx={a.x} cy={a.y} r={3.5 * u} fill="#3b82f6" />
            <circle cx={e.x} cy={e.y} r={3.5 * u} fill="var(--color-semantic-up)" />
            <circle
              cx={ap.x}
              cy={ap.y}
              r={(on ? 13 : 10.5) * u}
              fill="var(--color-canvas)"
              stroke={s.color}
              strokeWidth={2.5 * u}
            />
            <text
              x={ap.x}
              y={ap.y}
              fontSize={10 * u}
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="central"
              fill="var(--color-ink)"
              style={{ fontFamily: 'var(--font-mono)', pointerEvents: 'none' }}
            >
              {s.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const panelStyle = {
  background: 'var(--color-surface-soft)',
  border: '1px solid var(--color-hairline-soft)',
  borderRadius: 'var(--rounded-lg)',
};

function Legend({ t }) {
  const dot = (c) => ({ width: 9, height: 9, borderRadius: 9, background: c, display: 'inline-block' });
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--color-body)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ ...dot(DIR_COLOR.Right), borderRadius: 2, width: 16, height: 4 }} /> Right
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ ...dot(DIR_COLOR.Left), borderRadius: 2, width: 16, height: 4 }} /> Left
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={dot('#3b82f6')} /> {t.legendEntry}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={dot('var(--color-ink)')} /> {t.legendApex}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={dot('var(--color-semantic-up)')} /> {t.legendExit}
      </span>
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, fmt }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: 'minmax(84px, 150px) minmax(0, 1fr) 52px', alignItems: 'center', gap: 12, fontSize: 13 }}>
      <span style={{ fontWeight: 600, color: 'var(--color-body)' }}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <span className="mono-num" style={{ textAlign: 'right', color: 'var(--color-primary)', fontWeight: 700 }}>
        {fmt(value)}
      </span>
    </label>
  );
}

// ---- tab 1: what is stored in backend/circuit_data ----
function MappedView({ data, t, rotation }) {
  const [hovered, setHovered] = useState(null);
  const points = useMemo(() => (data ? fromServerPoints(data.points || []) : []), [data]);
  const segments = useMemo(() => {
    if (!data || !points.length) return [];
    return data.corners.map((c) => ({
      key: c.turn,
      label: c.turn,
      color: DIR_COLOR[c.direction] || DIR_COLOR.Right,
      entryIdx: idxAtDist(points, c.entry_dist),
      apexIdx: idxAtDist(points, c.apex_dist),
      exitIdx: idxAtDist(points, c.exit_dist),
    }));
  }, [data, points]);

  if (!data) return null;
  const meta = data.meta || {};
  const lapLen = meta.lap_length_m || (points.length ? Math.round(points[points.length - 1].dist) : null);

  return (
    <div className="cm-grid">
      <div style={{ ...panelStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="cm-map">
          <TrackSvg points={points} segments={segments} rotation={rotation} hovered={hovered} onHover={setHovered} />
        </div>
        <Legend t={t} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="badge-pill">{meta.display_name || data.name}</span>
          <span className="badge-pill">
            {data.corners.length} {t.corners}
          </span>
          {lapLen && <span className="badge-pill">{t.lap} {lapLen} m</span>}
        </div>

        <div className="cm-table-wrap">
          <table className="cb-table" style={{ fontSize: 12 }}>
            <thead>
              <tr>
                <th>{t.turn}</th>
                <th>{t.name}</th>
                <th>{t.dir}</th>
                <th style={{ textAlign: 'right' }}>{t.entry}</th>
                <th style={{ textAlign: 'right' }}>{t.apex}</th>
                <th style={{ textAlign: 'right' }}>{t.exit}</th>
                {data.corners.some((c) => c.apex_radius_m) && <th style={{ textAlign: 'right' }}>{t.radius}</th>}
              </tr>
            </thead>
            <tbody>
              {data.corners.map((c) => (
                <tr
                  key={c.turn}
                  className={hovered === c.turn ? 'selected-row' : ''}
                  onMouseEnter={() => setHovered(c.turn)}
                  onMouseLeave={() => setHovered(null)}
                  title={c.note || ''}
                >
                  <td className="mono-num" style={{ fontWeight: 700 }}>T{c.turn}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    {c.type && <div style={{ fontSize: 11, color: 'var(--color-muted)' }}>{c.type}</div>}
                  </td>
                  <td style={{ color: DIR_COLOR[c.direction], fontWeight: 700 }}>{c.direction === 'Left' ? 'L' : 'R'}</td>
                  <td className="mono-num" style={{ textAlign: 'right' }}>{Math.round(c.entry_dist)}</td>
                  <td className="mono-num" style={{ textAlign: 'right', fontWeight: 700 }}>{Math.round(c.apex_dist)}</td>
                  <td className="mono-num" style={{ textAlign: 'right' }}>{Math.round(c.exit_dist)}</td>
                  {data.corners.some((x) => x.apex_radius_m) && (
                    <td className="mono-num" style={{ textAlign: 'right', color: 'var(--color-muted)' }}>
                      {c.apex_radius_m ? `${c.apex_radius_m} m` : '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---- tab 2: the original Track Calibration Tool ----
function CalibrationView({ t, rotation, serverData }) {
  const [track, setTrack] = useState([]);
  const [fileName, setFileName] = useState('');
  const [threshold, setThreshold] = useState(0.007);
  const [minLength, setMinLength] = useState(15);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    const p = serverData && serverData.meta && serverData.meta.calibration_params;
    if (p) {
      setThreshold(p.threshold);
      setMinLength(p.min_length);
    }
  }, [serverData]);

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const pts = parseTelemetryText(ev.target.result);
      if (!pts || pts.length < 10) {
        alert('Invalid file format.');
        return;
      }
      setFileName(file.name);
      setTrack(withCurvature(pts));
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const loadServer = () => {
    if (!serverData) return;
    setFileName(serverData.reference_file ? serverData.reference_file.split('/').pop() : serverData.name);
    setTrack(withCurvature(fromServerPoints(serverData.points)));
  };

  const corners = useMemo(() => (track.length ? detectCorners(track, threshold, minLength) : []), [track, threshold, minLength]);

  // which stored (mapped) corner each detected apex falls into
  const matchFor = (c) => {
    if (!serverData || !fileName || !serverData.reference_file || !serverData.reference_file.endsWith(fileName)) return null;
    const m = serverData.corners.find((s) => c.apex.dist >= s.entry_dist - 10 && c.apex.dist <= s.exit_dist + 10);
    return m ? `T${m.turn} ${m.name}` : '—';
  };
  const showMatch = corners.length > 0 && matchFor(corners[0]) !== null;

  const segments = corners.map((c) => ({
    key: c.turn,
    label: c.turn,
    color: '#cf4500',
    entryIdx: c.entry.index,
    apexIdx: c.apex.index,
    exitIdx: c.exit.index,
  }));

  const exportJson = () => {
    if (!corners.length) return;
    const cfg = {
      track_name: fileName.replace('.txt', '').replace('.csv', ''),
      calibration_params: { threshold, min_length: minLength },
      corners: corners.map((c) => ({
        turn: c.turn,
        name: `Turn ${c.turn}`,
        entry_dist: Math.round(c.entry.dist),
        apex_dist: Math.round(c.apex.dist),
        exit_dist: Math.round(c.exit.dist),
      })),
    };
    const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cfg.track_name}_corners.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <label className="btn-secondary-light" style={{ cursor: 'pointer' }}>
          📁 {t.loadFile}
          <input type="file" accept=".txt,.csv" onChange={onFile} style={{ display: 'none' }} />
        </label>
        {serverData && (
          <button className="btn-secondary-light" onClick={loadServer}>
            ⬇ {t.loadServer} ({serverData.name})
          </button>
        )}
        {fileName && (
          <span className="mono-num" style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: 13 }}>
            {fileName}
          </span>
        )}
      </div>

      {!track.length ? (
        <div style={{ ...panelStyle, padding: 40, textAlign: 'center', color: 'var(--color-body)', fontSize: 14 }}>
          <div style={{ marginBottom: 6 }}>{t.calibHint}</div>
          <div style={{ color: 'var(--color-muted)' }}>{t.noData}</div>
        </div>
      ) : (
        <div className="cm-grid">
          <div style={{ ...panelStyle, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Slider label={t.threshold} value={threshold} min={0.001} max={0.02} step={0.001} onChange={setThreshold} fmt={(v) => v.toFixed(3)} />
            <Slider label={t.minLen} value={minLength} min={5} max={50} step={1} onChange={setMinLength} fmt={(v) => `${v}m`} />
            <div className="cm-map">
              <TrackSvg points={track} segments={segments} rotation={rotation} hovered={hovered} onHover={setHovered} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>
                {t.detected} <span style={{ color: 'var(--color-primary)' }}>({corners.length})</span>
              </h3>
              <button className="btn-primary" onClick={exportJson} disabled={!corners.length}>
                💾 {t.export}
              </button>
            </div>
            <div className="cm-table-wrap">
              <table className="cb-table" style={{ fontSize: 12 }}>
                <thead>
                  <tr>
                    <th>{t.turn}</th>
                    <th style={{ textAlign: 'right', color: '#3b82f6' }}>{t.entry}</th>
                    <th style={{ textAlign: 'right' }}>{t.apex}</th>
                    <th style={{ textAlign: 'right', color: 'var(--color-semantic-up)' }}>{t.exit}</th>
                    {showMatch && <th>{t.matches}</th>}
                  </tr>
                </thead>
                <tbody>
                  {corners.map((c) => (
                    <tr
                      key={c.turn}
                      className={hovered === c.turn ? 'selected-row' : ''}
                      onMouseEnter={() => setHovered(c.turn)}
                      onMouseLeave={() => setHovered(null)}
                    >
                      <td className="mono-num" style={{ fontWeight: 700 }}>T{c.turn}</td>
                      <td className="mono-num" style={{ textAlign: 'right' }}>{c.entry.dist.toFixed(0)}</td>
                      <td className="mono-num" style={{ textAlign: 'right', fontWeight: 700, color: '#cf4500' }}>{c.apex.dist.toFixed(0)}</td>
                      <td className="mono-num" style={{ textAlign: 'right' }}>{c.exit.dist.toFixed(0)}</td>
                      {showMatch && <td style={{ fontSize: 11 }}>{matchFor(c)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CornerMapModal({ open, onClose, language = 'ko' }) {
  const t = txt[language] || txt.en;
  const [tab, setTab] = useState('mapped');
  const [tracks, setTracks] = useState([]);
  const [trackId, setTrackId] = useState(5);
  const [data, setData] = useState(null);
  const [offline, setOffline] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || tracks.length) return;
    fetch(`${API}/api/corner_map/tracks`)
      .then((r) => r.json())
      .then((d) => {
        setTracks(d.tracks || []);
        setOffline(false);
        if (d.tracks && d.tracks.length && !d.tracks.some((x) => x.track_id === trackId)) setTrackId(d.tracks[0].track_id);
      })
      .catch(() => {
        setOffline(true);
        setTab('calib');
      });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || offline) return;
    setData(null);
    fetch(`${API}/api/corner_map/${trackId}`)
      .then((r) => r.json())
      .then((d) => setData(d.error ? null : d))
      .catch(() => setOffline(true));
  }, [open, trackId, offline]);

  if (!open) return null;

  return (
    <div className="cm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="cm-modal" role="dialog" aria-modal="true" aria-label={t.title}>
        <div className="cm-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontFamily: 'var(--font-display)' }}>🗺 {t.title}</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={`btn-secondary-light ${tab === 'mapped' ? 'active' : ''}`} onClick={() => setTab('mapped')} disabled={offline}>
                {t.mapped}
              </button>
              <button className={`btn-secondary-light ${tab === 'calib' ? 'active' : ''}`} onClick={() => setTab('calib')}>
                {t.calib}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {tracks.length > 0 && (
              <select className="cb-select" value={trackId} onChange={(e) => setTrackId(Number(e.target.value))} aria-label={t.track}>
                {tracks.map((tr) => (
                  <option key={tr.track_id} value={tr.track_id}>
                    {tr.name} · {tr.corners} {t.corners}
                  </option>
                ))}
              </select>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-body)' }}>
              {t.rotate}
              <input type="range" min={-180} max={180} step={5} value={rotation} onChange={(e) => setRotation(Number(e.target.value))} style={{ width: 90 }} />
              <span className="mono-num" style={{ width: 34 }}>{rotation}°</span>
            </label>
            <button className="cm-close" onClick={onClose} aria-label={t.close}>
              ✕
            </button>
          </div>
        </div>

        <div className="cm-body">
          {offline && (
            <div style={{ ...panelStyle, padding: '10px 14px', fontSize: 13, color: 'var(--color-semantic-down)', marginBottom: 12 }}>
              {t.offline}
            </div>
          )}
          {tab === 'mapped' && !offline &&
            (data ? (
              <MappedView data={data} t={t} rotation={rotation} />
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>Loading…</div>
            ))}
          {tab === 'calib' && <CalibrationView t={t} rotation={rotation} serverData={offline ? null : data} />}
        </div>
      </div>
    </div>
  );
}
