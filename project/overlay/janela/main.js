// Transparent, frameless, always-on-top, click-through window (never takes the mouse or keyboard).
// Shows OVERLAY_URL (default http://127.0.0.1:8080/; F1 AI Race Engineer uses :8090). The server must be running.
// The game must run in "Windowed (Fullscreen)" / borderless mode for the overlay to appear on top
// (an exclusive-fullscreen game cannot be drawn over by any window).
const { app, BrowserWindow, screen, globalShortcut, desktopCapturer } = require('electron');
const http = require('http');
const path = require('path');

const overlayUrl = process.env.OVERLAY_URL || 'http://127.0.0.1:8080/';
const apiUrl = new URL('/api/ui', overlayUrl);
let haloFit = null;   // halo auto-fit (../halo-fit.js); without it the hotkey just says it is unavailable
try { haloFit = require(path.join(__dirname, '..', 'halo-fit.js')); } catch (_) {}

let setEditMode = () => {};
let requestAutofit = () => {};
function post(pathname, action) {
  const body = JSON.stringify(action);
  const req = http.request(new URL(pathname, overlayUrl), { method: 'POST', headers: {
    'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)
  } }, res => res.resume());
  req.on('error', err => console.error('Overlay server not reachable:', err.message));
  req.end(body);
}
const send = (action) => post('/api/ui', action);
function getJson(pathname) {
  return new Promise((resolve, reject) => {
    http.get(new URL(pathname, overlayUrl), res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

// Edit mode: the window stops being click-through (mouse and focus) while ui.edit is on.
// It polls the server, so the /control page button turns the mode on too; the same poll picks up the
// /control "Auto-fit" button (ui.autofit is a request counter).
let lastAutofit = null;
function pollUi() {
  http.get(apiUrl, res => {
    let body = '';
    res.on('data', c => { body += c; });
    res.on('end', () => {
      try {
        const ui = JSON.parse(body);
        setEditMode(!!ui.edit);
        const n = Number(ui.autofit) || 0;
        if (lastAutofit !== null && n > lastAutofit) requestAutofit();
        lastAutofit = n;
      } catch (_) {}
    });
  }).on('error', () => {});
}

app.whenReady().then(() => {
  const display = screen.getPrimaryDisplay();
  const { bounds } = display;
  const win = new BrowserWindow({
    x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
    transparent: true, frame: false, resizable: false, movable: false, hasShadow: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, show: false,
    webPreferences: { backgroundThrottling: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true);
  let editing = false;
  setEditMode = (on) => {
    if (on === editing) return;
    editing = on;
    win.setIgnoreMouseEvents(!on);
    win.setFocusable(on);
    win.setAlwaysOnTop(true, 'screen-saver');
    if (on) win.focus(); else win.blur();
    console.log('Edit mode:', on ? 'ON (mouse active)' : 'off (click-through)');
  };
  setInterval(pollUi, 400);
  win.loadURL(overlayUrl);
  // Stay above the game. A borderless-fullscreen game puts its own window back on top whenever it is activated
  // (Alt+Tab back into it), which pushed this window behind it when it was raised only once at start. While the
  // overlay runs it takes the top of the always-on-top band again every half second, after a minimise
  // (Win+D / show desktop) and on blur — never taking focus, so the game keeps the keyboard and mouse.
  let shown = false;
  const keepOnTop = () => {
    if (!shown || win.isDestroyed()) return;
    if (win.isMinimized() || !win.isVisible()) win.showInactive();
    win.setAlwaysOnTop(true, 'screen-saver', 1);
    win.moveTop();
  };
  win.once('ready-to-show', () => { win.showInactive(); shown = true; keepOnTop(); });
  win.on('minimize', keepOnTop);
  win.on('blur', keepOnTop);
  setInterval(keepOnTop, 500);

  // ---- Halo auto-fit: capture the screen (our own HUD hidden for a moment), find the car's halo
  // (halo-fit.js) and save where the halo HUD goes for the current car's team. Runs on Ctrl+Alt+A, on the
  // /control button, and by itself the first time you drive a team that has no halo profile yet.
  let fitting = false;
  const autoFitHalo = async ({ auto = false } = {}) => {
    if (!haloFit) { if (!auto) send({ toast: 'HALO AUTO-FIT: not available' }); return false; }
    if (fitting || win.isDestroyed()) return false;
    fitting = true;
    const opacity = win.getOpacity();
    try {
      const state = await getJson('/state');
      const { width, height } = display.bounds, sf = display.scaleFactor || 1;
      win.setOpacity(0);
      await new Promise(r => setTimeout(r, 250));
      const sources = await desktopCapturer.getSources({ types: ['screen'],
        thumbnailSize: { width: Math.round(width * sf), height: Math.round(height * sf) } });
      win.setOpacity(opacity);
      const src = sources.find(s => String(s.display_id) === String(display.id)) || sources[0];
      if (!src || src.thumbnail.isEmpty()) throw new Error('no screen image');
      const size = src.thumbnail.getSize();
      const res = haloFit.fitHalo({ data: src.thumbnail.toBitmap(), width: size.width, height: size.height },
        { width, height }, { hudScale: (state.hudScales && state.hudScales.halo) || 1 });
      console.log('Halo auto-fit' + (auto ? ' (auto)' : '') + ':', JSON.stringify(res));
      if (!res.ok) {
        if (!auto) send({ toast: 'HALO AUTO-FIT: halo not found - drive with the halo in clear view, then Ctrl+Alt+A' });
        return false;
      }
      post('/api/halo-layout', { team: 'current', x: res.layout.x, y: res.layout.y, scale: res.layout.scale });
      send({ toast: 'HALO FITTED TO YOUR CAR' + (auto ? ' (AUTO)' : '') + ' | Ctrl+Alt+A to redo' });
      return true;
    } catch (e) {
      console.warn('Halo auto-fit failed:', e.message);
      if (!auto) send({ toast: 'HALO AUTO-FIT: could not capture the screen' });
      return false;
    } finally {
      if (!win.isDestroyed()) win.setOpacity(opacity);
      fitting = false;
    }
  };
  requestAutofit = () => { autoFitHalo(); };
  // automatic: while you drive (halo HUD on, 80+ km/h for two polls) a team without its own halo profile is
  // fitted once; a failed try (halo hidden, other camera) is retried at most 3 times, 20 s apart
  const tried = new Map();
  let driving = 0;
  setInterval(async () => {
    if (!haloFit || fitting) return;
    let s;
    try { s = await getJson('/state'); } catch (_) { return; }
    const car = s.cars && s.cars[s.viewCar ?? s.player];
    const team = car ? String(car.team) : '';
    const live = s.connected && !s.paused && s.ui && s.ui.all && s.ui.halo && !s.ui.edit && s.car && s.car.speed >= 80;
    driving = live ? driving + 1 : 0;
    if (driving < 2 || !team || team === '255' || (s.haloLayouts && s.haloLayouts[team])) return;
    const t = tried.get(team) || { n: 0, at: 0 };
    if (t.n >= 3 || Date.now() - t.at < 20000) return;
    tried.set(team, { n: t.n + 1, at: Date.now() });
    await autoFitHalo({ auto: true });
  }, 1500);

  // Each action has more than one hotkey: if one is taken by another program, the other still works.
  const registered = [], failed = [];
  for (const [shortcuts, action] of [
    [['Control+Alt+H', 'Control+Shift+H', 'Control+Alt+F10'], { toggle: 'all' }],
    [['Control+Alt+T'], { toggle: 'tower' }],
    [['Control+Alt+F'], { toggle: 'flags' }],
    [['Control+Alt+V'], { toggle: 'fastest' }],
    [['Control+Alt+L'], { toggle: 'lap' }],
    [['Control+Alt+O'], { toggle: 'onboard' }],
    [['Control+Alt+G'], { toggle: 'halo' }],
    [['Control+Alt+M'], { cycleMode: true }],
    [['Control+Alt+K'], { toggle: 'cards' }],
    [['Control+Alt+E', 'Control+Shift+E'], { toggle: 'edit' }],
    [['Control+Alt+A', 'Control+Alt+F9'], () => autoFitHalo()],
  ]) {
    for (const shortcut of shortcuts) {
      let ok = false;
      try {
        ok = globalShortcut.register(shortcut, () => {
          console.log('Hotkey', shortcut);
          if (typeof action === 'function') action(); else send(action);
        });
      } catch (_) {}
      (ok ? registered : failed).push(shortcut);
    }
  }
  console.log('Hotkeys registered:', registered.join(', '));
  if (failed.length) console.warn('Hotkeys unavailable (used by another program):', failed.join(', '));
  // Short on-screen notice so you know whether the hotkeys were registered.
  setTimeout(() => send({ toast: failed.length
    ? 'HOTKEY TAKEN: ' + failed.join(' ') + ' | HUD: Ctrl+Shift+H'
    : 'HOTKEYS OK | HUD: Ctrl+Alt+H or Ctrl+Shift+H' }), 2500);
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
