import React from 'react';

// Practice setup analysis (backend state_mgmt/setup_analysis.py, rules in docs/SETUP_GUIDE.md section 5):
// our best lap vs the fastest car of the session (FP ranking) and our tyres -> setup changes with the reasons.
// The backend sends it only in practice sessions.

const T = {
  ko: {
    badge: 'PRACTICE SETUP ANALYSIS',
    title: '셋업 분석 (프랙티스)',
    you: '내 베스트 랩',
    ref: '기준 차 (FP 최고 기록)',
    youFastest: '내가 FP 1위예요. 2위 차와 비교했어요.',
    noRef: '비교할 다른 차의 기록 랩이 아직 없어요.',
    ranking: 'FP 순위',
    speeds: '속도 비교 (나 − 기준 차)',
    topSpeed: '최고 속도',
    slow: '저속 코너 (<120 km/h)',
    medium: '중속 코너 (120~200)',
    fast: '고속 코너 (200+)',
    apex: '에이펙스',
    exit: '탈출',
    corners: (n) => `${n}개`,
    braking: '브레이킹 지점',
    brakeVal: (m) => (Math.abs(m) < 3 ? '기준 차와 비슷함' : m < 0 ? `평균 ${(-m).toFixed(0)}m 이름` : `평균 ${m.toFixed(0)}m 늦음`),
    changes: '추천 셋업 변경',
    noChanges: '지금은 바꿀 셋업이 없어요.',
    details: '항목별 분석',
    status: { change: '변경 추천', ok: '유지', wait: '데이터 대기', note: '참고' },
    footer: '한 번에 한 항목씩 바꾸고 2~3랩 비교해 보세요. 기준값은 F1 게임 셋업의 경험칙이에요.',
    waiting: '분석하려면 기록된 랩이 필요해요. 몇 랩 달리면 여기에 결과가 나와요.',
  },
  en: {
    badge: 'PRACTICE SETUP ANALYSIS',
    title: 'Setup analysis (practice)',
    you: 'Your best lap',
    ref: 'Reference (fastest in FP)',
    youFastest: 'You are fastest in FP. Compared with P2.',
    noRef: 'No timed lap from another car yet.',
    ranking: 'FP ranking',
    speeds: 'Speed comparison (you − reference)',
    topSpeed: 'Top speed',
    slow: 'Slow corners (<120 km/h)',
    medium: 'Medium corners (120-200)',
    fast: 'Fast corners (200+)',
    apex: 'Apex',
    exit: 'Exit',
    corners: (n) => `${n}`,
    braking: 'Braking point',
    brakeVal: (m) => (Math.abs(m) < 3 ? 'About the same as the reference' : m < 0 ? `${(-m).toFixed(0)} m earlier on average` : `${m.toFixed(0)} m later on average`),
    changes: 'Suggested setup changes',
    noChanges: 'No setup change needed right now.',
    details: 'Analysis by area',
    status: { change: 'Change', ok: 'Keep', wait: 'Waiting for data', note: 'Note' },
    footer: 'Change one item at a time and compare 2-3 laps. Thresholds are rules of thumb for the F1 games.',
    waiting: 'Needs a timed lap. Drive a few laps and the analysis appears here.',
  },
};

const STATUS_COLOR = {
  change: 'var(--color-primary)',
  ok: 'var(--color-semantic-up)',
  wait: 'var(--color-muted)',
  note: '#b7791f',
};

const tile = {
  padding: '12px 14px',
  backgroundColor: 'var(--color-surface-soft)',
  borderRadius: 'var(--rounded-md)',
  border: '1px solid var(--color-hairline-soft)',
};
const small = { fontSize: '11px', color: 'var(--color-muted)', fontWeight: 600 };

