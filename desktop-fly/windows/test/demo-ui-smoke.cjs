// Runs the real demo renderer in Electron, exercises controls and saves captures.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const output = path.join(__dirname, '..', 'artifacts');
fs.mkdirSync(output, { recursive: true });
app.setPath('userData', path.join(output, 'electron-test-profile'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  const { loadBrainData } = await import('../src/data.js');
  const data = loadBrainData();
  ipcMain.handle('brain-data', () => data);
  ipcMain.handle('runtime-mode', () => 'demo');
  const win = new BrowserWindow({ width: 1440, height: 960, show: false,
    webPreferences: { preload: path.join(__dirname, '..', 'preload.mjs'), sandbox: false, backgroundThrottling: false } });
  const errors = [];
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  win.webContents.on('render-process-gone', (_event, details) => errors.push(details.reason));
  const read = (script) => win.webContents.executeJavaScript(script);
  try {
    await win.loadFile(path.join(__dirname, '..', 'renderer', 'demo.html'));
    win.showInactive();
    for (let i = 0; i < 60; i++) {
      if (await read("document.getElementById('live').textContent === 'LIVE SIMULATION'")) break;
      await delay(100);
    }
    assert.equal(await read("document.getElementById('live').textContent"), 'LIVE SIMULATION');
    assert.equal(await read("document.getElementById('sound').textContent"), 'Sound on');
    await read("document.getElementById('sound').click()");
    assert.equal(await read("document.getElementById('sound').getAttribute('aria-pressed')"), 'false');
    await read("document.getElementById('sound').click()");
    assert.equal(await read("document.getElementById('sound').getAttribute('aria-pressed')"), 'true');
    await delay(2000);
    const distance = await read("parseFloat(document.getElementById('distance').textContent)");
    assert(distance > 0, 'body must translate in the actual renderer');
    await read("document.getElementById('pause').click()");
    const frozen = await read("document.getElementById('distance').textContent");
    await delay(200);
    assert.equal(await read("document.getElementById('distance').textContent"), frozen);
    fs.writeFileSync(path.join(output, 'demo-overview.png'), (await win.webContents.capturePage()).toPNG());
    await read("document.getElementById('explain').click()");
    assert.equal(await read("document.getElementById('explanation').open"), true);
    fs.writeFileSync(path.join(output, 'demo-explanation.png'), (await win.webContents.capturePage()).toPNG());
    await read("document.getElementById('close-explanation').click(); document.getElementById('tour').click()");
    await delay(300);
    assert.match(await read("document.getElementById('chapter').textContent"), /01/);
    await read("document.querySelector('[data-mode=reverse]').click()");
    assert.equal(await read("document.getElementById('mode-label').textContent"), 'MDN stimulation');
    assert.match(await read("document.getElementById('tour').textContent"), /Play/);
    await read("document.querySelector('[data-mode=loom]').click()");
    for (let i = 0; i < 50; i++) {
      await delay(100);
      if (await read("document.getElementById('gf-count').textContent !== '0 bursts'")) break;
    }
    assert.notEqual(await read("document.getElementById('gf-count').textContent"), '0 bursts');
    await read("document.getElementById('reset').click(); document.getElementById('view').click()");
    await delay(300);
    assert.equal(await read("document.getElementById('view').textContent"), 'Top view');
    win.setSize(1024, 768);
    await delay(250);
    assert.equal(await read('document.documentElement.scrollWidth <= window.innerWidth'), true);
    assert.equal(await read("document.querySelector('.controls').getBoundingClientRect().bottom <= document.querySelector('.tour').getBoundingClientRect().top"), true, 'tour must not cover the controls');
    assert.equal(await read("document.querySelector('.motor-panel').getBoundingClientRect().bottom <= document.querySelector('.tour').getBoundingClientRect().top"), true, 'tour must not cover motor outputs');
    fs.writeFileSync(path.join(output, 'demo-compact.png'), (await win.webContents.capturePage()).toPNG());
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'demo-ui-result.json'), JSON.stringify({ passed: true, distance, errors }));
    console.log(`PASS renderer: loads ${data.circuit.neurons.length + data.locomotor.neurons.length} neurons; walking, pause, tour, override, loom, reset, view, compact layout. Screenshots: ${output}`);
    app.exit(0);
  } catch (error) {
    fs.writeFileSync(path.join(output, 'demo-ui-result.json'), JSON.stringify({ passed: false, error: error.stack, errors }));
    console.error(error); console.error(errors); app.exit(1);
  }
});
