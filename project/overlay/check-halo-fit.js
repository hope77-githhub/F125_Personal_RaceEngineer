// Checks the halo auto-fit (halo-fit.js) on synthetic TV Pod frames: a dark halo bar shaped like the game's,
// at different positions and sizes, with distractors (a flat UI panel, dark tyres, cockpit, noise).
'use strict';
const assert = require('assert');
const { fitHalo, hudApex, HUD } = require('./halo-fit');

const A4 = 5.8e-4, B4 = 1.667e-9;              // halo top edge in layer units: dy = A4 dx^2 + B4 dx^4
function frame(W, H, { dx = 0, dy = 0, size = 1, panel = true, cover = false, seed = 7 } = {}) {
  const data = new Uint8ClampedArray(W * H * 4);
  const base = hudApex(W, H), k = base.k * size, x0 = base.x + dx, y0 = base.y + dy;
  let r = seed;
  const noise = () => { r = (r * 1103515245 + 12345) >>> 0; return ((r >>> 16) % 21) - 10; };
  const edge = (x) => { const d = (x - x0) / k; return y0 + k * (A4 * d * d + B4 * d ** 4); };
  const bar = 30 * k;                             // halo bar thickness
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let v = y < H * 0.45 ? 175 - (y / H) * 60 : 125;          // sky, then road
      if (panel && x > W * 0.3 && x < W * 0.7 && y > H * 0.2 && y < H * 0.52) v = 45;   // flat UI panel
      const d = Math.abs(x - x0) / k;
      if (d > 300 && d < 420 && y > edge(x) - 60 * k && y < H * 0.95) v = 30;       // front tyres beside the legs
      if (d < 340 && y >= edge(x)) v = y < edge(x) + bar ? 22 : 62;                 // halo bar, cockpit below
      if (cover && x > x0 - 170 * k && x < x0 - 20 * k && y > y0 - 80 * k && y < y0 + 60 * k) v = 200;  // a menu over the halo
      const i = (y * W + x) * 4, n = v + noise();
      data[i] = data[i + 1] = data[i + 2] = n; data[i + 3] = 255;
    }
  }
  return { data, width: W, height: H, apex: { x: x0, y: y0 } };
}

function check(name, W, H, opts) {
  const cap = frame(W, H, opts);
  const res = fitHalo(cap, { width: W, height: H });
  assert(res.ok, name + ': not found (' + res.reason + ')');
  assert(Math.abs(res.apex.x - cap.apex.x) <= W * 0.004, name + ': apex x ' + res.apex.x.toFixed(1) + ' vs ' + cap.apex.x.toFixed(1));
  assert(Math.abs(res.apex.y - cap.apex.y) <= H * 0.006, name + ': apex y ' + res.apex.y.toFixed(1) + ' vs ' + cap.apex.y.toFixed(1));
  assert(Math.abs(res.scale - (opts.size || 1)) <= 0.06, name + ': size ' + res.scale.toFixed(3) + ' vs ' + (opts.size || 1));
  // the CSS transform with this layout must put the HUD's halo apex on the detected apex
  const A = hudApex(W, H), O = { x: HUD.originX * W, y: HUD.originY * H };
  const T = { x: (res.layout.x - HUD.homeX) / 100 * W, y: (res.layout.y - HUD.homeY) / 100 * H };
  const px = O.x + res.layout.scale * (A.x - O.x) + T.x, py = O.y + res.layout.scale * (A.y - O.y) + T.y;
  assert(Math.abs(px - res.apex.x) < 2 && Math.abs(py - res.apex.y) < 2, name + ': layout does not land on the apex');
  console.log(name.padEnd(28), 'apex', res.apex.x.toFixed(0) + ',' + res.apex.y.toFixed(0), 'size', res.scale.toFixed(3),
    'layout', JSON.stringify(res.layout));
}

check('measured TV Pod, 1080p', 1920, 1080, {});
check('lower + right, bigger', 1920, 1080, { dx: 40, dy: 60, size: 1.15 });
check('higher + left, smaller', 2560, 1440, { dx: -50, dy: -70, size: 0.85 });
check('ultrawide 21:9', 2560, 1080, { dx: 10, dy: 20, size: 1.05 });
const empty = fitHalo(frame(1920, 1080, { size: 1, dx: 0, dy: 900 }), { width: 1920, height: 1080 });
assert(!empty.ok, 'found a halo where there is none');
console.log('no halo on screen'.padEnd(28), '->', empty.reason);
const covered = fitHalo(frame(1920, 1080, { cover: true }), { width: 1920, height: 1080 });
assert(!covered.ok, 'fitted a halo half covered by a menu');
console.log('halo half covered by a menu'.padEnd(28), '->', covered.reason, '(nothing is changed)');
console.log('Halo auto-fit finds the halo position and size and turns them into a halo layout.');
