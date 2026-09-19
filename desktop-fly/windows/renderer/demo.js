import * as THREE from '../node_modules/three/build/three.module.js';
import { DemoSession, TOUR, TOUR_DURATION, MODE_LABELS } from '../src/demo.js';
import { Fly } from '../src/flymodel.js';
import { DemoSound } from './sound.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const sound = new DemoSound();
const rateNames = [['DNp09', 'forward drive'], ['DNa · left', 'steering input'], ['DNa · right', 'steering input'], ['MDN', 'backward drive'], ['LC4 / LPLC2', 'looming detectors']];
const rateBars = [], rateValues = [];
for (const [name, description] of rateNames) {
  const row = document.createElement('div'); row.className = 'rate-row';
  const label = document.createElement('label'); label.textContent = name;
  const small = document.createElement('small'); small.textContent = description; label.append(small);
  const track = document.createElement('div'); track.className = 'rate-track';
  const bar = document.createElement('div'); track.append(bar);
  const value = document.createElement('span'); value.className = 'rate-value'; value.textContent = '0.0 Hz';
  row.append(label, track, value); $('rates').append(row); rateBars.push(bar); rateValues.push(value);
}
const channels = ['protract', 'retract', 'lift', 'depress', 'flex', 'extend'];
const legNames = ['RF', 'LF', 'RM', 'LM', 'RH', 'LH'];
const motorCells = [], contactLabels = [];
$('motors').append(document.createElement('span'));
for (const leg of legNames) { const label = document.createElement('span'); label.className = 'leg-label'; label.textContent = leg; $('motors').append(label); contactLabels.push(label); }
channels.forEach((channel) => {
  const label = document.createElement('span'); label.textContent = channel.slice(0, 4); label.className = 'motor-name'; $('motors').append(label);
  const cells = [];
  for (let leg = 0; leg < 6; leg++) { const cell = document.createElement('div'); cell.className = 'motor-cell'; cell.title = `${legNames[leg]} ${channel}`; $('motors').append(cell); cells.push(cell); }
  motorCells.push(cells);
});

let data, session, renderer, scene, camera, trailLine, grid;
let linked = false, linkedTour = false, linkedTourStart = 0, linkedChapter = -1;
let lastRemoteWall = 0, lastRemoteSim = 0;
let paused = false, oblique = false, showTrail = true, lastTime = null, lastUI = 0;
let simSample = 0, wallSample = 0, realTime = 1;
let eventSignature = '';
const cameraTarget = new THREE.Vector3();
const trailArray = new Float32Array(600 * 3);
const controlButtons = [...document.querySelectorAll('[data-mode]')];
const simulationButtons = [...controlButtons, $('tour'), $('pause'), $('reset')];
simulationButtons.forEach((button) => { button.disabled = true; });

function disposeFly(fly) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  fly.node.traverse((node) => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
      if (!material) continue;
      materials.add(material); if (material.map) textures.add(material.map);
    }
  });
  geometries.forEach((item) => item.dispose()); materials.forEach((item) => item.dispose()); textures.forEach((item) => item.dispose());
}

function reset(tour = false) {
  if (linked) {
    window.flyAPI.sendDashboardCommand({ name: 'recordReset' });
    linkedTour = tour; linkedChapter = -1; linkedTourStart = 0;
    return;
  }
  if (session) { scene.remove(session.fly.node); disposeFly(session.fly); }
  session = new DemoSession(data); scene.add(session.fly.node);
  cameraTarget.set(0, 0, 0); paused = false; lastTime = null;
  wallSample = 0; simSample = 0; realTime = 1; eventSignature = '';
  if (tour) session.startTour();
  updateUI();
}

function makeRemoteSession() {
  const fly = new Fly({ x: 0, y: 0 }, { spontaneousFlight: false });
  return {
    fly, time: 0, mode: 'walk', gfEvents: 0, lastGF: -Infinity,
    distance: 0, forwardSpeed: 0, yawRate: 0, trail: [], events: [], touring: false,
    sim: { locomotor: { commands: Array.from({ length: 6 }, () =>
      Object.fromEntries(channels.map((name) => [name, 0]))) } },
    readout() {
      const rates = this.rates || [0, 0, 0, 0, 0];
      let title, detail;
      if (this.time - this.lastGF < 1.2) {
        title = 'Giant Fiber spike detected';
        detail = this.fly.state === 'flying'
          ? 'Escape command observed; the desktop fly is in modeled flight.'
          : 'Escape command observed; takeoff may be gated by body state.';
      } else if (this.fly.state === 'flying') {
        title = 'Modeled escape flight';
        detail = 'One neural simulation drives the desktop fly and this mirror.';
      } else if (Math.abs(this.forwardSpeed) > 0.7) {
        title = this.forwardSpeed < 0 ? 'Moving backward' : 'Moving forward';
        detail = `Desktop body motion; ${rates[0].toFixed(1)} Hz DNp09, ${rates[3].toFixed(1)} Hz MDN.`;
      } else {
        title = 'Little net forward motion';
        detail = 'Motor activity can move the legs without sustained translation.';
      }
      return { title, detail, rates };
    },
  };
}