const signed = (v, digits = 1) => (v == null ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(digits)}`);
const tone = (v) => (v == null ? undefined : v < 0 ? 'text-down' : v > 0 ? 'text-up' : undefined);

export default function SetupAnalysisCard({ data, language = 'ko' }) {
  const t = T[language] || T.en;
  const L = (x) => (x ? x[language] || x.en : '');
  if (!data) return null;
  const { you, reference: ref, metrics, items = [], changes = [], ranking = [] } = data;
  const top = ranking.slice(0, 5);
  if (you && you.pos > 5) top.push(you);

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="badge-pill" style={{ marginBottom: '6px' }}>{t.badge}</span>
          <div style={{ fontSize: '20px', fontWeight: 600 }}>{t.title}</div>
        </div>
      </div>

      {!you ? (
        <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>{t.waiting}</div>
      ) : (
        <>
          <div className="grid-3" style={{ gap: '12px', marginBottom: '20px' }}>
            <div style={tile}>
              <div style={small}>{t.you}</div>
              <div className="mono-num" style={{ fontSize: '20px', fontWeight: 700 }}>{you.best}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>P{you.pos} / {data.cars_ranked} · {signed(you.gap, 3)}s</div>
            </div>
            <div style={tile}>
              <div style={small}>{t.ref}</div>
              {ref ? (
                <>
                  <div className="mono-num" style={{ fontSize: '20px', fontWeight: 700 }}>{ref.best}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-body)' }}>P{ref.pos} · {ref.name}</div>
                  {you.pos === 1 && <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>{t.youFastest}</div>}
                </>
              ) : (
                <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>{t.noRef}</div>
              )}
            </div>
            <div style={tile}>
              <div style={small}>{t.ranking}</div>
              {top.map((r) => (
                <div key={r.idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: r.you ? 700 : 400, color: r.you ? 'var(--color-primary)' : 'var(--color-ink)' }}>
                  <span>P{r.pos} {r.name}</span>
                  <span className="mono-num">{r.pos === 1 ? r.best : `+${r.gap.toFixed(3)}`}</span>
                </div>
              ))}
            </div>
          </div>

          {metrics && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>{t.speeds}</div>
              <div className="grid-2" style={{ gap: '10px' }}>
                <div style={tile}>
                  <div style={small}>{t.topSpeed}</div>
                  <div style={{ fontSize: '14px' }}>
                    <span className="mono-num">{metrics.vmax[0]} / {metrics.vmax[1]} km/h</span>{' '}
                    <strong className={`mono-num ${tone(metrics.vmax[2])}`}>({signed(metrics.vmax[2], 0)})</strong>
                  </div>
                  {metrics.brake_m != null && (
                    <>
                      <div style={{ ...small, marginTop: '8px' }}>{t.braking}</div>
                      <div style={{ fontSize: '14px' }}>{t.brakeVal(metrics.brake_m)}</div>
                    </>
                  )}
                </div>
                <div style={tile}>
                  {['slow', 'medium', 'fast'].map((k) => {
                    const c = metrics.classes[k];
                    return (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '2px 0' }}>
                        <span style={{ color: 'var(--color-body)' }}>{t[k]} · {t.corners(c.n)}</span>
                        {c.n ? (
                          <span className="mono-num">
                            {t.apex} <strong className={tone(c.apex)}>{signed(c.apex)}</strong> · {t.exit}{' '}
                            <strong className={tone(c.exit)}>{signed(c.exit)}</strong>
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-muted)' }}>-</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>{t.changes}</div>
            {changes.length ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {changes.map((c) => (
                  <span key={c.field} className="badge-pill badge-primary mono-num" style={{ fontSize: '13px' }}>{c.text}</span>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: '14px', color: 'var(--color-body)' }}>{t.noChanges}</div>
            )}
          </div>

          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>{t.details}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((it) => (
              <div key={it.area} style={{ ...tile, borderLeft: `3px solid ${STATUS_COLOR[it.status] || 'var(--color-hairline)'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'baseline' }}>
                  <strong style={{ fontSize: '14px' }}>{L(it.title)}</strong>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: STATUS_COLOR[it.status] }}>{t.status[it.status] || it.status}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-ink)', marginTop: '4px' }}>{L(it.why)}</div>
                {it.evidence && <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '3px' }}>{L(it.evidence)}</div>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '12px' }}>{t.footer}</div>
        </>
      )}
    </div>
  );
}
