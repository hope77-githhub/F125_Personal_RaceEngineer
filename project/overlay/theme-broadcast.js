// Broadcast theme helpers (F1 AI Race Engineer). Loaded by overlay.html after the overlay script.
// 1) compound letters take the compound colour (the overlay only sets it as a ring colour)
// 2) "LAP 1 / 20" -> "LAP  1 /20" with a bold current lap, like the reference
// 3) optional user-supplied artwork from local-assets/ (git-ignored): logo, font, team logos
(function () {
  if (new URLSearchParams(location.search).get('theme') === 'original') return;

  const tower = document.getElementById('tower');
  const syncTyre = (el) => {
    const c = el.style.borderColor;
    if (c && el.style.color !== c) el.style.color = c;
  };
  new MutationObserver((muts) => {
    for (const m of muts) if (m.target.classList && m.target.classList.contains('tyre')) syncTyre(m.target);
  }).observe(tower, { subtree: true, attributes: true, attributeFilter: ['style'] });
  tower.querySelectorAll('.tyre').forEach(syncTyre);

  // interval like the broadcast: one decimal ("+5.3", "+1:01.1"), "Out" for retired cars
  const fmtGap = (el) => {
    const t = el.textContent;
    let m = /^([+-])(\d+)\.(\d)\d{2,}$/.exec(t);
    if (m) { el.textContent = m[1] + m[2] + '.' + m[3]; return; }
    m = /^([+-])(\d+):(\d{2})\.(\d)\d{2,}$/.exec(t);
    if (m) { el.textContent = m[1] + m[2] + ':' + m[3] + '.' + m[4]; return; }
    if (t === 'OUT') el.textContent = 'Out';
  };
  new MutationObserver((muts) => {
    for (const m of muts) {
      const el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      if (el && el.classList && el.classList.contains('gap')) fmtGap(el);
    }
  }).observe(tower, { subtree: true, childList: true, characterData: true });
  tower.querySelectorAll('.gap').forEach(fmtGap);

  // race header like the broadcast: logo + "FIA Formula 1 World Championship" (sprint keeps SPRINT)
  const ev = document.getElementById('brandEvent');
  const fmtEvent = () => {
    if (ev.textContent === 'RACE') ev.textContent = 'FIA Formula 1\nWorld Championship';
    ev.classList.toggle('rf-fia', ev.textContent.startsWith('FIA'));
  };
  new MutationObserver(fmtEvent).observe(ev, { childList: true, characterData: true, subtree: true });
  fmtEvent();

  const lap = document.getElementById('lapTxt');
  const fmtLap = () => {
    const m = /^LAP (\S+)(?: \/ (\d+))?$/.exec(lap.textContent);
    if (!m) return;
    lap.innerHTML = '<span class="rf-lap">LAP</span><b class="rf-cur">' + m[1] + '</b>'
      + (m[2] ? '<span class="rf-tot"> / ' + m[2] + '</span>' : '');
  };
  new MutationObserver(fmtLap).observe(lap, { childList: true, characterData: true, subtree: true });
  fmtLap();

  // ---- TV-pod halo: lay the HUD onto the halo as seen from the centred TV-pod camera.
  // The SVG gets the reference frame's own coordinates (1247x702, 16:9) so every element sits where it
  // is in the broadcast; the live elements the overlay updates are moved, not recreated.
  const NS = 'http://www.w3.org/2000/svg';
  const halo = document.getElementById('haloGauge');
  const mk = (tag, attrs, text) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (text != null) n.textContent = text;
    return n;
  };
  const byText = (txt) => [...halo.querySelectorAll('text')].find((t) => t.textContent.trim() === txt && !t.id);
  (function layoutTvPod() {
    if (!halo) return;
    halo.setAttribute('viewBox', '0 0 1247 702');
    halo.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const keep = {
      km: document.getElementById('haloKm'), mph: document.getElementById('haloMph'),
      boost: document.getElementById('haloBoostPill'), ot: document.getElementById('haloOvertakePill'),
      kmLbl: byText('KM/H'), ersFill: document.getElementById('haloErsFill'),
      ersText: document.getElementById('haloErsText'),
      ersBg: [...halo.querySelectorAll('rect')].find((r) => r.getAttribute('x') === '358' && !r.id),
      bolt: [...halo.querySelectorAll('path')].find((p) => (p.getAttribute('d') || '').startsWith('M382 147')),
      turn: document.getElementById('haloTurn'), turnTot: document.getElementById('haloTurnTotal'),
      brakeBars: document.getElementById('haloBrakeBars'), thrBars: document.getElementById('haloThrottleBars'),
      brakeTxt: document.getElementById('haloBrakeText'), thrTxt: document.getElementById('haloThrottleText'),
      deploy: document.getElementById('haloDeployFill'),
      aero1: document.getElementById('haloAeroLabel'), aero2: document.getElementById('haloAeroLabel2'),
      aeroPill: document.getElementById('haloAeroPill'), gears: document.getElementById('haloGears'),
      rpm: document.getElementById('haloRpm'),
    };
    const layer = mk('g', { id: 'rfHalo' });
    const rot = (a, x, y) => 'rotate(' + a + ' ' + x + ' ' + y + ')';
    const add = (tag, attrs, text) => { const n = mk(tag, attrs, text); layer.appendChild(n); return n; };
    const label = (cls, x, y, a, txt) => add('text', { class: cls, x, y, 'text-anchor': 'middle', transform: rot(a, x, y) }, txt);
    const put = (n, x, y, a, cls, anchor) => {
      if (!n) return;
      n.setAttribute('x', x); n.setAttribute('y', y);
      n.setAttribute('transform', a ? rot(a, x, y) : '');
      if (cls) n.setAttribute('class', cls);
      if (anchor) n.setAttribute('text-anchor', anchor);
      layer.appendChild(n);
    };
    const watch = (n, fn, attrs) => {     // re-run fn whenever the overlay updates that node
      if (!n) return;
      new MutationObserver(fn).observe(n, attrs ? { attributes: true, attributeFilter: attrs } : { childList: true, characterData: true, subtree: true });
      fn();
    };
    // smooth path through measured points (Catmull-Rom -> cubic Bezier)
    const smooth = (p) => p.map(([x, y], i) => {
      if (!i) return 'M' + x + ' ' + y;
      const a = p[i - 2] || p[i - 1], b = p[i - 1], c = p[i + 1] || [x, y], f = (v) => v.toFixed(1);
      return 'C' + f(b[0] + (x - a[0]) / 6) + ' ' + f(b[1] + (y - a[1]) / 6) + ' ' + f(x - (c[0] - b[0]) / 6) + ' ' + f(y - (c[1] - b[1]) / 6) + ' ' + x + ' ' + y;
    }).join(' ');
    // Every number below is a position measured on the broadcast frame (reference px, 1247x702).
    // Only the elements the broadcast shows are drawn; the overlay's extra numbers (brake/throttle %, ERS %,
    // RPM value, turn total) stay hidden so nothing overlaps — RPM drives the bar under the gears instead.
    // The whole HUD is laid out around the dial centre C and then shifted so C sits at the horizontal centre
    // of the screen: with the game's centred TV-pod camera the halo is centred on screen.
    const CX = 704, CY = 371;
    layer.setAttribute('transform', 'translate(' + (1247 / 2 - CX) + ' 0)');
    // point on an ellipse around C (angles in degrees, SVG orientation: 0 = right, 90 = down)
    const P = (a, b, deg) => [CX + a * Math.cos(deg * Math.PI / 180), CY + b * Math.sin(deg * Math.PI / 180)];
    const f1 = (v) => v.toFixed(1);
    // annular sector between ellipses (ai, bi) and (ao, bo) from angle lo to hi
    const sector = (ai, bi, ao, bo, lo, hi) => {
      const [p1, p2, p3, p4] = [P(ao, bo, lo), P(ao, bo, hi), P(ai, bi, hi), P(ai, bi, lo)];
      const big = hi - lo > 180 ? 1 : 0;
      return 'M' + f1(p1[0]) + ' ' + f1(p1[1]) + ' A' + ao + ' ' + bo + ' 0 ' + big + ' 1 ' + f1(p2[0]) + ' ' + f1(p2[1]) +
        ' L' + f1(p3[0]) + ' ' + f1(p3[1]) + ' A' + ai + ' ' + bi + ' 0 ' + big + ' 0 ' + f1(p4[0]) + ' ' + f1(p4[1]) + ' Z';
    };
    // halo arc, symmetric over the dial
    const ARC = [[464, 357], [520, 326], [574, 302], [630, 284], [704, 274], [778, 284], [834, 302], [888, 326], [944, 357]];
    add('path', { class: 'rf-arc', d: smooth(ARC) });
    // slope of that arc (degrees) at a given x: same Catmull-Rom -> Bezier segments as smooth()
    const arcAngleAt = (x) => {
      const i = Math.max(1, Math.min(ARC.length - 1, ARC.findIndex((p) => p[0] >= x)));
      const a = ARC[i - 2] || ARC[i - 1], b = ARC[i - 1], e = ARC[i], c = ARC[i + 1] || e;
      const P0 = b, P1 = [b[0] + (e[0] - a[0]) / 6, b[1] + (e[1] - a[1]) / 6], P2 = [e[0] - (c[0] - b[0]) / 6, e[1] - (c[1] - b[1]) / 6], P3 = e;
      const at = (t, k) => (1 - t) ** 3 * P0[k] + 3 * (1 - t) ** 2 * t * P1[k] + 3 * (1 - t) * t * t * P2[k] + t ** 3 * P3[k];
      let lo = 0, hi = 1;
      for (let n = 0; n < 30; n++) { const m = (lo + hi) / 2; if (at(m, 0) < x) lo = m; else hi = m; }
      const t = (lo + hi) / 2, d = (k) => 3 * (1 - t) ** 2 * (P1[k] - P0[k]) + 6 * (1 - t) * t * (P2[k] - P1[k]) + 3 * t * t * (P3[k] - P2[k]);
      return Math.atan2(d(1), d(0)) * 180 / Math.PI;
    };
    // TURN (left) and ACTIVE AERO (right): mirrored boxes at the same height, each tilted to the halo arc's slope
    // at its position; everything inside a box is drawn in the box's own rotated frame, so the text stays parallel.
    const BOX_D = 168, BOX_Y = 395;
    const sideBox = (cx, tilt) => {
      const g = mk('g', { transform: 'translate(' + cx + ' ' + BOX_Y + ') rotate(' + tilt + ')' });
      g.appendChild(mk('rect', { class: 'plate rf-box', x: -27, y: -31, width: 54, height: 62, rx: 6 }));
      layer.appendChild(g);
      return g;
    };
    const inBox = (g, n, x, y, cls) => {
      if (!n) return;
      n.setAttribute('x', x); n.setAttribute('y', y); n.removeAttribute('transform');
      n.setAttribute('class', cls); n.setAttribute('text-anchor', 'middle'); n.setAttribute('dominant-baseline', 'central');
      g.appendChild(n);
    };
    const turnBox = sideBox(CX - BOX_D, arcAngleAt(CX - BOX_D).toFixed(1));
    inBox(turnBox, keep.turn, 0, -9, 'rf-turn');
    turnBox.appendChild(mk('text', { class: 'rf-lbl', x: 0, y: 14, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'TURN'));
    if (keep.turn) keep.turn.style.removeProperty('font-size');      // upstream inline 22px would overflow the box
    watch(keep.turn, () => { keep.turn.style.visibility = /\d/.test(keep.turn.textContent) ? '' : 'hidden'; });
    const aeroBox = sideBox(CX + BOX_D, arcAngleAt(CX + BOX_D).toFixed(1));
    inBox(aeroBox, keep.aero1, 0, -15, 'rf-lbl');
    inBox(aeroBox, keep.aero2, 0, -3, 'rf-lbl');
    const aeroLines = [[13, 11], [10, 18]].map(([w, y]) => {
      const p = mk('path', { class: 'rf-aero', d: 'M' + -w + ' ' + y + ' L' + w + ' ' + y });
      aeroBox.appendChild(p);
      return p;
    });
    watch(keep.aeroPill, () => aeroLines.forEach((p) => p.setAttribute('data-state', keep.aeroPill.dataset.state || 'off')), ['data-state']);
    // RECHARGE (left) / DEPLOY (right): curved bands outside the brake / throttle gauges, letters stacked upright
    const BAND = [91, 84, 105, 98], MID = [98, 91];
    add('path', { class: 'plate', d: sector(...BAND, 141, 219) });
    add('path', { class: 'plate', d: sector(...BAND, -39, 39) });
    const stack = (txt, from, to) => [...txt].forEach((ch, i, all) => {
      const [x, y] = P(...MID, from + (to - from) * (i / (all.length - 1)));
      add('text', { class: 'rf-vlbl', x: f1(x), y: f1(y), 'text-anchor': 'middle', 'dominant-baseline': 'central' }, ch);
    });
    stack('RECHARGE', 212, 148);
    stack('DEPLOY', -32, 32);
    // labels under the bottom ends of the brake / throttle gauges, following the curve
    { const [x, y] = P(96, 90, 112); label('rf-tag', f1(x), f1(y), 22, 'BRAKE'); }
    { const [x, y] = P(96, 90, 68); label('rf-tag g', f1(x), f1(y), -22, 'THROTTLE'); }
    // brake (left) / throttle (right): a crescent of 28 thin horizontal bars hugging the dial, filled from the
    // bottom. The overlay colours group.children[i] by value * children.length, so the 12 upstream bars are
    // replaced by 28 paths with the same class and data-active-color.
    const GAUGE = { ai: 71, bi: 64, ao: 87, bo: 80, top: -60, bottom: 57, bars: 28, fill: 0.72 };
    const halfW = (a, b, dy) => a * Math.sqrt(Math.max(0, 1 - (dy / b) ** 2));
    const placeBars = (group, side) => {
      const old = [...group.children];
      const cls = (old[0] && old[0].getAttribute('class')) || 'seg-off', color = (old[0] && old[0].dataset.activeColor) || '';
      old.forEach((o) => o.remove());
      const { ai, bi, ao, bo, top, bottom, bars } = GAUGE, pitch = (bottom - top) / bars, h = pitch * GAUGE.fill;
      for (let i = 0; i < bars; i++) {
        const y1 = bottom - i * pitch, y0 = y1 - h;
        const pts = [[halfW(ao, bo, y0), y0], [halfW(ai, bi, y0), y0], [halfW(ai, bi, y1), y1], [halfW(ao, bo, y1), y1]];
        const seg = mk('path', { class: cls, d: 'M' + pts.map(([x, y]) => f1(CX + side * x) + ' ' + f1(CY + y)).join(' L') + ' Z' });
        seg.dataset.activeColor = color;
        group.appendChild(seg);
      }
      layer.appendChild(group);
    };
    if (keep.brakeBars) placeBars(keep.brakeBars, -1);
    if (keep.thrBars) placeBars(keep.thrBars, 1);
    // centre dial + battery
    add('ellipse', { class: 'plate', cx: CX, cy: CY, rx: 67, ry: 60 });
    add('ellipse', { class: 'ring', cx: CX, cy: CY, rx: 62, ry: 55 });
    put(keep.kmLbl, 705.5, 331, 0, 'rf-lbl sm', 'middle');
    put(keep.km, 704, 352, 0, 'rf-big', 'middle');
    for (let i = 0; i < 7; i++) {      // the "( ( (  BOOST  ) ) )" ticks
      add('path', { class: 'rf-tickmark', d: 'M' + (662 + i * 3.2) + ' 359.5 q-1.6 4.5 0 9' });
      add('path', { class: 'rf-tickmark', d: 'M' + (744 - i * 3.2) + ' 359.5 q1.6 4.5 0 9' });
    }
    const pill = (g, x, y, w, h, fs) => {
      if (!g) return;
      const r = g.querySelector('rect'), t = g.querySelector('text');
      Object.entries({ x, y, width: w, height: h, rx: 1.5 }).forEach(([k, v]) => r.setAttribute(k, v));
      t.setAttribute('x', x + w / 2); t.setAttribute('y', y + h / 2); t.setAttribute('dominant-baseline', 'central');
      t.style.fontSize = fs + 'px';
      layer.appendChild(g);
      // the broadcast prints just the name; the state is the pill's colour (keep distances such as "18 M")
      watch(t, () => { const s = t.textContent.replace(/\s+(READY|ON|OFF|EMPTY)$/, ''); if (s !== t.textContent) t.textContent = s; });
    };
    pill(keep.boost, 684, 360.5, 38.5, 7.5, 5.6);
    pill(keep.ot, 655, 370.5, 96, 9, 6.4);
    put(keep.mph, 702.5, 398, 0, 'rf-mid', 'middle');
    label('rf-lbl sm', 702, 408, 0, 'MPH');
    const ers = mk('g', { transform: 'translate(676 416) scale(1.18 1.08) translate(-358 -146)' });
    for (const n of [keep.ersBg, keep.ersFill, keep.bolt]) if (n) ers.appendChild(n);
    layer.appendChild(ers);
    // gears on the curve of the halo, RPM bar under them
    const GEAR = [[916, 410], [935, 418], [956, 428], [975, 437], [995, 448], [1015, 460], [1034, 473], [1052, 485], [1070, 502]];
    const RPM = [[904, 420], [936, 432], [980, 454], [1020, 476], [1050, 497], [1076, 520]];
    const rpmPath = smooth(RPM);
    add('path', { class: 'rf-rpmbg', d: rpmPath, pathLength: 100 });
    const rpmFill = add('path', { class: 'rf-rpmfill', d: rpmPath, pathLength: 100, 'stroke-dasharray': '0 100' });
    // bar end = the car's max RPM from telemetry (car status packet, upstream default 13000 until it arrives)
    const rpmEnd = label('rf-tick', 1073, 532, 20, '13');
    let rpmMax = 13;
    const drawRpm = () => {
      const v = parseFloat(keep.rpm && keep.rpm.textContent), pct = Number.isFinite(v) ? Math.max(0, Math.min(100, (v / rpmMax) * 100)) : 0;
      rpmFill.setAttribute('stroke-dasharray', pct.toFixed(1) + ' 100');
      rpmFill.style.visibility = pct > 0.5 ? '' : 'hidden';
    };
    const setRpmMax = (maxRpm) => {
      const k = Number(maxRpm) / 1000;
      if (!(k >= 5 && k <= 25) || Math.abs(k - rpmMax) < 0.05) return;
      rpmMax = k; rpmEnd.textContent = String(Math.round(k)); drawRpm();
    };
    watch(keep.rpm, drawRpm);
    if (keep.gears) {
      [...keep.gears.children].forEach((t, i) => {
        const k = Math.min(i, GEAR.length - 1), [x, y] = GEAR[k];
        const a = GEAR[Math.max(0, k - 1)], b = GEAR[Math.min(GEAR.length - 1, k + 1)];
        t.setAttribute('x', x); t.setAttribute('y', y);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('transform', rot((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI).toFixed(1), x, y));
      });
      layer.appendChild(keep.gears);
    }
    label('rf-lbl', 1006, 435.5, 29, 'GEARS');
    label('rf-lbl', 985, 474, 29, 'RPM x1000');
    // car ahead + viewed car written along the left of the halo ("14  SAINZ" / "15  HADJAR")
    const nameLine = (x, y, a, cls) => {
      const t = add('text', { class: cls, x, y, transform: rot(a, x, y) });
      const pos = mk('tspan', {}), name = mk('tspan', { dx: 8 });
      t.append(pos, name);
      return (c) => { pos.textContent = c ? String(c.pos) : ''; name.textContent = c ? String(c.name || c.code || '').toUpperCase() : ''; };
    };
    const ahead = nameLine(361, 502, -35, 'rf-name dim');
    const mine = nameLine(366, 541, -39, 'rf-name me');
    // hide everything that was not moved, then attach the new layer
    [...halo.children].forEach((c) => { c.style.display = 'none'; });
    halo.appendChild(layer);
    // per-team calibration from the overlay (edit mode drags left/top in %) -> offset of the whole frame
    const syncOffset = () => {
      const x = parseFloat(halo.style.left), y = parseFloat(halo.style.top);
      halo.style.setProperty('--rf-hdx', (Number.isFinite(x) ? x - 58 : 0) + 'vw');
      halo.style.setProperty('--rf-hdy', (Number.isFinite(y) ? y - 58 : 0) + 'vh');
    };
    new MutationObserver(syncOffset).observe(halo, { attributes: true, attributeFilter: ['style'] });
    syncOffset();
    // names: the overlay's own state stream (pos + surname of the viewed car and the car ahead)
    try {
      let last = 0;
      const es = new EventSource('/events');
      es.onmessage = (e) => {
        const now = Date.now();
        if (now - last < 400) return;
        last = now;
        const s = JSON.parse(e.data);
        const cars = (s.cars || []).filter(Boolean);
        const me = cars.find((c) => c.idx === (s.viewCar ?? s.player));
        const front = me && me.pos > 1 && cars.find((c) => c.pos === me.pos - 1);
        ahead(front);
        mine(me && me.pos ? me : null);
        if (s.car) setRpmMax(s.car.maxRpm);
      };
    } catch (_) { /* no names: fine */ }
  })();

  // ---- local assets
  const TEAMS = {
    mercedes: [0, 220], ferrari: [1, 221], redbull: [2, 222], williams: [3, 223], astonmartin: [4, 224],
    alpine: [5, 225], racingbulls: [6, 226], haas: [7, 227], mclaren: [8, 228], sauber: [9], audi: [229],
    cadillac: [230],
  };
  fetch('/local-assets/index.json').then((r) => (r.ok ? r.json() : { files: [] })).then(async ({ files = [] }) => {
    const has = (f) => files.includes(f);
    const logo = ['logo.svg', 'logo.png', 'logo.webp'].find(has);
    if (logo) {
      document.documentElement.style.setProperty('--local-logo', 'url("/local-assets/' + logo + '")');
      document.body.classList.add('has-logo');
    }
    for (const f of files.filter((x) => /^fonts\/.+\.(woff2?|ttf|otf)$/i.test(x))) {
      const name = f.toLowerCase();
      const weight = /black|heavy/.test(name) ? '900' : /bold/.test(name) ? '700' : /wide/.test(name) ? '800' : '400';
      const style = /italic/.test(name) ? 'italic' : 'normal';
      try {
        const face = new FontFace('F1Local', 'url("/local-assets/' + f + '")', { weight, style });
        document.fonts.add(await face.load());
        document.body.classList.add('has-font');
      } catch (_) { /* unreadable font: keep the fallback */ }
    }
    let css = '';
    for (const [team, ids] of Object.entries(TEAMS)) {
      const f = ['svg', 'png', 'webp'].map((e) => 'teams/' + team + '.' + e).find(has);
      if (!f) continue;
      for (const id of ids) {
        css += '.row .team[data-team="' + id + '"]{font-size:0;background:url("/local-assets/' + f
          + '") center/1.05rem 1.05rem no-repeat}.row .team[data-team="' + id + '"] svg{display:none}';
      }
    }
    if (css) {
      const st = document.createElement('style');
      st.textContent = css;
      document.head.appendChild(st);
    }
  }).catch(() => {});
})();
