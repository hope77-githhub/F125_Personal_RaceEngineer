// Checks parsing of real recorded packets without opening a network port.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { state, handlePacket, updateUi } = require('./server');
const dir = path.join(__dirname, 'dump');
if (!fs.existsSync(dir)) { console.error('No dump/ folder: record real packets first with diagnose.bat (node server.js --dump).'); process.exit(1); }
const files = fs.readdirSync(dir).filter(x => /^id\d+-(size|tam)\d+\.bin$/.test(x));
const sessionDump = ['id1-size926.bin', 'id1-tam926.bin'].map(f => path.join(dir, f)).find(f => fs.existsSync(f));
for (const file of files) handlePacket(fs.readFileSync(path.join(dir, file)));
for (const id of [1, 2, 4, 6, 7, 11, 16]) assert.strictEqual(state.dbg.parsed[id], true, `packet ${id} rejected`);
assert.strictEqual(state.format, 2026);
assert.strictEqual(state.numActive, 22);
assert.strictEqual(state.player, 21);
assert.strictEqual(state.cars[21].name, 'HADJAR');
assert.strictEqual(state.cars[21].code, 'HAD');
assert.strictEqual(state.cars[0].name, 'HAMILTON');
assert.strictEqual(state.cars[0].code, 'HAM');
assert.strictEqual(state.cars[5].lastLap, 94483);
assert.strictEqual(state.cars[5].bestLap, 94483);
assert.strictEqual(state.best.lap, 94483);
assert.strictEqual(state.cars[5].pos, 1);
assert.strictEqual(state.sessionType, 5);
assert.strictEqual(state.isSprintRace, false);
assert.strictEqual(state.sessionTimeLeft, 495);
assert.strictEqual(state.ers.store, 4000000);
const sprintSession = Buffer.from(fs.readFileSync(sessionDump));
sprintSession[35] = 15;
sprintSession[732] = 5;
sprintSession.set([10, 11, 12, 15, 16], 733);
handlePacket(sprintSession);
assert.strictEqual(state.isSprintRace, true);
sprintSession[35] = 16;
handlePacket(sprintSession);
assert.strictEqual(state.isSprintRace, false);
for (const page of ['overlay.html', 'control.html']) {
  const html = fs.readFileSync(path.join(__dirname, page), 'utf8');
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  assert(match, `script ausente em ${page}`);
  new vm.Script(match[1], { filename: page });
}
assert.strictEqual(updateUi({ toggle: 'all' }), true);
assert.strictEqual(state.ui.all, false);
assert.strictEqual(updateUi({ cycleMode: true }), true);
assert.strictEqual(state.ui.mode, 'quali');
console.log('2026 dump read: 22 drivers, Q1, names, positions, times and ERS confirmed.');
// Safety car / VSC / yellow flag from the session packet
assert.strictEqual(state.safetyCar, 0);
assert.strictEqual(state.yellowZones, 0);
const flagged = Buffer.from(fs.readFileSync(sessionDump));
flagged[153] = 2;            // VSC
flagged[52 + 3 * 5] = 3;     // zone 3 under a yellow flag
flagged[52 + 7 * 5] = 3;
handlePacket(flagged);
assert.strictEqual(state.safetyCar, 2);
assert.strictEqual(state.yellowZones, 2);
flagged[153] = 1; flagged[52 + 3 * 5] = 0; flagged[52 + 7 * 5] = 0;
handlePacket(flagged);
assert.strictEqual(state.safetyCar, 1);
assert.strictEqual(state.yellowZones, 0);
console.log('Safety car, VSC and yellow flag read from the session packet.');
