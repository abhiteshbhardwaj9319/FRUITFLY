// Guided stimulation assay. Reuses the shipped neural, transfer and body models.
// The tour schedules inputs; it never schedules leg poses or body translations.
import { LIFSim, SimulationClock } from './sim.js';
import { SignalBuilder } from './signals.js';
import { Fly } from './flymodel.js';

export const TOUR = [
  { at: 0, mode: 'walk', title: '01 / Start with the wiring', caption: 'Stimulate DNp09. Watch motor activity reach all six legs.' },
  { at: 7, mode: 'left', title: '02 / Change the balance', caption: 'Add left DNa stimulation. The motor circuit receives an asymmetric input.' },
  { at: 13, mode: 'right', title: '03 / Try the other side', caption: 'Switch DNa stimulation. The two sides are not mirror images.' },
  { at: 19, mode: 'reverse', title: '04 / Recruit the moonwalkers', caption: 'Remove forward stimulation and stimulate MDN. Read the body response below.' },
  { at: 25, mode: 'groom', title: '05 / Grooming command', caption: 'DNg11 activity recruits the modeled grooming state.' },
  { at: 31, mode: 'wings', title: '06 / Raise the wings', caption: 'Escape-wing descending neurons change the grounded wing posture.' },
  { at: 36, mode: 'tap', title: '07 / Tap the sensory pathway', caption: 'A brief sensory drive tests the startle path.' },
  { at: 39, mode: 'loom', title: '08 / A threat enters the circuit', caption: 'A synthetic looming input reaches LC4/LPLC2. Watch for a Giant Fiber spike.' },
  { at: 43, mode: 'walk', title: '09 / Back to walking', caption: 'Measured wiring. Assumed physiology. A modeled body. No learning in this demo.' },
];
export const TOUR_DURATION = 48;
export const MODE_LABELS = { walk: 'DNp09 stimulation', left: 'DNp09 + left DNa stimulation',
  right: 'DNp09 + right DNa stimulation', reverse: 'MDN stimulation',
  loom: 'Synthetic looming input', groom: 'DNg11 grooming stimulation',
  wings: 'Escape-wing neuron stimulation', tap: 'Sensory tap stimulation',
  free: 'No external stimulation' };

export class DemoSession {
  constructor(data) {
    if (!data?.circuit || !data?.locomotor) throw new Error('Both FlyWire and MaleCNS datasets are required for this demo.');
    this.sim = new LIFSim(data.circuit, null, data.locomotor);
    this.builder = new SignalBuilder();
    this.fly = new Fly({ x: 0, y: 0 }, { spontaneousFlight: false });
    this.fly.heading = Math.PI / 2;
    this.fly.speed = 0;
    this.fly.syncNode();
    this.clock = new SimulationClock();
    this.time = 0;
    this.ms = 0;
    this.mode = 'walk';
    this.touring = false;
    this.tourStart = 0;
    this.chapter = -1;
    this.lastGF = -Infinity;
    this.gfEvents = 0;
    this.distance = 0;
    this.forwardSpeed = 0;
    this.yawRate = 0;
    this.events = [];
    this.trail = [];
    this.nextTrail = 0;
    this.nextStim = 0;
    this.setMode('walk');
  }

  log(text) {
    this.events.unshift({ time: this.time, text });
    this.events.length = Math.min(this.events.length, 5);
  }

  setMode(mode, manual = false) {
    if (!(mode in MODE_LABELS)) return;
    if (manual) this.touring = false;
    this.mode = mode;
    this.modeStart = this.time;
    // These are demo-owned electrodes; switching a button removes the old one.
    this.sim.pendingStims.length = 0;
    this.sim.activeStims.length = 0;
    this.nextStim = this.time;
    this.log(MODE_LABELS[mode]);
  }

  startTour() {
    this.touring = true;
    this.tourStart = this.time;
    this.chapter = -1;
  }

