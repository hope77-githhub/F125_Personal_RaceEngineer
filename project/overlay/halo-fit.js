// Halo auto-fit: finds the car's halo in a screen capture of F1 25's TV Pod camera and works out where the halo
// HUD has to go, as a halo-layout profile { x, y, scale } for POST /api/halo-layout.
// Pure functions, no dependencies. janela/main.js captures the screen and calls fitHalo(); check-halo-fit.js
// tests it on synthetic frames.
//
// How: the halo's top bar is the long dark arc across the lower middle of the TV Pod view. In every column of the
// lower-middle screen the bright-to-dark edges are collected; RANSAC keeps the upward-opening parabola that most
// columns agree on (UI lines are flat, tyres and cockpit parts are short). Its apex gives the position; its
// curvature near the apex, compared with the halo the HUD was measured on, gives the size.
'use strict';

// Halo HUD geometry in theme-broadcast.js (keep in sync): 1247x702 frame, the layer shifted by 1247/2 - 704, CSS
// scaling the HUD around 50.8% / 76.5% of the screen. apexX/apexY/curv are the halo this detector finds on the
// in-game TV Pod screenshot the HUD was fitted to (layer units): its parabola apex and its coefficient over
// |dx| <= 200 — so that screen gives exactly the uncalibrated layout (58, 58, 1).
const HUD = {
  w: 1247, h: 702, shift: 1247 / 2 - 704, apexX: 707.9, apexY: 440.9,
  originX: 0.508, originY: 0.765, curv: 6.30e-4, span: 200, homeX: 58, homeY: 58,
};
const LIMITS = { x: [10, 90], y: [10, 85], scale: [0.5, 2] };   // what /api/halo-layout accepts
const SIZE_RANGE = [0.75, 1.4];                                 // accepted halo size vs the measured one

// screen position of the HUD's halo apex with no calibration, in a w x h view
function hudApex(w, h) {
  const k = Math.min(w / HUD.w, h / HUD.h);
  return { k, x: (w - HUD.w * k) / 2 + (HUD.apexX + HUD.shift) * k, y: (h - HUD.h * k) / 2 + HUD.apexY * k };
}

// BGRA bitmap (Electron NativeImage.toBitmap() on Windows) -> grayscale, box-downscaled to about `target` px wide
function toGray(data, width, height, target = 640) {
  const step = Math.max(1, Math.round(width / target));
  const w = Math.floor(width / step), h = Math.floor(height / step);
  const g = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let dy = 0; dy < step; dy++) {
        let i = ((y * step + dy) * width + x * step) * 4;
        for (let dx = 0; dx < step; dx++, i += 4) sum += 0.114 * data[i] + 0.587 * data[i + 1] + 0.299 * data[i + 2];
      }
      g[y * w + x] = sum / (step * step);
    }
  }
  return { g, w, h, step };
}

// bright-to-dark edges per column: { x, ys: [y, ...] } (strongest few per column)
function edgeCandidates({ g, w, h }) {
  const above = Math.max(2, Math.round(h * 0.008)), below = Math.max(4, Math.round(h * 0.03));
  const xa = Math.round(w * 0.2), xb = Math.round(w * 0.8);
  const ya = Math.round(h * 0.38), yb = Math.round(h * 0.93) - below;
  const cols = [];
  const col = new Float32Array(h + 1);
  for (let x = Math.max(1, xa); x <= Math.min(w - 2, xb); x++) {
    col[0] = 0;   // prefix sums of the column, lightly smoothed across 3 columns
    for (let y = 0; y < h; y++) col[y + 1] = col[y] + (g[y * w + x - 1] + g[y * w + x] + g[y * w + x + 1]) / 3;
    const mean = (a, b) => (col[b] - col[a]) / (b - a);
    const steps = [];
    for (let y = ya; y < yb; y++) {
      const up = mean(y - above, y), down = mean(y + 1, y + 1 + below);
      steps.push([y, up - down, down]);
    }
    const ys = [];
    for (let i = 1; i < steps.length - 1; i++) {
      const [y, s, down] = steps[i];
      if (s > 20 && down < 80 && s >= steps[i - 1][1] && s > steps[i + 1][1]) ys.push([y, s]);
    }
    ys.sort((a, b) => b[1] - a[1]);
    if (ys.length) cols.push({ x, ys: ys.slice(0, 5).map((p) => p[0]) });
  }
  return cols;
}

// least-squares parabola y = p u^2 + q u + r with u = x - cx (cx keeps the numbers small)
function fitParabola(pts, cx) {
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, t0 = 0, t1 = 0, t2 = 0;
  for (const [x, y] of pts) {
    const u = x - cx, u2 = u * u;
    s0++; s1 += u; s2 += u2; s3 += u2 * u; s4 += u2 * u2; t0 += y; t1 += y * u; t2 += y * u2;
  }
  // [s4 s3 s2; s3 s2 s1; s2 s1 s0] [p q r]' = [t2 t1 t0]'
  const m = [[s4, s3, s2, t2], [s3, s2, s1, t1], [s2, s1, s0, t0]];
  for (let i = 0; i < 3; i++) {
    let piv = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(m[r][i]) > Math.abs(m[piv][i])) piv = r;
    [m[i], m[piv]] = [m[piv], m[i]];
    if (Math.abs(m[i][i]) < 1e-12) return null;
    for (let r = 0; r < 3; r++) {
      if (r === i) continue;
      const f = m[r][i] / m[i][i];
      for (let c = i; c < 4; c++) m[r][c] -= f * m[i][c];
    }
  }
  const p = m[0][3] / m[0][0], q = m[1][3] / m[1][1], r = m[2][3] / m[2][2];
  return { p, q, r, cx, apexX: cx - q / (2 * p), apexY: r - (q * q) / (4 * p), at: (x) => p * (x - cx) ** 2 + q * (x - cx) + r };
}

