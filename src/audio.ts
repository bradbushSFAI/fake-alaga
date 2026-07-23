// Code-generated NES-style chiptune engine: square/triangle leads, noise drums.
// No audio assets — everything is synthesized in WebAudio.

type Step = [string | null, number]; // [note like "C4" or null=rest, length in 8th-notes]

interface Track {
  bpm: number;
  lead: Step[];
  lead2?: Step[];
  bass: Step[];
  drums: string; // per 8th: "k"=kick, "s"=snare, "h"=hat, "."=rest
}

const NOTE_IDX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function freq(note: string): number {
  const m = note.match(/^([A-G])([#b]?)(\d)$/);
  if (!m) return 440;
  let n = NOTE_IDX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const midi = (parseInt(m[3]) + 1) * 12 + n;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function expand(steps: Step[]): (string | null)[] {
  const out: (string | null)[] = [];
  for (const [note, len] of steps) {
    out.push(note);
    for (let i = 1; i < len; i++) out.push(undefined as unknown as null); // sustain marker
  }
  return out;
}

// --- Track data ------------------------------------------------------------
// Compact motifs; each world gets its own key/feel.
const T = (bpm: number, lead: Step[], bass: Step[], drums: string, lead2?: Step[]): Track => ({
  bpm,
  lead,
  bass,
  drums,
  lead2,
});

const TRACKS: Record<string, Track> = {
  menu: T(
    112,
    [["A4", 2], ["C5", 2], ["E5", 2], ["C5", 1], ["A4", 1], ["G4", 2], ["B4", 2], ["D5", 3], [null, 1],
     ["F4", 2], ["A4", 2], ["C5", 2], ["A4", 1], ["F4", 1], ["E4", 2], ["G4", 2], ["A4", 3], [null, 1]],
    [["A2", 2], ["A2", 2], ["G2", 2], ["G2", 2], ["F2", 2], ["F2", 2], ["E2", 2], ["E2", 2],
     ["A2", 2], ["A2", 2], ["G2", 2], ["G2", 2], ["F2", 2], ["F2", 2], ["E2", 2], ["E2", 2]],
    "k.h.s.h.k.h.s.h.k.h.s.h.k.h.s.h."
  ),
  w0: T(
    132,
    [["E5", 1], ["B4", 1], ["E5", 1], ["G5", 1], ["F#5", 1], ["D5", 1], ["B4", 2],
     ["C5", 1], ["G4", 1], ["C5", 1], ["E5", 1], ["D5", 1], ["B4", 1], ["G4", 2]],
    [["E2", 2], ["E3", 2], ["D2", 2], ["D3", 2], ["C2", 2], ["C3", 2], ["B2", 2], ["B2", 2]],
    "k.h.s.h.k.h.s.hh"
  ),
  w1: T(
    124,
    [["D5", 2], ["F5", 1], ["D5", 1], ["A4", 2], ["C5", 2], ["Bb4", 2], ["D5", 1], ["F5", 1], ["A5", 2], ["G5", 2]],
    [["D2", 2], ["D3", 2], ["Bb2", 2], ["Bb2", 2], ["C2", 2], ["C3", 2], ["A2", 2], ["A2", 2]],
    "k.hhs.h.k.hhs.h."
  ),
  w2: T(
    108,
    [["G4", 3], ["Bb4", 1], ["D5", 3], ["C5", 1], ["Eb5", 3], ["D5", 1], ["Bb4", 2], ["G4", 2]],
    [["G2", 4], ["Eb2", 4], ["C2", 4], ["D2", 4]],
    "k...s...k..ks...",
    [["D4", 3], ["F4", 1], ["Bb4", 3], ["A4", 1], ["C5", 3], ["Bb4", 1], ["F4", 2], ["D4", 2]]
  ),
  w3: T(
    140,
    [["A4", 1], ["A4", 1], ["C5", 1], ["A4", 1], ["E5", 1], ["D5", 1], ["C5", 1], ["B4", 1],
     ["A4", 1], ["A4", 1], ["C5", 1], ["E5", 1], ["G5", 2], ["F5", 1], ["E5", 1]],
    [["A2", 1], ["A2", 1], ["A3", 1], ["A2", 1], ["F2", 1], ["F2", 1], ["F3", 1], ["F2", 1],
     ["G2", 1], ["G2", 1], ["G3", 1], ["G2", 1], ["E2", 1], ["E2", 1], ["E3", 1], ["E2", 1]],
    "k.h.s.h.k.h.s.h."
  ),
  w4: T(
    150,
    [["C5", 1], ["C5", 1], ["Eb5", 1], ["C5", 1], ["G5", 1], ["F5", 1], ["Eb5", 1], ["D5", 1],
     ["C5", 1], ["Eb5", 1], ["G5", 1], ["Bb5", 1], ["Ab5", 2], ["G5", 1], ["F5", 1]],
    [["C2", 1], ["C3", 1], ["C2", 1], ["C3", 1], ["Ab2", 1], ["Ab2", 1], ["Ab2", 1], ["Ab2", 1],
     ["Bb2", 1], ["Bb2", 1], ["Bb2", 1], ["Bb2", 1], ["G2", 1], ["G2", 1], ["G2", 1], ["G2", 1]],
    "kkh.s.h.kkh.s.hh"
  ),
  boss: T(
    160,
    [["E4", 1], ["E5", 1], ["E4", 1], ["D5", 1], ["E4", 1], ["C5", 1], ["B4", 1], ["C5", 1],
     ["E4", 1], ["E5", 1], ["F5", 1], ["E5", 1], ["D5", 1], ["C5", 1], ["B4", 1], ["G4", 1]],
    [["E2", 1], ["E2", 1], ["E3", 1], ["E2", 1], ["C2", 1], ["C2", 1], ["C3", 1], ["C2", 1],
     ["D2", 1], ["D2", 1], ["D3", 1], ["D2", 1], ["B2", 1], ["B2", 1], ["B2", 1], ["B2", 1]],
    "kkhksh.kkkhksh.s"
  ),
  cutscene: T(
    92,
    [["C5", 3], ["E5", 1], ["G5", 4], ["F5", 3], ["E5", 1], ["D5", 4], ["E5", 3], ["C5", 1], ["A4", 4], ["G4", 8]],
    [["C3", 4], ["F2", 4], ["A2", 4], ["G2", 4], ["C3", 4], ["F2", 4], ["G2", 4], ["C3", 4]],
    "................"
  ),
  victory: T(
    120,
    [["C5", 1], ["E5", 1], ["G5", 1], ["C6", 2], ["G5", 1], ["C6", 4], [null, 2],
     ["A5", 1], ["G5", 1], ["E5", 1], ["G5", 2], ["C5", 1], ["C5", 4], [null, 2]],
    [["C3", 4], ["G2", 4], ["F2", 4], ["C3", 4], ["A2", 4], ["G2", 4], ["C3", 8]],
    "k.h.s.h.k.h.s.h."
  ),
};

// --- Engine ---------------------------------------------------------------

class ChipAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private timer: number | null = null;
  private current: string | null = null;
  private stepIdx = 0;
  private nextTime = 0;
  muted = false;

  private ensure(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.55;
        this.musicGain.connect(this.master);
      } catch {
        return null;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  unlock(): void {
    this.ensure();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // -- primitive voices --
  private tone(
    f0: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    when = 0,
    slideTo?: number,
    dest?: AudioNode
  ): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(dest ?? this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, when = 0, low = false, dest?: AudioNode): void {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = low ? "lowpass" : "highpass";
    filt.frequency.value = low ? 400 : 4000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest ?? this.master);
    src.start(t);
  }

  // -- sound effects --
  sfx(name: string): void {
    if (this.muted) return;
    switch (name) {
      case "shoot":
        this.tone(880, 0.08, "square", 0.12, 0, 1400);
        break;
      case "missile":
        this.tone(300, 0.25, "sawtooth", 0.1, 0, 900);
        break;
      case "boom":
        this.noise(0.25, 0.25, 0, true);
        this.tone(160, 0.2, "square", 0.15, 0, 40);
        break;
      case "boomBig":
        this.noise(0.6, 0.35, 0, true);
        this.tone(120, 0.5, "square", 0.2, 0, 30);
        break;
      case "hit":
        this.tone(200, 0.06, "square", 0.1, 0, 120);
        break;
      case "bosshit":
        this.tone(140, 0.08, "square", 0.14, 0, 90);
        break;
      case "powerup":
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.09, "square", 0.12, i * 0.06));
        break;
      case "shield":
        this.tone(400, 0.3, "triangle", 0.15, 0, 800);
        break;
      case "extraLife":
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.1, "square", 0.12, i * 0.07));
        break;
      case "dock":
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.12, "triangle", 0.15, i * 0.09));
        break;
      case "beam":
        this.tone(1200, 0.7, "sawtooth", 0.06, 0, 300);
        this.tone(1180, 0.7, "square", 0.04, 0.02, 280);
        break;
      case "capture":
        [900, 700, 500, 350, 250].forEach((f, i) => this.tone(f, 0.14, "square", 0.12, i * 0.1));
        break;
      case "rescue":
        [350, 500, 700, 900, 1200].forEach((f, i) => this.tone(f, 0.12, "square", 0.12, i * 0.08));
        break;
      case "playerDie":
        this.noise(0.7, 0.3, 0, true);
        [400, 300, 200, 120, 70].forEach((f, i) => this.tone(f, 0.16, "square", 0.16, i * 0.09));
        break;
      case "warning":
        this.tone(700, 0.18, "square", 0.14);
        this.tone(700, 0.18, "square", 0.14, 0.3);
        break;
      case "mine":
        this.tone(500, 0.1, "square", 0.1, 0, 200);
        break;
      case "menuMove":
        this.tone(600, 0.05, "square", 0.08);
        break;
      case "menuSel":
        this.tone(800, 0.08, "square", 0.1, 0, 1200);
        break;
      case "type":
        this.tone(1100, 0.02, "square", 0.04);
        break;
      case "code":
        [660, 880, 1320].forEach((f, i) => this.tone(f, 0.12, "square", 0.12, i * 0.1));
        break;
      case "bonus":
        this.tone(1047, 0.08, "square", 0.1);
        this.tone(1319, 0.1, "square", 0.1, 0.08);
        break;
    }
  }

  // -- music --
  play(track: string): void {
    if (this.current === track) return;
    this.stop();
    if (!TRACKS[track]) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.current = track;
    this.stepIdx = 0;
    this.nextTime = ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 40);
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.current = null;
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.current || !this.musicGain) return;
    const tr = TRACKS[this.current];
    const stepDur = 60 / tr.bpm / 2; // 8th notes
    const lead = expand(tr.lead);
    const lead2 = tr.lead2 ? expand(tr.lead2) : null;
    const bass = expand(tr.bass);
    const n = Math.max(lead.length, bass.length, tr.drums.length);
    while (this.nextTime < ctx.currentTime + 0.15) {
      const i = this.stepIdx % n;
      const when = this.nextTime - ctx.currentTime;
      const ln = lead[i % lead.length];
      if (ln) this.tone(freq(ln), stepDur * 0.9, "square", 0.09, when, undefined, this.musicGain);
      if (lead2) {
        const l2 = lead2[i % lead2.length];
        if (l2) this.tone(freq(l2), stepDur * 0.9, "square", 0.05, when, undefined, this.musicGain);
      }
      const bn = bass[i % bass.length];
      if (bn) this.tone(freq(bn), stepDur * 0.95, "triangle", 0.16, when, undefined, this.musicGain);
      const d = tr.drums[i % tr.drums.length];
      if (d === "k") {
        this.tone(110, 0.1, "square", 0.14, when, 40, this.musicGain);
      } else if (d === "s") {
        this.noise(0.09, 0.12, when, false, this.musicGain);
      } else if (d === "h") {
        this.noise(0.03, 0.05, when, false, this.musicGain);
      }
      this.nextTime += stepDur;
      this.stepIdx++;
    }
  }
}

export const audio = new ChipAudio();
