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
    // which modes are in use, as data-boost / data-ot / data-aero on #rfHalo (off / ready / soon / on), so the CSS
    // can light up the dial ring, the halo arc, the boost marks and the aero box while a mode is active
    const rot = (a, x, y) => 'rotate(' + a + ' ' + x + ' ' + y + ')';
    let into = layer;                     // where add()/put()/... append: the layer, or the dial cluster below
    const add = (tag, attrs, text) => { const n = mk(tag, attrs, text); into.appendChild(n); return n; };
    const label = (cls, x, y, a, txt) => add('text', { class: cls, x, y, 'text-anchor': 'middle', transform: rot(a, x, y) }, txt);
    const put = (n, x, y, a, cls, anchor) => {
      if (!n) return;
      n.setAttribute('x', x); n.setAttribute('y', y);
      n.setAttribute('transform', a ? rot(a, x, y) : '');
      if (cls) n.setAttribute('class', cls);
      if (anchor) n.setAttribute('text-anchor', anchor);
      into.appendChild(n);
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
    // F1 25's own TV Pod camera shows the car's halo much lower than the broadcast frame the dial was measured on:
    // its top edge peaks at y = 440 here, about 9.5 right of the screen centre (measured on an in-game TV Pod
    // screenshot, 1911x1069). The dial cluster keeps its measured shape and moves as one group (HX, DROP) so its
    // top sits just under the halo's top edge, over the top bar, as on the broadcast; the arc and the side
    // sections (TURN + positions, ACTIVE AERO + gears) are laid along the game's halo itself.
    const HX = 9.5, DROP = 137;
    const cluster = mk('g', { transform: 'translate(' + HX + ' ' + DROP + ')' });
    const f1 = (v) => v.toFixed(1);
    // halo arc: the game halo's top edge (lifted 3 above it), symmetric over the halo centre 713.5
    const ARC = [[523.5, 459.3], [563.5, 451.4], [613.5, 444.8], [663.5, 441.1], [713.5, 439.9],
      [763.5, 441.1], [813.5, 444.8], [863.5, 451.4], [903.5, 459.3]];
    add('path', { class: 'rf-arc', d: smooth(ARC) });
    layer.appendChild(cluster);
    into = cluster;      // dial cluster: everything up to the battery is drawn in the cluster's own frame
    // closed path through corner points, each corner rounded with radius r (limited to half the shorter edge)
    const roundPoly = (pts, r) => pts.map((p, i) => {
      const toward = (q) => {
        const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, k = Math.min(r, l / 2) / l;
        return [p[0] + dx * k, p[1] + dy * k];
      };
      const s = toward(pts[(i + pts.length - 1) % pts.length]), e = toward(pts[(i + 1) % pts.length]);
      return (i ? 'L' : 'M') + f1(s[0]) + ' ' + f1(s[1]) + ' Q' + f1(p[0]) + ' ' + f1(p[1]) + ' ' + f1(e[0]) + ' ' + f1(e[1]);
    }).join(' ') + ' Z';
    // half-width of an ellipse (a, b) around C at height dy
    const halfW = (a, b, dy) => a * Math.sqrt(Math.max(0, 1 - (dy / b) ** 2));
    // Layout of the reference broadcast around the dial centre C (reference px), from the dial outwards on each
    // side: RECHARGE / DEPLOY frame hugging the dial -> brake / throttle bar column. The side sections further out
    // follow the halo and are drawn in the layer (see below).
    const inBox = (g, n, x, y, cls) => {
      if (!n) return;
      n.setAttribute('x', x); n.setAttribute('y', y); n.removeAttribute('transform');
      n.setAttribute('class', cls); n.setAttribute('text-anchor', 'middle'); n.setAttribute('dominant-baseline', 'central');
      g.appendChild(n);
    };
    // the side pieces span dy TOP..BOTTOM below/above the dial centre
    const TOP = -31, BOTTOM = 40;
    // RECHARGE (left) / DEPLOY (right): a band of even width hugging the dial (its inner edge follows the dial,
    // 3 off it), rounded ends, letters stacked upright down its middle
    const FRAME_W = 29;
    const dialEdge = (y) => halfW(70, 63, y);
    const crescent = (s, x0, w, top, bottom) => {
      const ys = [];
      for (let y = top; y < bottom; y += 6) ys.push(y);
      ys.push(bottom);
      const inner = ys.map((y) => [CX + s * (dialEdge(y) + x0), CY + y]);
      const outer = ys.map((y) => [CX + s * (dialEdge(y) + x0 + w), CY + y]).reverse();
      return roundPoly(inner.concat(outer), 7);
    };
    const stack = (s, txt) => [...txt].forEach((ch, i, all) => {
      const y = TOP + 6 + (BOTTOM - TOP - 12) * (i / (all.length - 1));
      add('text', { class: 'rf-vlbl', x: f1(CX + s * (dialEdge(y) + FRAME_W / 2)), y: f1(CY + y), 'text-anchor': 'middle', 'dominant-baseline': 'central' }, ch);
    });
    for (const [s, txt] of [[-1, 'RECHARGE'], [1, 'DEPLOY']]) {
      add('path', { class: 'rf-frame', d: crescent(s, 0, FRAME_W, TOP, BOTTOM) });
      stack(s, txt);
    }
    // brake (left) / throttle (right): a column of 11 level bars outside the frame, filled from the bottom, on a
    // dark plate. The overlay colours group.children[i] by value * children.length, so the 12 upstream bars are
    // replaced by 11 paths with the same class and data-active-color.
    const BARS = { top: TOP + 7, bottom: BOTTOM - 1, n: 11, fill: 0.62 };
    // inner edge follows the frame (4 off it), outer edge almost upright, leaning out a little towards the bottom
    const colInner = (y, pad) => dialEdge(y) + FRAME_W + 4 - pad;
    const colOuter = (y, pad) => 126 + pad + 3 * (y - BARS.top) / (BARS.bottom - BARS.top);
    for (const s of [-1, 1]) {
      const t = BARS.top - 4, b = BARS.bottom + 4;
      add('path', { class: 'rf-barplate', d: roundPoly([[colOuter(t, 3), t], [colInner(t, 2), t], [colInner(b, 2), b], [colOuter(b, 3), b]]
        .map(([x, y]) => [CX + s * x, CY + y]), 4) });
    }
    // labels under the bar columns, level, as on the broadcast
    label('rf-tag', f1(CX - 107), f1(CY + 53), 0, 'BRAKE');
    label('rf-tag g', f1(CX + 107), f1(CY + 53), 0, 'THROTTLE');
    const placeBars = (group, side) => {
      const old = [...group.children];
      const cls = (old[0] && old[0].getAttribute('class')) || 'seg-off', color = (old[0] && old[0].dataset.activeColor) || '';
      old.forEach((o) => o.remove());
      const { top, bottom, n } = BARS, pitch = (bottom - top) / (n - 1 + BARS.fill), h = pitch * BARS.fill;
      for (let i = 0; i < n; i++) {
        const y1 = bottom - i * pitch, y0 = y1 - h;
        const pts = [[colOuter(y0, 0), y0], [colInner(y0, 0), y0], [colInner(y1, 0), y1], [colOuter(y1, 0), y1]];
        const seg = mk('path', { class: cls, d: 'M' + pts.map(([x, y]) => f1(CX + side * x) + ' ' + f1(CY + y)).join(' L') + ' Z' });
        seg.dataset.activeColor = color;
        group.appendChild(seg);
      }
      into.appendChild(group);
    };
    if (keep.brakeBars) placeBars(keep.brakeBars, -1);
    if (keep.thrBars) placeBars(keep.thrBars, 1);
    // centre dial + battery
    add('ellipse', { class: 'plate', cx: CX, cy: CY, rx: 67, ry: 60 });
    add('ellipse', { class: 'ring', cx: CX, cy: CY, rx: 62, ry: 55 });
    put(keep.kmLbl, 705.5, 331, 0, 'rf-lbl sm', 'middle');
    put(keep.km, 704, 352, 0, 'rf-big', 'middle');
    for (let i = 0; i < 7; i++) {      // the "||||||| BOOST |||||||" grille; --i: 0 next to the word, 6 outermost
      add('path', { class: 'rf-tickmark', style: '--i:' + (6 - i), d: 'M' + f1(663 + i * 2.9) + ' 360 v8' });
      add('path', { class: 'rf-tickmark', style: '--i:' + (6 - i), d: 'M' + f1(743.5 - i * 2.9) + ' 360 v8' });
    }
    const pill = (g, x, y, w, h, fs) => {
      if (!g) return;
      const r = g.querySelector('rect'), t = g.querySelector('text');
      Object.entries({ x, y, width: w, height: h, rx: 1.5 }).forEach(([k, v]) => r.setAttribute(k, v));
      t.setAttribute('x', x + w / 2); t.setAttribute('y', y + h / 2); t.setAttribute('dominant-baseline', 'central');
      t.style.fontSize = fs + 'px';
      into.appendChild(g);
      // the broadcast prints just the name; the state is the pill's colour (keep distances such as "18 M")
      watch(t, () => { const s = t.textContent.replace(/\s+(READY|ON|OFF|EMPTY)$/, ''); if (s !== t.textContent) t.textContent = s; });
    };
    pill(keep.boost, 684, 360.5, 38.5, 7.5, 5.6);
    pill(keep.ot, 655, 370.5, 96, 9, 6.4);
    for (const [n, name] of [[keep.boost, 'boost'], [keep.ot, 'ot'], [keep.aeroPill, 'aero']]) {
      watch(n, () => layer.setAttribute('data-' + name, n.dataset.state || 'off'), ['data-state']);
    }
    put(keep.mph, 702.5, 398, 0, 'rf-mid', 'middle');
    label('rf-lbl sm', 702, 408, 0, 'MPH');
    const ers = mk('g', { transform: 'translate(676 416) scale(1.18 1.08) translate(-358 -146)' });
    for (const n of [keep.ersBg, keep.ersFill, keep.bolt]) if (n) ers.appendChild(n);
    // battery charge inside the gauge: the bolt moves to the left end, the % sits in the rest of the bar
    // (the overlay writes "ERS 72%"; only "72%" is shown)
    if (keep.bolt) keep.bolt.setAttribute('transform', 'translate(-15.5 0)');
    if (keep.ersText) {
      const t = keep.ersText;
      t.removeAttribute('style');
      Object.entries({ x: 387, y: 152.4, 'text-anchor': 'middle', 'dominant-baseline': 'central', class: 'rf-ers' })
        .forEach(([k, v]) => t.setAttribute(k, v));
      ers.appendChild(t);
      watch(t, () => { const s = t.textContent.replace(/^ERS\s+/, ''); if (s !== t.textContent) t.textContent = s; });
    }
    into.appendChild(ers);
    into = layer;
    // ---- side sections along the game's halo (layer frame), as on the broadcast: next to the brake column TURN and
    // then the positions (car ahead, viewed car), next to the throttle column ACTIVE AERO and then the gears over
    // the RPM bar. Each section is a band that follows the halo's top edge, and every text in it is turned to the
    // edge's slope where it sits (names run along the curve itself).
    // Halo top edge traced on the in-game TV Pod screenshot (layer units, x 394..1046), smoothed as a polynomial
    // in u = (x - 720) / 100 (max deviation 1.2).
    const HALO_EDGE = [439.469, 1.526, 6.963, -0.115, -0.362, 0.022, 0.031];
    const edgeY = (x) => { const u = (x - 720) / 100; return HALO_EDGE.reduce((sum, c, i) => sum + c * u ** i, 0); };
    const edgeSlope = (x) => { const u = (x - 720) / 100; return HALO_EDGE.reduce((sum, c, i) => sum + (i ? i * c * u ** (i - 1) : 0), 0) / 100; };
    // point v units under the edge at x (along the edge's normal) and the edge's angle there in degrees
    const along = (x, v) => {
      const m = edgeSlope(x), l = Math.hypot(1, m);
      return { x: x - v * m / l, y: edgeY(x) + v / l, a: Math.atan(m) * 180 / Math.PI };
    };
    // edge x whose point v under the edge has screen x = X (for a section end that stands upright)
    const xAt = (X, v) => { let x = X; for (let i = 0; i < 5; i++) x = X - (along(x, v).x - x); return x; };
    const run = (a, b, v) => {
      const n = Math.max(2, Math.round(Math.abs(b - a) / 12));
      return Array.from({ length: n + 1 }, (_, i) => along(a + (b - a) * i / n, v));
    };
    // band between v0 and v1 under the edge, from xIn (upright end at screen x xIn, or across the band) to xOut
    // (end across the band)
    const band = (xIn, xOut, v0, v1, upright) => {
      const t0 = upright ? xAt(xIn, v0) : xIn, b0 = upright ? xAt(xIn, v1) : xIn;
      return roundPoly(run(t0, xOut, v0).concat(run(xOut, b0, v1)).map((q) => [q.x, q.y]), 6);
    };
    // n points evenly spaced along the curve v under the edge, from edge x a to b (.total = its length)
    const spaced = (a, b, v, n) => {
      const fine = Array.from({ length: 81 }, (_, i) => along(a + (b - a) * i / 80, v));
      const cum = [0];
      for (let i = 1; i < fine.length; i++) cum.push(cum[i - 1] + Math.hypot(fine[i].x - fine[i - 1].x, fine[i].y - fine[i - 1].y));
      const total = cum[cum.length - 1];
      const pts = Array.from({ length: n }, (_, k) => {
        const d = n === 1 ? total / 2 : total * k / (n - 1);
        const i = Math.max(1, cum.findIndex((c) => c >= d - 1e-9));
        const t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1), p = fine[i - 1], q = fine[i];
        return { x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, a: p.a + (q.a - p.a) * t };
      });
      pts.total = total;
      return pts;
    };
    const curve = (a, b, v) => smooth(spaced(a, b, v, 9).map((q) => [+f1(q.x), +f1(q.y)]));
    // text at edge x, v under the edge, turned to the edge's slope there
    const onEdge = (cls, x, v, txt) => {
      const q = along(x, v), qx = f1(q.x), qy = f1(q.y);
      return add('text', { class: cls, x: qx, y: qy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
        transform: rot(q.a.toFixed(1), qx, qy) }, txt);
    };
    // group whose origin is at (x, v) and whose x axis runs along the edge
    const cell = (x, v) => {
      const q = along(x, v);
      return add('g', { transform: 'translate(' + f1(q.x) + ' ' + f1(q.y) + ') rotate(' + q.a.toFixed(1) + ')' });
    };
    const divider = (x, v0, v1) => {
      const a = along(x, v0), b = along(x, v1);
      add('path', { class: 'rf-divider', d: 'M' + f1(a.x) + ' ' + f1(a.y) + ' L' + f1(b.x) + ' ' + f1(b.y) });
    };
    // band depth under the edge: its top lines up with the bar columns' top, its bottom with their bottom
    const V0 = 30, V1 = 92, VMID = (V0 + V1) / 2;
    // inner ends stand upright, 7 off the bar columns (cluster frame -> layer: + HX)
    const colEdge = colOuter(BARS.top, 3) + 7;
    const L_IN = CX + HX - colEdge, R_IN = CX + HX + colEdge, L_OUT = 400, R_OUT = 1044;

    // left: TURN, then the positions
    add('path', { class: 'rf-panel', d: band(L_IN, L_OUT, V0, V1, true) });
    const L_DIV = 521;
    divider(L_DIV, V0 + 9, V1 - 9);
    const turnBox = cell((xAt(L_IN, VMID) + L_DIV) / 2, VMID);
    inBox(turnBox, keep.turn, 0, -9, 'rf-turn');
    const turnLbl = mk('text', { class: 'rf-lbl rf-paneltxt', x: 0, y: 14, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, 'TURN');
    turnBox.appendChild(turnLbl);
    if (keep.turn) keep.turn.style.removeProperty('font-size');      // upstream inline 22px would overflow the box
    watch(keep.turn, () => { keep.turn.style.visibility = /\d/.test(keep.turn.textContent) ? '' : 'hidden'; });
    // corner direction (curvas dir L / R, set as data-dir by the overlay): a bent arrow above the number, like a
    // road sign; the right-hand arrow is mirrored for a left turn. Without a direction the cell keeps its layout.
    const turnArrow = mk('g', { class: 'rf-turnarrow' });
    turnArrow.appendChild(mk('path', { class: 'stem', d: 'M-6 7 V1 Q-6 -4 -1 -4 H1' }));
    turnArrow.appendChild(mk('path', { class: 'head', d: 'M0 -9.5 L7.5 -4 L0 1.5 Z' }));
    turnBox.appendChild(turnArrow);
    if (keep.turn) watch(keep.turn, () => {
      const d = keep.turn.dataset.dir, on = d === 'L' || d === 'R';
      turnArrow.style.display = on ? '' : 'none';
      turnArrow.setAttribute('transform', 'translate(0 -16)' + (d === 'L' ? ' scale(-1 1)' : ''));
      keep.turn.setAttribute('y', on ? 5 : -9);
      turnLbl.setAttribute('y', on ? 22 : 14);
    }, ['data-dir']);
    // positions: car ahead (dim) above, the viewed car below in a band outlined in its team colour (--rf-team);
    // both written along the curve, squeezed only if a long name would not fit
    const N_IN = L_DIV - 6, N_OUT = L_OUT + 3;
    const meBand = add('path', { class: 'rf-band', d: band(N_IN, N_OUT, 62, 88, false) });
    let guides = 0;
    const nameLine = (v, cls, box) => {
      const id = 'rfName' + (guides++), a = N_OUT + 5, b = N_IN - 5;
      add('path', { id, class: 'rf-guide', d: curve(a, b, v) });
      const room = spaced(a, b, v, 2).total - 6;
      const t = add('text', { class: cls });
      const tp = mk('textPath', { href: '#' + id, startOffset: '50%', 'text-anchor': 'middle' });
      const pos = mk('tspan', { class: 'rf-pos' }), name = mk('tspan', { dx: 7 });
      tp.append(pos, name);
      t.appendChild(tp);
      return (c) => {
        const p = c ? String(c.pos) : '', n = c ? String(c.name || c.code || '').toUpperCase() : '';
        if (pos.textContent !== p || name.textContent !== n) {
          pos.textContent = p;
          name.textContent = n;
          tp.removeAttribute('textLength');
          tp.removeAttribute('lengthAdjust');
          // the halo is display:none until shown, where text has no length yet: estimate from the letters
          const fs = cls.includes('me') ? 15 : 13, len = t.getComputedTextLength() || (p.length + n.length + 1) * fs * 0.72;
          if (len > room) { tp.setAttribute('textLength', f1(room)); tp.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
        }
        if (box) box.style.display = n ? '' : 'none';
      };
    };
    // baselines: the names' centres sit at v 46 (ahead) and 75 (viewed car, middle of its band)
    const ahead = nameLine(51, 'rf-name dim');
    const mine = nameLine(80.5, 'rf-name me', meBand);

    // right: ACTIVE AERO, then the gears over the RPM bar
    add('path', { class: 'rf-panel', d: band(R_IN, R_OUT, V0, V1, true) });
    const R_DIV = 906;
    // the AERO cell lights up while active aero / DRS is available or open (CSS on .rf-aeropanel)
    add('path', { class: 'rf-aerocell rf-aeropanel', d: band(R_IN + 3, R_DIV - 3, V0 + 3, V1 - 3, true) });
    divider(R_DIV, V0 + 9, V1 - 9);
    const aeroBox = cell((xAt(R_IN, VMID) + R_DIV) / 2, VMID);
    aeroBox.classList.add('rf-aerobox');
    inBox(aeroBox, keep.aero1, -2, -13, 'rf-lbl rf-paneltxt');
    inBox(aeroBox, keep.aero2, -2, -2, 'rf-lbl rf-paneltxt');
    // two short level marks under the label, the lower one a little shorter, both left-aligned
    const aeroLines = [[-16, 6, 11], [-16, 0, 18]].map(([a, b, y]) => {
      const q = mk('path', { class: 'rf-aero', d: 'M' + a + ' ' + y + ' L' + b + ' ' + y });
      aeroBox.appendChild(q);
      return q;
    });
    watch(keep.aeroPill, () => aeroLines.forEach((q) => q.setAttribute('data-state', keep.aeroPill.dataset.state || 'off')), ['data-state']);
    const G_IN = R_DIV + 9, G_OUT = R_OUT - 6;
    const rpmPath = curve(G_IN, G_OUT, 66);
    add('path', { class: 'rf-rpmbg', d: rpmPath, pathLength: 100 });
    const rpmFill = add('path', { class: 'rf-rpmfill', d: rpmPath, pathLength: 100, 'stroke-dasharray': '0 100' });
    // bar ends: 0 under its start, the car's max RPM from telemetry under its end (car status packet, upstream
    // default 13000 until it arrives)
    onEdge('rf-tick', G_IN + 2, 77, '0');
    const rpmEnd = onEdge('rf-tick', G_OUT - 2, 77, '13');
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
    // gear digits evenly along the curve above the RPM bar, each turned to the slope where it sits
    if (keep.gears) {
      const digits = [...keep.gears.children], at = spaced(G_IN + 4, G_OUT - 4, 52, digits.length);
      digits.forEach((t, i) => {
        const q = at[i], x = f1(q.x), y = f1(q.y);
        t.setAttribute('x', x); t.setAttribute('y', y);
        t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'central');
        t.setAttribute('transform', rot(q.a.toFixed(1), x, y));
      });
      layer.appendChild(keep.gears);
    }
    onEdge('rf-lbl', 1004, 38, 'GEARS');
    onEdge('rf-lbl', (G_IN + G_OUT) / 2, 80, 'RPM x1000');
    const TEAM_COLOR = { 0: '#27f4d2', 1: '#e8002d', 2: '#3671c6', 3: '#64c4ff', 4: '#229971', 5: '#ff87bc', 6: '#6692ff',
      7: '#b6babd', 8: '#ff8000', 9: '#52e252', 229: '#52e252', 230: '#c8ccd0' };
    const teamColor = (c) => (c && (c.color || TEAM_COLOR[c.team] || TEAM_COLOR[c.team - 220])) || '';
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
        // team colour of the viewed car: name band and RPM bar
        const tc = teamColor(me);
        if (tc && layer.style.getPropertyValue('--rf-team') !== tc) layer.style.setProperty('--rf-team', tc);
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
    // each team image is fitted inside the team cell's content box (body.has-team-logos sets that box), so
    // square marks and wide ones (Audi rings, Aston Martin wings) both keep their shape
    let css = '';
    for (const [team, ids] of Object.entries(TEAMS)) {
      const f = ['svg', 'png', 'webp'].map((e) => 'teams/' + team + '.' + e).find(has);
      if (!f) continue;
      for (const id of ids) {
        css += '.row .team[data-team="' + id + '"]{font-size:0;background:url("/local-assets/' + f
          + '") center/contain no-repeat content-box}.row .team[data-team="' + id + '"] svg{display:none}';
      }
    }
    if (css) document.body.classList.add('has-team-logos');
    if (css) {
      const st = document.createElement('style');
      st.textContent = css;
      document.head.appendChild(st);
    }
  }).catch(() => {});
})();
