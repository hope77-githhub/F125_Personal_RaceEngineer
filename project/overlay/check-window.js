// Checks main.js start-up without opening a window on screen.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const shortcuts = [];
const intervals = [];
const events = {};
let loadedUrl = '';
const calls = { moveTop: 0, onTop: [], showInactive: 0 };
let minimized = false;
class Window {
  setAlwaysOnTop(flag, level) { calls.onTop.push([flag, level]); }
  setIgnoreMouseEvents() {}
  setFocusable() {}
  focus() {}
  blur() {}
  loadURL(url) { loadedUrl = url; }
  once(event, callback) { callback(); }
  on(event, callback) { events[event] = callback; }
  showInactive() { calls.showInactive++; minimized = false; }
  moveTop() { calls.moveTop++; }
  isDestroyed() { return false; }
  isMinimized() { return minimized; }
  isVisible() { return !minimized; }
}
const electron = {
  app: { whenReady: () => ({ then: callback => callback() }), on() {} },
  BrowserWindow: Window,
  screen: { getPrimaryDisplay: () => ({ bounds: { x: 0, y: 0, width: 1920, height: 1080 } }) },
  globalShortcut: { register: key => { shortcuts.push(key); return true; }, unregisterAll() {} },
};
const source = fs.readFileSync(path.join(__dirname, 'janela', 'main.js'), 'utf8');
vm.runInNewContext(source, { require: name => name === 'electron' ? electron : require(name),
  process, Buffer, console, URL, setTimeout: () => 0, setInterval: (fn, ms) => { intervals.push([fn, ms]); return 0; } });
assert.strictEqual(loadedUrl, 'http://127.0.0.1:8080/');
assert(shortcuts.length >= 9 && shortcuts.includes('Control+Alt+H') && shortcuts.includes('Control+Shift+H') && shortcuts.includes('Control+Alt+E'));
console.log('Window starts and registers the hotkeys (whole HUD has 3 alternatives).');

// stays above the game: a short repeating timer re-raises it, and a minimise brings it straight back
const raise = intervals.find(([, ms]) => ms <= 1000 && ms !== 400);
assert(raise, 'no keep-on-top timer');
const before = calls.moveTop;
raise[0](); raise[0]();
assert.strictEqual(calls.moveTop, before + 2);
assert.deepStrictEqual(calls.onTop[calls.onTop.length - 1], [true, 'screen-saver']);
minimized = true; events.minimize();
assert.strictEqual(minimized, false, 'minimised window not restored');
assert(typeof events.blur === 'function');
console.log('Window re-raises itself above the game every ' + raise[1] + ' ms and after a minimise or blur.');