  tick(dt) {
    if (this.touring) {
      const elapsed = this.time - this.tourStart;
      if (elapsed >= TOUR_DURATION) { this.touring = false; this.log('Tour complete — live simulation continues'); }
      else {
        const chapter = TOUR.findLastIndex((step) => elapsed >= step.at);
        if (chapter !== this.chapter) { this.chapter = chapter; this.setMode(TOUR[chapter].mode); }
      }
    }
    const sim = this.sim, fly = this.fly;
    if (this.time >= this.nextStim) {
      if (['walk', 'left', 'right'].includes(this.mode)) sim.stimulate(sim.fwd, 0.15, 140);
      if (this.mode === 'left') sim.stimulate(sim.dnaL, 0.3, 140);
      if (this.mode === 'right') sim.stimulate(sim.dnaR, 0.3, 140);
      if (this.mode === 'reverse') sim.stimulate(sim.mdn, 0.3, 140);
      if (this.mode === 'groom') sim.stimulate(sim.groom, 0.25, 140);
      if (this.mode === 'wings') sim.stimulate(sim.escw, 0.3, 140);
      if (this.mode === 'tap') sim.stimulate(sim.sens, 0.45, 140);
      this.nextStim = this.time + 0.14;
    }
    // A short sensory pulse, not direct Giant Fiber stimulation.
    sim.loomL = sim.loomR = this.mode === 'loom' && this.time - this.modeStart < 0.6 ? 0.9 : 0;
    sim.legFeedback = fly.legFeedback;
    this.ms += dt * 1000;
    const steps = Math.floor(this.ms + 1e-9); this.ms -= steps;
    sim.step(steps);
    const signals = this.builder.make(sim, dt);
    if (signals.escape) {
      if (this.time - this.lastGF > 0.3) { this.gfEvents++; this.log('Giant Fiber spike detected'); }
      this.lastGF = this.time;
    }
    // Walking assay: suppress grooming and heuristic nervous darts, retaining
    // the GF-triggered escape. Leg commands are untouched neural outputs.
    signals.groomDrive = 0;
    signals.nervous = 0;
    const old = { ...fly.pos }, heading = fly.heading;
    fly.update(dt, { width: 10000, height: 10000 }, null, signals);
    const dx = fly.pos.x - old.x, dy = fly.pos.y - old.y;
    const k = 1 - Math.exp(-dt * 5);
    const grounded = fly.state !== 'flying';
    this.forwardSpeed += ((grounded ? (dx * Math.cos(heading) + dy * Math.sin(heading)) / dt : 0) - this.forwardSpeed) * k;
    const yaw = Math.atan2(Math.sin(fly.heading - heading), Math.cos(fly.heading - heading));
    this.yawRate += ((grounded ? yaw / dt : 0) - this.yawRate) * k;
    if (grounded) this.distance += Math.hypot(dx, dy);
    this.time += dt;
    if (this.time >= this.nextTrail) {
      this.trail.push({ ...fly.pos, flying: !grounded });
      if (this.trail.length > 600) this.trail.shift();
      this.nextTrail = this.time + 0.08;
    }
  }

  advance(dt) { this.clock.advance(dt, (step) => this.tick(step)); }

  readout() {
    const sim = this.sim;
    let title, detail;
    if (this.time - this.lastGF < 1.2) {
      title = 'Giant Fiber spike detected';
      detail = this.fly.state === 'flying' ? 'Escape command observed; the body is in modeled flight.' : 'Escape command observed; body takeoff may be gated by its cooldown.';
    } else if (this.fly.state === 'flying') {
      title = 'Modeled escape flight'; detail = 'The takeoff was circuit-triggered. The airborne trajectory is procedural.';
    } else if (Math.abs(this.forwardSpeed) > 0.7) {
      title = this.forwardSpeed < 0 ? 'Moving backward' : 'Moving forward';
      detail = `Body motion measured from position; ${sim.rateFwd.toFixed(1)} Hz DNp09, ${sim.rateMDN.toFixed(1)} Hz MDN.`;
    } else {
      title = 'Little net forward motion'; detail = 'Motor activity can move the legs without producing sustained translation.';
    }
    return { title, detail, rates: [sim.rateFwd, sim.rateDNaL, sim.rateDNaR, sim.rateMDN, sim.rateLoom] };
  }
}
