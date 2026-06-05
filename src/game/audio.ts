type AudioContextCtor = typeof AudioContext;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: AudioContextCtor;
}

export class NeonAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private loopTimer = 0;
  private enabled = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.context) {
      const AudioClass = window.AudioContext || (window as WindowWithWebkitAudio).webkitAudioContext;
      if (!AudioClass) return null;
      this.context = new AudioClass();
      this.master = this.context.createGain();
      this.master.gain.value = 0.08;
      this.master.connect(this.context.destination);
    }
    return this.context;
  }

  start(): void {
    const context = this.ensureContext();
    if (!context || !this.master || this.enabled) return;
    this.enabled = true;
    void context.resume();
    this.scheduleLoop();
  }

  stop(): void {
    this.enabled = false;
    if (this.loopTimer) window.clearTimeout(this.loopTimer);
    this.loopTimer = 0;
  }

  blip(kind: "swap" | "match" | "win" | "lose" = "match"): void {
    const context = this.ensureContext();
    if (!context || !this.master) return;
    const master = this.master;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    const frequency = kind === "win" ? 880 : kind === "lose" ? 180 : kind === "swap" ? 420 : 620;
    osc.type = kind === "lose" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(frequency, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(120, frequency * 1.35), now + 0.1);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(kind === "win" ? 0.16 : 0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  private scheduleLoop(): void {
    if (!this.enabled) return;
    const context = this.ensureContext();
    if (!context || !this.master) return;
    const master = this.master;
    const now = context.currentTime;
    [196, 294, 392, 587].forEach((frequency, index) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now + index * 0.18);
      gain.gain.setValueAtTime(0.001, now + index * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.035, now + index * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.18 + 0.16);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + index * 0.18);
      osc.stop(now + index * 0.18 + 0.2);
    });
    this.loopTimer = window.setTimeout(() => this.scheduleLoop(), 1500);
  }
}

export const neonAudio = new NeonAudio();
