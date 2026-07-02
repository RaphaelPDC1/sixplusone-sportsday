/**
 * useHapticSound — synthesised Web Audio API sounds + vibration haptics
 * No external files. All sounds generated in-browser.
 */

type SoundType =
  | "tap"        // soft click — nav tabs, standard buttons
  | "switch"     // whoosh — tab switch, modal open
  | "powerup"    // electric zap — power up initiate / vote YES
  | "unlock"     // chime — captain card tap / roster open
  | "confirm"    // heavy confirm — destructive/important confirm
  | "error";     // buzz — failed actions

type HapticStrength = "light" | "medium" | "heavy";

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // Resume if suspended (browser autoplay policy)
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

function playSoftClick() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(1200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.04);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.06);
}

function playWhoosh() {
  const ctx = getAudioCtx();
  const bufferSize = ctx.sampleRate * 0.15;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(3000, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
  filter.Q.value = 0.8;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
}

function playPowerUpZap() {
  const ctx = getAudioCtx();
  // Layer 1: electric sweep
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(80, ctx.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.12);
  gain1.gain.setValueAtTime(0.15, ctx.currentTime);
  gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc1.start(ctx.currentTime);
  osc1.stop(ctx.currentTime + 0.18);
  // Layer 2: crackle
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.type = "square";
  osc2.frequency.setValueAtTime(440, ctx.currentTime + 0.05);
  osc2.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
  gain2.gain.setValueAtTime(0.0, ctx.currentTime);
  gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc2.start(ctx.currentTime);
  osc2.stop(ctx.currentTime + 0.2);
}

function playUnlockChime() {
  const ctx = getAudioCtx();
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    const t = ctx.currentTime + i * 0.07;
    gain.gain.setValueAtTime(0.0, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t);
    osc.stop(t + 0.25);
  });
}

function playConfirm() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.22);
}

function playError() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.setValueAtTime(180, ctx.currentTime + 0.05);
  osc.frequency.setValueAtTime(140, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.18);
}

const HAPTIC_PATTERNS: Record<HapticStrength, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: [30, 20, 30],
};

const SOUND_HAPTIC_MAP: Record<SoundType, HapticStrength> = {
  tap: "light",
  switch: "light",
  powerup: "heavy",
  unlock: "medium",
  confirm: "heavy",
  error: "medium",
};

export function triggerHapticSound(type: SoundType) {
  try {
    // Haptic
    vibrate(HAPTIC_PATTERNS[SOUND_HAPTIC_MAP[type]]);
    // Sound
    switch (type) {
      case "tap":     playSoftClick(); break;
      case "switch":  playWhoosh(); break;
      case "powerup": playPowerUpZap(); break;
      case "unlock":  playUnlockChime(); break;
      case "confirm": playConfirm(); break;
      case "error":   playError(); break;
    }
  } catch {
    // Silently fail if audio context is unavailable
  }
}

/** React hook that returns the trigger function */
export function useHapticSound() {
  return triggerHapticSound;
}