// for each column, the candidate closest to the curve when it is within tol: [[x, y], ...]
function inliersOf(cols, model, tol) {
  const out = [];
  for (const { x, ys } of cols) {
    const yc = model.at(x);
    let best = null;
    for (const y of ys) if (Math.abs(y - yc) <= tol && (best === null || Math.abs(y - yc) < Math.abs(best - yc))) best = y;
    if (best !== null) out.push([x, best]);
  }
  return out;
}

// Find the halo's top edge in a grayscale image. Returns { x, y, scale, coverage } in gray px, or null.
function findHaloEdge(gray, { seed = 12345, iterations = 2500 } = {}) {
  const { w, h } = gray;
  const cols = edgeCandidates(gray);
  if (cols.length < w * 0.2) return null;
  const k = Math.min(w / HUD.w, h / HUD.h);
  const pFor = (size) => HUD.curv / (k * size);              // expected parabola coefficient for a halo size
  const pMin = pFor(SIZE_RANGE[1] * 1.15), pMax = pFor(SIZE_RANGE[0]) * 1.5;
  const tol = Math.max(1.5, h * 0.006), cx = w / 2;
  let rnd = seed >>> 0;
  const rand = (n) => { rnd = (rnd * 1664525 + 1013904223) >>> 0; return rnd % n; };
  let best = null;
  for (let it = 0; it < iterations; it++) {
    const a = cols[rand(cols.length)], b = cols[rand(cols.length)], c = cols[rand(cols.length)];
    const xs = [a.x, b.x, c.x].sort((m, n) => m - n);
    if (xs[1] - xs[0] < w * 0.06 || xs[2] - xs[1] < w * 0.06) continue;
    const model = fitParabola([[a.x, a.ys[rand(a.ys.length)]], [b.x, b.ys[rand(b.ys.length)]], [c.x, c.ys[rand(c.ys.length)]]], cx);
    if (!model || model.p < pMin || model.p > pMax) continue;
    if (model.apexX < w * 0.35 || model.apexX > w * 0.65 || model.apexY < h * 0.42 || model.apexY > h * 0.9) continue;
    const inl = inliersOf(cols, model, tol);
    const left = inl.filter(([x]) => x < model.apexX).length, right = inl.length - left;
    const score = inl.length - Math.abs(left - right) * 0.5;
    if (!best || score > best.score) best = { score, model, inl };
  }
  if (!best) return null;
  // refine on the stretch near the apex the size estimate refers to (|dx| <= HUD.span at the halo's size)
  let model = fitParabola(best.inl, cx), size = 1, used = best.inl;
  for (let i = 0; i < 4 && model && model.p > 0; i++) {
    size = HUD.curv / (k * model.p);
    const span = HUD.span * k * size;
    used = inliersOf(cols, model, tol).filter(([x]) => Math.abs(x - model.apexX) <= span);
    if (used.length < 8) return null;
    model = fitParabola(used, cx);
  }
  if (!model || model.p <= 0) return null;
  size = HUD.curv / (k * model.p);
  const span = HUD.span * k * size;
  const inSpan = cols.filter(({ x }) => Math.abs(x - model.apexX) <= span);
  const inSpanCount = Math.max(1, Math.round(2 * span));
  const leftHit = used.filter(([x]) => x < model.apexX).length, rightHit = used.length - leftHit;
  const coverage = used.length / inSpanCount;
  const sideCoverage = Math.min(leftHit, rightHit) / Math.max(1, inSpanCount / 2);
  // a clear view of the halo puts nearly every column near the apex on the curve (1.0 on the reference and the
  // synthetic frames); a menu or HUD over the halo leaves gaps (0.67 / 0.54 with the pause menu open)
  if (inSpan.length === 0 || coverage < 0.85 || sideCoverage < 0.75) return null;
  if (size < SIZE_RANGE[0] || size > SIZE_RANGE[1]) return null;
  return { x: model.apexX, y: model.apexY, scale: size, coverage, sideCoverage };
}

// Capture { data: BGRA bitmap, width, height } of the screen the overlay covers; view = that screen's size in CSS px.
// hudScale = the overall halo size set in /control (the profile's scale is multiplied by it).
// Returns { ok: true, layout: { x, y, scale }, apex, scale } or { ok: false, reason }.
function fitHalo(capture, view, { hudScale = 1 } = {}) {
  const gray = toGray(capture.data, capture.width, capture.height);
  const found = findHaloEdge(gray);
  if (!found) return { ok: false, reason: 'halo not found' };
  const D = { x: (found.x + 0.5) * gray.step * (view.width / capture.width), y: (found.y + 0.5) * gray.step * (view.height / capture.height) };
  const S = found.scale;
  const A = hudApex(view.width, view.height);
  const O = { x: HUD.originX * view.width, y: HUD.originY * view.height };
  // the HUD is drawn at O + S (p - O) + T; put its halo apex A on the detected apex D
  const T = { x: D.x - O.x - S * (A.x - O.x), y: D.y - O.y - S * (A.y - O.y) };
  const layout = {
    x: Math.round((HUD.homeX + (T.x / view.width) * 100) * 100) / 100,
    y: Math.round((HUD.homeY + (T.y / view.height) * 100) * 100) / 100,
    scale: Math.round((S / (hudScale || 1)) * 1000) / 1000,
  };
  for (const [key, [lo, hi]] of Object.entries(LIMITS)) {
    if (!(layout[key] >= lo && layout[key] <= hi)) return { ok: false, reason: 'halo position out of range', layout };
  }
  return { ok: true, layout, apex: D, scale: S, coverage: found.coverage };
}

module.exports = { fitHalo, findHaloEdge, toGray, hudApex, HUD };
