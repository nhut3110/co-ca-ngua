export type SoundCue =
  | 'ui'
  | 'select'
  | 'cancel'
  | 'roll'
  | 'result'
  | 'six'
  | 'step'
  | 'deploy'
  | 'capture'
  | 'finish'
  | 'spell'
  | 'turn'
  | 'bonus'
  | 'pass'
  | 'portal'
  | 'victory'
  | 'pause'
  | 'resume';
export type AudioPreferences = { muted: boolean; music: number; effects: number };
export const AUDIO_KEY = 'skyhoof.audio.v1';
export function readAudioPreferences(): AudioPreferences {
  try {
    const p = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? 'null');
    if (
      p &&
      typeof p.muted === 'boolean' &&
      [p.music, p.effects].every(
        (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1,
      )
    )
      return p;
  } catch {
    /* Private browsing can deny storage. */
  }
  return { muted: false, music: 0.35, effects: 0.7 };
}
const midi = (n: number) => 440 * 2 ** ((n - 69) / 12);
// Original Dorian score: four eight-beat phrases, played by a plucked harp,
// soft organ/drone and distant bells. No downloads or licensed recordings.
const chords = [
  [50, 57, 62, 65],
  [48, 55, 60, 64],
  [53, 57, 60, 65],
  [55, 62, 65, 69],
];
const melody = [
  74, 0, 77, 76, 74, 69, 72, 0, 72, 76, 79, 0, 76, 72, 67, 0, 77, 0, 81, 79, 77, 74, 72, 0, 79, 77,
  74, 0, 72, 69, 74, 0,
];
export class GameAudio {
  private ctx: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private fxBus: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private beat = 0;
  private blocked = false;
  private disposed = false;
  private sources = new Set<AudioScheduledSourceNode>();
  private noise: AudioBuffer | null = null;
  private prefs: AudioPreferences;
  private recent: SoundCue[] = [];
  private played = 0;
  constructor(prefs: AudioPreferences) {
    this.prefs = prefs;
  }
  async unlock() {
    if (this.disposed || this.blocked) return;
    try {
      if (!this.ctx) {
        this.ctx = new AudioContext();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -16;
        this.compressor.ratio.value = 5;
        this.compressor.connect(this.ctx.destination);
        this.musicBus = this.ctx.createGain();
        this.fxBus = this.ctx.createGain();
        this.musicBus.connect(this.compressor);
        this.fxBus.connect(this.compressor);
        this.update(this.prefs);
        this.nextBeat = this.ctx.currentTime + 0.08;
        this.timer = setInterval(() => this.scheduleMusic(), 100);
      }
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.scheduleMusic();
    } catch {
      /* Audio must never prevent gameplay on unsupported devices. */
    }
  }
  update(prefs: AudioPreferences) {
    this.prefs = prefs;
    const t = this.ctx?.currentTime ?? 0;
    this.musicBus?.gain.setTargetAtTime(prefs.muted ? 0 : prefs.music * 0.5, t, 0.07);
    this.fxBus?.gain.setTargetAtTime(prefs.muted ? 0 : prefs.effects * 0.45, t, 0.025);
    if (prefs.muted) this.stopVoices();
  }
  setBlocked(blocked: boolean) {
    this.blocked = blocked;
    if (blocked) {
      this.stopVoices();
      void this.ctx?.suspend();
    } else if (this.ctx) {
      this.nextBeat = this.ctx.currentTime + 0.08;
      // Gesture handlers also retry resume if the browser requires activation.
      void this.ctx.resume().catch(() => {});
    }
  }
  private stopVoices() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.sources.clear();
  }
  private voice(
    freq: number,
    time: number,
    length: number,
    volume: number,
    bus: GainNode,
    type: OscillatorType = 'sine',
    endFreq = freq,
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), time + length);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
    osc.connect(gain);
    gain.connect(bus);
    this.sources.add(osc);
    osc.onended = () => {
      this.sources.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(time);
    osc.stop(time + length + 0.01);
  }
  private hit(time: number, duration: number, cutoff: number, volume: number) {
    const ctx = this.ctx!;
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      let seed = 12345;
      for (let i = 0; i < data.length; i++) {
        seed = (seed * 16807) % 2147483647;
        data[i] = seed / 1073741824 - 1;
      }
    }
    const source = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    source.buffer = this.noise;
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.fxBus!);
    this.sources.add(source);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    source.start(time);
    source.stop(time + duration + 0.01);
  }
  private scheduleMusic() {
    if (
      !this.ctx ||
      this.ctx.state !== 'running' ||
      this.blocked ||
      this.prefs.muted ||
      this.prefs.music === 0
    )
      return;
    if (this.nextBeat < this.ctx.currentTime) this.nextBeat = this.ctx.currentTime + 0.03;
    while (this.nextBeat < this.ctx.currentTime + 0.25) {
      const i = this.beat % 32,
        chord = chords[Math.floor(i / 8)],
        t = this.nextBeat;
      this.voice(midi(chord[i % 4] + 12), t, 1.3, 0.13, this.musicBus!, 'triangle');
      if (i % 8 === 0) for (const n of chord) this.voice(midi(n), t, 5.8, 0.055, this.musicBus!);
      if (melody[i]) {
        this.voice(midi(melody[i]), t + 0.02, 2.4, 0.1, this.musicBus!);
        this.voice(midi(melody[i]) * 2.004, t + 0.02, 0.9, 0.025, this.musicBus!);
      }
      this.beat++;
      this.nextBeat += 0.75;
    }
  }
  play(cue: SoundCue) {
    if (
      !this.ctx ||
      this.ctx.state !== 'running' ||
      this.blocked ||
      this.prefs.muted ||
      this.prefs.effects === 0
    )
      return;
    this.played++;
    this.recent = [...this.recent.slice(-11), cue];
    const t = this.ctx.currentTime + 0.01,
      bus = this.fxBus!;
    const notes = (list: number[], spacing = 0.09, duration = 0.4, volume = 0.22) =>
      list.forEach((n, i) =>
        this.voice(midi(n), t + i * spacing, duration, volume, bus, 'triangle'),
      );
    switch (cue) {
      case 'ui':
        this.voice(720, t, 0.055, 0.12, bus, 'sine', 520);
        break;
      case 'select':
        notes([74, 81], 0.055, 0.18, 0.16);
        break;
      case 'cancel':
        notes([69, 62], 0.055, 0.16, 0.13);
        break;
      case 'roll':
        for (let i = 0; i < 9; i++) {
          this.hit(t + i * 0.095, 0.09, 1800 + i * 300, 0.17);
          this.voice(180 + i * 24, t + i * 0.095, 0.1, 0.09, bus, 'triangle');
        }
        this.voice(220, t, 1.1, 0.1, bus, 'sine', 880);
        break;
      case 'step':
        for (let i = 0; i < 4; i++) {
          this.hit(t + i * 0.19, 0.09, 900, 0.17);
          this.voice(145, t + i * 0.19, 0.1, 0.15, bus, 'triangle', 80);
        }
        break;
      case 'capture':
        this.hit(t, 0.3, 5500, 0.55);
        this.voice(140, t, 0.5, 0.65, bus, 'sine', 35);
        notes([86, 74, 62], 0.045, 0.35);
        break;
      case 'deploy':
        notes([50, 57, 62, 69], 0.075, 0.5);
        break;
      case 'spell':
        this.voice(160, t, 0.65, 0.25, bus, 'sine', 1200);
        notes([74, 77, 81, 86], 0.1, 0.65, 0.18);
        break;
      case 'portal':
        notes([86, 81, 77, 74, 77, 81, 86], 0.065, 0.5, 0.14);
        break;
      case 'turn':
        notes([62, 69, 74], 0.14, 0.7);
        break;
      case 'bonus':
      case 'six':
        notes([74, 78, 81, 86], 0.08, 0.65);
        break;
      case 'finish':
        notes([62, 66, 69, 74], 0.14, 0.9);
        break;
      case 'victory':
        notes([62, 62, 69, 74, 73, 74, 78, 81, 86], 0.18, 1.2, 0.24);
        break;
      case 'result':
        notes([69, 74], 0.08, 0.38);
        break;
      case 'pass':
        notes([65, 62], 0.13, 0.3, 0.14);
        break;
      case 'pause':
        notes([69, 62], 0.08, 0.18, 0.14);
        break;
      case 'resume':
        notes([62, 69], 0.08, 0.18, 0.14);
        break;
    }
  }
  status() {
    return {
      state: this.ctx?.state ?? 'locked',
      musicBeats: this.beat,
      effectsPlayed: this.played,
      recent: this.recent,
      blocked: this.blocked,
      ...this.prefs,
    };
  }
  dispose() {
    this.disposed = true;
    if (this.timer) clearInterval(this.timer);
    this.stopVoices();
    void this.ctx?.close();
    this.ctx = null;
  }
}
