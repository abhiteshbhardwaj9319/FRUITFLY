// Verifies that record mode has one authoritative overlay simulation and a
// dashboard mirror/control surface connected through the real preload IPC.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const output = path.join(root, 'artifacts');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'record-test-profile'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const waitFor = async (read, expression, message, attempts = 100) => {
  for (let i = 0; i < attempts; i++) {
    const value = await read(expression);
    if (value) return value;
    await delay(100);
  }
  throw new Error(message);
};

app.whenReady().then(async () => {
  const { loadBrainData } = await import('../src/data.js');
  const data = loadBrainData();
  let overlay, dashboard, lastCommand = null, telemetryCount = 0;
  ipcMain.handle('brain-data', () => data);
  ipcMain.handle('runtime-mode', () => 'record');
  ipcMain.on('telemetry', (_event, snapshot) => {
    telemetryCount++;
    if (dashboard && !dashboard.isDestroyed()) dashboard.webContents.send('telemetry', snapshot);
  });
  ipcMain.on('dashboard-command', (_event, command) => {
    lastCommand = command;
    if (overlay && !overlay.isDestroyed()) overlay.webContents.send('cmd', command);
  });
  ipcMain.on('spikes', () => {});
  ipcMain.on('stimulate', (_event, request) => overlay.webContents.send('stimulate', request));
  const options = { show: false, webPreferences: { preload: path.join(root, 'preload.mjs'),
    sandbox: false, backgroundThrottling: false } };
  overlay = new BrowserWindow({ ...options, width: 1000, height: 700, transparent: true, frame: false });
  dashboard = new BrowserWindow({ ...options, width: 1280, height: 850 });
  const errors = [];
  for (const win of [overlay, dashboard]) {
    win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
    win.webContents.on('render-process-gone', (_event, details) => errors.push(details.reason));
  }
  const readOverlay = (script) => overlay.webContents.executeJavaScript(script);
  const readDashboard = (script) => dashboard.webContents.executeJavaScript(script);
  try {
    await Promise.all([
      overlay.loadFile(path.join(root, 'renderer', 'overlay.html')),
      dashboard.loadFile(path.join(root, 'renderer', 'demo.html')),
    ]);
    overlay.showInactive(); dashboard.showInactive();
    overlay.webContents.send('retarget', { width: 1000, height: 700,
      screens: [{ id: 1, x0: -500, x1: 500, y0: -350, y1: 350 }] });
    overlay.webContents.send('cmd', { name: 'recordSetup' });
    await waitFor(readDashboard, 'window.__fruitflyRecordStatus?.linked', 'dashboard never received overlay telemetry');
    assert(telemetryCount > 0);
    assert.equal(await readDashboard("document.getElementById('sound').textContent"), 'Sound on');
    const overlayStatus = await readOverlay('window.__fruitflyRecordStatus');
    const dashboardStatus = await readDashboard('window.__fruitflyRecordStatus');
    assert.deepEqual(dashboardStatus.position, overlayStatus.position, 'dashboard must mirror the overlay fly position');
    await waitFor(readOverlay, 'window.__fruitflyRecordStatus?.trailPoints > 2', 'desktop trail did not grow');
    fs.writeFileSync(path.join(output, 'record-connected.png'), (await dashboard.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(output, 'record-overlay.png'), (await overlay.webContents.capturePage()).toPNG());

    await readDashboard("document.querySelector('[data-mode=reverse]').click()");
    await waitFor(readOverlay, "window.__fruitflyRecordStatus?.mode === 'reverse'", 'reverse did not reach overlay');
    assert.deepEqual(lastCommand, { name: 'recordMode', mode: 'reverse' });
    await waitFor(readDashboard, "document.getElementById('mode-label').textContent === 'MDN stimulation'", 'reverse telemetry did not return to dashboard');

    for (const mode of ['groom', 'wings', 'tap', 'walk']) {
      await readDashboard(`document.querySelector('[data-mode=${mode}]').click()`);
      await waitFor(readOverlay, `window.__fruitflyRecordStatus?.mode === '${mode}'`, `${mode} did not reach overlay`);
    }
    await readDashboard("document.querySelector('[data-mode=loom]').click()");
    await waitFor(readDashboard, 'window.__fruitflyRecordStatus?.gfEvents > 0', 'loom did not produce a GF event', 150);

    await readDashboard("document.getElementById('trail').click()");
    assert.deepEqual(lastCommand, { name: 'recordTrail', value: false });
    await waitFor(readOverlay, 'window.__fruitflyRecordStatus?.trailEnabled === false', 'trail toggle did not reach overlay');
    const beforeToggle = await readOverlay('window.__fruitflyRecordStatus.trailPoints');
    await delay(300);
    assert.equal(await readOverlay('window.__fruitflyRecordStatus.trailPoints'), beforeToggle, 'disabled trail must stop growing');
    await readDashboard("document.getElementById('reset').click()");
    await waitFor(readOverlay, 'window.__fruitflyRecordStatus?.time < 1', 'reset did not restart authoritative simulation');

    assert.deepEqual(errors, []);
    const result = { passed: true, telemetryCount, modes: ['walk', 'reverse', 'groom', 'wings', 'tap', 'loom'], mirrored: true, trail: true };
    fs.writeFileSync(path.join(output, 'record-ui-result.json'), JSON.stringify(result));
    console.log(`PASS connected record mode: ${telemetryCount} telemetry frames; shared pose, controls, GF response, reset and trail verified`);
    app.exit(0);
  } catch (error) {
    fs.writeFileSync(path.join(output, 'record-ui-result.json'), JSON.stringify({ passed: false, error: error.stack, errors }));
    console.error(error); console.error(errors); app.exit(1);
  }
});
