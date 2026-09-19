// Small synthesized sound layer for recordings. It reads simulation events;
// it never feeds sound back into the neural or body models.
export class DemoSound {
  constructor() {
    this.enabled = true;
    this.context = null;
    this.master = null;
    this.wingGain = null;
    this.wingOscillators = [];
    this.previousContacts = null;
    this.previousGF = 0;
    this.lastStepAt = -Infinity;
    this.lastMode = null;
  }

  async unlock() {
    if (!this.context) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.24 : 0;
      this.master.connect(this.context.destination);

      this.wingGain = this.context.createGain();
      this.wingGain.gain.value = 0;
      this.wingGain.connect(this.master);
      for (const [frequency, type, level] of [[178, 'sawtooth', 0.035], [267, 'triangle', 0.018]]) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type; oscillator.frequency.value = frequency; gain.gain.value = level;
        oscillator.connect(gain).connect(this.wingGain); oscillator.start();
        this.wingOscillators.push(oscillator);
      }
    }
    if (this.context.state === 'suspended') await this.context.resume().catch(() => {});
    window.__fruitflySoundStatus = { enabled: this.enabled, state: this.context.state };
    return true;
  }

  setEnabled(value) {
    this.enabled = !!value;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.enabled ? 0.24 : 0, this.context.currentTime, 0.02);
    }
    window.__fruitflySoundStatus = { enabled: this.enabled,
      state: this.context?.state || 'waiting-for-click' };
  }

  tone(frequency, duration = 0.09, volume = 0.08, type = 'sine', endFrequency = null) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now); oscillator.stop(now + duration + 0.02);
  }

  noise(duration = 0.16, volume = 0.055) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const length = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    filter.type = 'bandpass'; filter.frequency.value = 1300; filter.Q.value = 0.8;
    gain.gain.value = volume;
    source.buffer = buffer; source.connect(filter).connect(gain).connect(this.master); source.start();
  }

  cue(mode) {
    if (mode === this.lastMode) return;
    this.lastMode = mode;
    const frequencies = { walk: 330, left: 294, right: 392, reverse: 220,
      loom: 110, groom: 440, wings: 520, tap: 620, free: 260 };
    const start = frequencies[mode] || 330;
    this.tone(start, 0.09, 0.055, 'triangle', mode === 'reverse' ? 165 : start * 1.12);
  }

  update({ state, contacts = [], gfEvents = 0, mode = null, wingDrive = 0 }) {
    if (!this.context) return;
    const now = this.context.currentTime;
    if (mode) this.cue(mode);
    if (this.previousContacts) {
      const landed = contacts.some((contact, i) => contact && !this.previousContacts[i]);
      if (landed && now - this.lastStepAt > 0.065) {
        this.lastStepAt = now;
        this.tone(86 + Math.random() * 22, 0.045, 0.045, 'triangle', 62);
      }
    }
    this.previousContacts = [...contacts];
    if (gfEvents > this.previousGF) {
      this.noise(0.2, 0.075);
      this.tone(760, 0.28, 0.09, 'sawtooth', 120);
    }
    this.previousGF = gfEvents;
    if (this.wingGain) {
      const target = state === 'flying' ? 0.9 : Math.min(0.3, Math.max(0, wingDrive) * 0.2);
      this.wingGain.gain.setTargetAtTime(target, now, state === 'flying' ? 0.04 : 0.09);
    }
  }
}
