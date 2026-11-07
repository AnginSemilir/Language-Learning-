// Little sounds for the games, made on the spot with Web Audio: no files to
// download, and nothing plays until a game is started by a tap.

type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as AudioWindow;
  const Context = w.AudioContext ?? w.webkitAudioContext;
  if (!Context) return null;
  try {
    context ??= new Context();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  } catch {
    return null;
  }
}

function tone(
  frequency: number,
  at: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.08
) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + at;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

/** A note `semitones` above middle C. */
const note = (semitones: number) => 261.63 * 2 ** (semitones / 12);

export const sfx = {
  right() {
    tone(note(19), 0, 0.12);
    tone(note(26), 0.07, 0.18);
  },
  wrong() {
    tone(note(-5), 0, 0.22, "triangle", 0.1);
    tone(note(-10), 0.09, 0.26, "triangle", 0.08);
  },
  /** A rising run, longer for a bigger combo. */
  combo(level: number) {
    const steps = [12, 16, 19, 24, 28].slice(0, Math.min(5, level + 1));
    steps.forEach((s, i) => tone(note(s), i * 0.055, 0.14, "square", 0.035));
  },
  tick() {
    tone(note(21), 0, 0.05, "square", 0.025);
  },
  go() {
    tone(note(12), 0, 0.1);
    tone(note(19), 0.1, 0.22);
  },
  end() {
    const notes = [19, 16, 12, 7];
    notes.forEach((s, i) => tone(note(s), i * 0.13, 0.22, "triangle"));
  },
  best() {
    const notes = [12, 16, 19, 24, 19, 24];
    notes.forEach((s, i) => tone(note(s), i * 0.09, 0.16));
  },
};
