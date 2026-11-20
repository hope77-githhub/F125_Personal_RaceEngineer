// Transparent, frameless, always-on-top, click-through window (never takes the mouse or keyboard).
// Shows OVERLAY_URL (default http://127.0.0.1:8080/; F1 AI Race Engineer uses :8090). The server must be running.
// The game must run in "Windowed (Fullscreen)" / borderless mode for the overlay to appear on top
// (an exclusive-fullscreen game cannot be drawn over by any window).
const { app, BrowserWindow, screen, globalShortcut } = require('electron');
const http = require('http');

const overlayUrl = process.env.OVERLAY_URL || 'http://127.0.0.1:8080/';
const apiUrl = new URL('/api/ui', overlayUrl);

let setEditMode = () => {};
function send(action) {
  const body = JSON.stringify(action);
  const req = http.request(apiUrl, { method: 'POST', headers: {
    'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)
  } }, res => res.resume());
  req.on('error', err => console.error('Hotkey: server not reachable:', err.message));
  req.end(body);
}

// Edit mode: the window stops being click-through (mouse and focus) while ui.edit is on.
// It polls the server, so the /control page button turns the mode on too.
function pollUi() {
  http.get(apiUrl, res => {
    let body = '';
    res.on('data', c => { body += c; });
    res.on('end', () => { try { setEditMode(!!JSON.parse(body).edit); } catch (_) {} });
  }).on('error', () => {});
}

app.whenReady().then(() => {
  const { bounds } = screen.getPrimaryDisplay();
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
  ]) {
    for (const shortcut of shortcuts) {
      let ok = false;
      try { ok = globalShortcut.register(shortcut, () => { console.log('Hotkey', shortcut); send(action); }); } catch (_) {}
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
