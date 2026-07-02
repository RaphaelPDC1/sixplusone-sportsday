/**
 * useHapticSound — haptic vibration + Web Audio API sounds
 *
 * iOS Safari REQUIRES:
 *   1. AudioContext created synchronously inside a user gesture handler
 *   2. Sound played synchronously in the same call stack as the tap
 *
 * Strategy: create a new AudioContext per sound call (cheap, <1ms).
 * On iOS, each new AudioContext starts in "running" state when created
 * inside a user gesture, so sounds play immediately.
 */

export type SoundType =
  | "tap"       // soft click — nav tabs, standard buttons
  | "switch"    // whoosh — tab switch
  | "powerup"   // electric zap — power up initiate
  | "unlock"    // chime — captain card, roster open
  | "confirm"   // two-tone — vote YES, login success
  | "error";    // buzz — failed actions

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // silently ignore — iOS blocks vibration
  }
}

function playSound(type: SoundType) {
  try {
    // Create a fresh AudioContext synchronously inside the gesture handler
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    // iOS may still start suspended — resume synchronously
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    switch (type) {
      case "tap": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.07);
        osc.onended = () => ctx.close();
        break;
      }

      case "switch": {
        const bufferSize = Math.floor(ctx.sampleRate * 0.12);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2) * 0.5;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(2500, now);
        filter.frequency.exponentialRampToValueAtTime(700, now + 0.12);
        filter.Q.value = 0.8;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        source.start(now);
        source.onended = () => ctx.close();
        break;
      }

      case "powerup": {
        // Layer 1: electric sweep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = "sawtooth";
        osc1.frequency.setValueAtTime(80, now);
        osc1.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc1.start(now);
        osc1.stop(now + 0.18);
        // Layer 2: crackle
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "square";
        osc2.frequency.setValueAtTime(440, now + 0.05);
        osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
        gain2.gain.setValueAtTime(0.0, now);
        gain2.gain.setValueAtTime(0.1, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc2.start(now);
        osc2.stop(now + 0.2);
        osc2.onended = () => ctx.close();
        break;
      }

      case "unlock": {
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.value = freq;
          const t = now + i * 0.07;
          gain.gain.setValueAtTime(0.0, t);
          gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.start(t);
          osc.stop(t + 0.26);
          if (i === notes.length - 1) osc.onended = () => ctx.close();
        });
        break;
      }

      case "confirm": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.23);
        osc.onended = () => ctx.close();
        break;
      }

      case "error": {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "square";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.05);
        osc.frequency.setValueAtTime(140, now + 0.1);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.19);
        osc.onended = () => ctx.close();
        break;
      }
    }
  } catch {
    // silently ignore any audio errors
  }
}

const VIBRATION_MAP: Record<SoundType, number | number[]> = {
  tap:     10,
  switch:  10,
  powerup: [30, 20, 30],
  unlock:  25,
  confirm: [20, 10, 20],
  error:   [15, 10, 15],
};

export function useHapticSound() {
  return (type: SoundType) => {
    vibrate(VIBRATION_MAP[type]);
    playSound(type);
  };
}