function updateLinkedTour() {
  if (!linkedTour || !session) return;
  const elapsed = session.time - linkedTourStart;
  if (elapsed >= TOUR_DURATION) {
    linkedTour = false; linkedChapter = -1;
    session.events.unshift({ time: session.time, text: 'Tour complete — live simulation continues' });
    return;
  }
  const chapter = TOUR.findLastIndex((step) => elapsed >= step.at);
  if (chapter >= 0 && chapter !== linkedChapter) {
    linkedChapter = chapter;
    window.flyAPI.sendDashboardCommand({ name: 'recordMode', mode: TOUR[chapter].mode });
  }
}

function applyRemoteSnapshot(snapshot) {
  if (!linked || !session || !snapshot?.fly) return;
  const oldMode = session.mode, oldGF = session.gfEvents;
  session.time = snapshot.time; session.mode = snapshot.mode;
  session.gfEvents = snapshot.gfEvents; session.lastGF = snapshot.lastGF;
  session.distance = snapshot.distance; session.forwardSpeed = snapshot.forwardSpeed;
  session.yawRate = snapshot.yawRate; session.rates = snapshot.rates;
  session.signals = snapshot.signals;
  session.trail = snapshot.trail || [];
  session.sim.locomotor.commands = snapshot.motorCommands;
  session.fly.sensedLegFeedback = (snapshot.contacts || []).map((contact) => ({ contact }));
  const pose = snapshot.fly, fly = session.fly;
  if (!lastRemoteWall || snapshot.time < lastRemoteSim) {
    cameraTarget.set(pose.pos.x, pose.pos.y, pose.z * 0.6);
  }
  fly.pos = { ...pose.pos }; fly.heading = pose.heading; fly.pitch = pose.pitch; fly.state = pose.state;
  fly.node.position.z = pose.z; fly.node.scale.setScalar(pose.scale); fly.syncNode();
  (pose.legs || []).forEach((legPose, i) => {
    const leg = fly.model.legs[i];
    if (!leg) return;
    leg.angle = legPose.angle; leg.lift = legPose.lift; leg.kneeAngle = legPose.knee; leg.apply();
  });
  (pose.wings || []).forEach((wingPose, i) => {
    const wing = fly.model.foldedWings.children[i];
    if (wing) wing.rotation.set(wingPose.x, wingPose.y, wingPose.z);
  });
  fly.model.abdomen.scale.z = pose.abdomenScaleZ;
  for (const blur of [fly.model.blurWingL, fly.model.blurWingR]) {
    blur.visible = pose.blurVisible; blur.material.opacity = pose.blurOpacity;
  }
  fly.model.blurWingL.rotation.z = pose.blurLeftZ;
  fly.model.blurWingR.rotation.z = pose.blurRightZ;
  if (oldMode !== session.mode) session.events.unshift({
    time: session.time, text: MODE_LABELS[session.mode] || session.mode,
  });
  if (oldGF !== session.gfEvents) session.events.unshift({ time: session.time, text: 'Giant Fiber spike detected' });
  session.events.length = Math.min(5, session.events.length);
  const wall = performance.now() / 1000;
  if (lastRemoteWall && snapshot.time >= lastRemoteSim) {
    realTime = (snapshot.time - lastRemoteSim) / Math.max(0.001, wall - lastRemoteWall);
  }
  lastRemoteWall = wall; lastRemoteSim = snapshot.time;
  paused = !!snapshot.paused;
  window.__fruitflyRecordStatus = { linked: true, mode: snapshot.mode,
    time: snapshot.time, gfEvents: snapshot.gfEvents, position: { ...snapshot.fly.pos } };
  if (linkedTour && linkedTourStart === 0) linkedTourStart = snapshot.time;
  updateLinkedTour();
}

function resize() {
  const width = stage.clientWidth, height = stage.clientHeight;
  renderer.setSize(width, height);
  const halfHeight = 47;
  camera.left = -halfHeight * width / height; camera.right = -camera.left;
  camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
}

