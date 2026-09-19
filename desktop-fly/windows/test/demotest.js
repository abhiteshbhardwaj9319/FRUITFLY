import assert from 'node:assert/strict';
import { loadBrainData } from '../src/data.js';
import { DemoSession, TOUR_DURATION } from '../src/demo.js';
import { resetRandom } from './random.js';

assert.throws(() => new DemoSession({}), /datasets are required/);
const data = loadBrainData();
resetRandom('recording demo');
const session = new DemoSession(data);
const weights = Float32Array.from(session.sim.w);
const motorWeights = Float64Array.from(session.sim.locomotor.weights);
session.startTour();
let forwardPath = 0, reverseMotion = 0, previousPath = 0;
let gfDuringLoom = false;
const modes = new Set();
for (let tick = 0; tick < (TOUR_DURATION + 1) * 120; tick++) {
  session.advance(1 / 120);
  modes.add(session.mode);
  if (session.mode === 'loom' && session.lastGF >= session.modeStart) gfDuringLoom = true;
  if (session.mode === 'walk') forwardPath += session.distance - previousPath;
  if (session.mode === 'reverse' && session.forwardSpeed < 0) reverseMotion += -session.forwardSpeed / 120;
  previousPath = session.distance;
  assert(Number.isFinite(session.fly.pos.x) && Number.isFinite(session.fly.pos.y));
  if (tick % 480 === 479) console.log(JSON.stringify({ time: Math.round(session.time),
    input: session.mode, body: session.fly.state, speed: +session.forwardSpeed.toFixed(2),
    path: +session.distance.toFixed(2), gf: session.gfEvents }));
}
assert(forwardPath > 20, `forward path only ${forwardPath}`);
assert(reverseMotion > 0.5, `no backward motion during MDN: ${reverseMotion}`);
assert(gfDuringLoom, 'the looming phase itself must produce a Giant Fiber event');
assert.equal(session.touring, false);
assert.deepEqual([...modes].sort(), ['groom', 'left', 'loom', 'reverse', 'right', 'tap', 'walk', 'wings']);
assert.deepEqual(session.sim.w, weights, 'demo must not train brain weights');
assert.deepEqual(session.sim.locomotor.weights, motorWeights, 'demo must not train cord weights');
session.startTour(); session.setMode('free', true);
assert.equal(session.touring, false);
assert.equal(session.sim.activeStims.length, 0);
assert.equal(session.sim.pendingStims.length, 0);
session.lastGF = session.time; session.fly.state = 'walking';
assert.match(session.readout().detail, /cooldown/, 'a GF spike alone must not claim body takeoff');
session.lastGF = -Infinity; session.forwardSpeed = 2; session.setMode('reverse');
assert.equal(session.readout().title, 'Moving forward', 'labels must report observed motion, not the selected input');
console.log(`PASS guided demo: forward path ${forwardPath.toFixed(1)}, backward motion ${reverseMotion.toFixed(1)}, ${session.gfEvents} GF bursts; fixed weights; manual override`);
