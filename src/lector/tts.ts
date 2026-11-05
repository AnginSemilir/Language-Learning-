// Ported from Lector (heuwels/lector@eb393ce, AGPL-3.0-only): src/lib/tts.ts
// Only the browser speechSynthesis path, fixed to Indonesian. Lector's managed
// Google TTS goes through its server and is not available here.

export const DEFAULT_RATE = 0.9;
const TTS_LANG = "id-ID";

const PREFERRED_VOICE_PATTERNS = [
  /google/i,
  /premium/i,
  /enhanced/i,
  /natural/i,
  /neural/i,
];
const AVOID_VOICE_PATTERNS = [/espeak/i, /mbrola/i];

let cachedVoice: SpeechSynthesisVoice | undefined;

export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  let score = 0;
  if (voice.localService) score += 5;
  for (const pattern of PREFERRED_VOICE_PATTERNS) {
    if (pattern.test(voice.name)) {
      score += 10;
      break;
    }
  }
  for (const pattern of AVOID_VOICE_PATTERNS) {
    if (pattern.test(voice.name)) {
      score -= 20;
      break;
    }
  }
  if (voice.lang === TTS_LANG) score += 3;
  if (voice.lang.startsWith("id")) score += 2;
  return score;
}

function indonesianVoice(): SpeechSynthesisVoice | undefined {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.replace("_", "-").startsWith("id"));
  cachedVoice = voices.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0];
  return cachedVoice;
}

export function speak(text: string, rate: number = DEFAULT_RATE): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = indonesianVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? TTS_LANG;
  utterance.rate = Math.max(0.1, Math.min(10, rate));
  window.speechSynthesis.speak(utterance);
}