function buildScene() {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(-100, 100, 65, -65, 1, 1800);
  camera.up.set(0, 1, 0);
  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xdcecf4, 1.8));
  const light = new THREE.DirectionalLight(0xffe4bd, 2.4); light.position.set(-80, 100, 220);
  scene.add(light); // broad lighting; contact shadow below follows the tracking view
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), new THREE.MeshBasicMaterial({ color: 0x111c24, transparent: true, opacity: 0.35 }));
  floor.position.z = -1; scene.add(floor);
  grid = new THREE.GridHelper(1600, 80, 0x37515c, 0x243741); grid.rotation.x = Math.PI / 2; grid.position.z = -0.7;
  grid.material.transparent = true; grid.material.opacity = 0.4; scene.add(grid);
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(trailArray, 3)); geometry.setDrawRange(0, 0);
  trailLine = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0xe6b071, transparent: true, opacity: 0.48 }));
  trailLine.frustumCulled = false; scene.add(trailLine);
  new ResizeObserver(resize).observe(stage); resize();
}

function updateUI() {
  if (!session) return;
  const readout = session.readout();
  $('body-state').textContent = readout.title; $('body-detail').textContent = readout.detail;
  $('mode-label').textContent = MODE_LABELS[session.mode];
  $('speed').textContent = `${session.forwardSpeed.toFixed(1)} u/s`;
  $('yaw').textContent = `${session.yawRate.toFixed(2)} rad/s`;
  $('distance').textContent = `${session.distance.toFixed(1)} u`;
  $('realtime').textContent = `${realTime.toFixed(2)}×`;
  $('live').textContent = paused ? 'PAUSED' : 'LIVE SIMULATION'; $('pause').textContent = paused ? 'Resume' : 'Pause';
  readout.rates.forEach((rate, i) => { rateValues[i].textContent = `${rate.toFixed(1)} Hz`; rateBars[i].style.width = `${Math.min(100, rate / 120 * 100)}%`; });
  $('gf-light').classList.toggle('fired', session.time - session.lastGF < 0.4);
  $('gf-count').textContent = `${session.gfEvents} burst${session.gfEvents === 1 ? '' : 's'}`;
  channels.forEach((channel, row) => {
    for (let leg = 0; leg < 6; leg++) {
      const value = session.sim.locomotor.commands[leg][channel];
      motorCells[row][leg].style.backgroundColor = `rgb(${Math.round(24 + value * 180)}, ${Math.round(39 + value * 164)}, ${Math.round(45 + value * 120)})`;
      motorCells[row][leg].title = `${legNames[leg]} ${channel}: ${value.toFixed(3)}`;
    }
  });
  contactLabels.forEach((label, i) => { label.classList.toggle('contact', session.fly.legFeedback[i].contact); label.textContent = `${session.fly.legFeedback[i].contact ? '• ' : ''}${legNames[i]}`; });
  sound.update({ state: session.fly.state,
    contacts: session.fly.legFeedback.map((feedback) => !!feedback.contact),
    gfEvents: session.gfEvents, mode: session.mode,
    wingDrive: session.signals?.wingDrive || 0 });
  controlButtons.forEach((button) => { const active = session.mode === button.dataset.mode; button.classList.toggle('selected', active); button.setAttribute('aria-pressed', String(active)); });
  const signature = JSON.stringify(session.events);
  if (signature !== eventSignature) {
    $('events').replaceChildren();
    session.events.slice(0, 3).forEach((event) => {
      const li = document.createElement('li'), time = document.createElement('time'), text = document.createElement('span');
      time.textContent = `${event.time.toFixed(1)}s`; text.textContent = event.text; li.append(time, text); $('events').append(li);
    }); eventSignature = signature;
  }
  const touring = linked ? linkedTour : session.touring;
  const activeChapter = linked ? linkedChapter : session.chapter;
  $('tour').textContent = touring ? '■ Stop tour' : '▶ Play 48s tour';
  const chapter = touring ? TOUR[Math.max(0, activeChapter)] : null;
  $('chapter').textContent = chapter?.title ?? 'EXPLORE THE CIRCUIT';
  $('caption').textContent = chapter?.caption ?? 'Buttons stimulate neurons. The readout reports what actually happens.';
  const tourStart = linked ? linkedTourStart : session.tourStart;
  $('progress').style.width = `${touring ? Math.min(100, (session.time - tourStart) / TOUR_DURATION * 100) : 0}%`;
}

function frame(timeMs) {
  requestAnimationFrame(frame);
  const dt = lastTime === null ? 0 : Math.max(0, (timeMs - lastTime) / 1000); lastTime = timeMs;
  if (!linked && !paused) {
    session.advance(dt);
    wallSample += dt;
    if (wallSample >= 1) { realTime = (session.time - simSample) / wallSample; simSample = session.time; wallSample = 0; }
  }
  const fly = session.fly;
  cameraTarget.lerp(new THREE.Vector3(fly.pos.x, fly.pos.y, fly.node.position.z * 0.6), 1 - Math.exp(-Math.min(dt, 0.1) * 5));
  camera.position.set(cameraTarget.x, cameraTarget.y + (oblique ? -115 : 0), cameraTarget.z + 240);
  camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);
  // Move only the grid tile; world-space body displacement and trail are unchanged.
  grid.position.x = Math.round(cameraTarget.x / 20) * 20; grid.position.y = Math.round(cameraTarget.y / 20) * 20;
  session.trail.forEach((point, i) => { trailArray[i * 3] = point.x; trailArray[i * 3 + 1] = point.y; trailArray[i * 3 + 2] = 0; });
  trailLine.geometry.attributes.position.needsUpdate = true;
  trailLine.geometry.setDrawRange(0, session.trail.length); trailLine.visible = showTrail;
  renderer.render(scene, camera);
  if (timeMs - lastUI > 100) { updateUI(); lastUI = timeMs; }
}

controlButtons.forEach((button) => button.addEventListener('click', () => {
  sound.unlock();
  if (linked) {
    linkedTour = false;
    window.flyAPI.sendDashboardCommand({ name: 'recordMode', mode: button.dataset.mode });
  } else session.setMode(button.dataset.mode, true);
  updateUI();
}));
$('pause').addEventListener('click', () => {
  sound.unlock();
  paused = !paused; lastTime = null;
  if (linked) window.flyAPI.sendDashboardCommand({ name: 'pause', value: paused });
  updateUI();
});
$('reset').addEventListener('click', () => reset());
$('tour').addEventListener('click', () => {
  sound.unlock();
  if (linked) {
    if (linkedTour) {
      linkedTour = false;
      window.flyAPI.sendDashboardCommand({ name: 'recordMode', mode: 'free' });
    } else reset(true);
    updateUI();
    return;
  }
  if (session.touring) { session.setMode('free', true); updateUI(); }
  else reset(true);
});
$('view').addEventListener('click', () => { oblique = !oblique; $('view').textContent = oblique ? 'Top view' : 'Oblique view'; });
$('trail').addEventListener('click', () => {
  sound.unlock();
  showTrail = !showTrail;
  if (linked) window.flyAPI.sendDashboardCommand({ name: 'recordTrail', value: showTrail });
  $('trail').textContent = showTrail ? 'Trail on' : 'Trail off';
  $('trail').setAttribute('aria-pressed', String(showTrail));
});
$('explain').addEventListener('click', () => $('explanation').showModal());
$('close-explanation').addEventListener('click', () => $('explanation').close());
$('sound').addEventListener('click', async () => {
  await sound.unlock();
  sound.setEnabled(!sound.enabled);
  $('sound').textContent = sound.enabled ? 'Sound on' : 'Sound off';
  $('sound').setAttribute('aria-pressed', String(sound.enabled));
  if (sound.enabled) sound.tone(392, 0.12, 0.065, 'triangle', 523);
});
document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && session && !$('explanation').open && event.target === document.body) { event.preventDefault(); $('pause').click(); }
});

try {
  data = await window.flyAPI.getBrainData();
  linked = (await window.flyAPI.getRuntimeMode()) === 'record';
  if (!data?.circuit || !data?.locomotor) throw new Error('FlyWire and MaleCNS data are required. Restore the data bundle and restart.');
  buildScene();
  if (linked) {
    session = makeRemoteSession(); scene.add(session.fly.node);
    window.flyAPI.onTelemetry(applyRemoteSnapshot);
    $('connection-note').textContent = 'CONNECTED: one neural simulation drives the desktop fly and this dashboard mirror.';
    $('live').textContent = 'WAITING FOR DESKTOP FLY';
  } else reset();
  $('neurons').textContent = (data.circuit.neurons.length + data.locomotor.neurons.length).toLocaleString();
  $('edges').textContent = (data.circuit.edges.length + data.locomotor.edges.length).toLocaleString();
  simulationButtons.forEach((button) => { button.disabled = false; });
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error); $('live').textContent = 'DEMO UNAVAILABLE';
  $('body-state').textContent = 'Could not start the simulation'; $('body-detail').textContent = error.message;
}
