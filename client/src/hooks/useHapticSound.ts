/**
 * useHapticSound — haptic vibration + audio sounds
 *
 * Uses pre-loaded HTML Audio elements with MP3 files.
 * This is the most reliable approach for iOS Safari — Web Audio API
 * is unreliable on iOS but HTMLAudioElement works consistently.
 *
 * Sounds are preloaded on first import so they play instantly on tap.
 */

export type SoundType =
  | "tap"       // soft click — nav tabs, standard buttons
  | "switch"    // whoosh — tab switch
  | "powerup"   // electric zap — power up initiate
  | "unlock"    // chime — captain card, roster open
  | "confirm"   // two-tone — vote YES, login success
  | "error";    // buzz — failed actions

const SOUND_URLS: Record<SoundType, string> = {
  tap:     "/manus-storage/tap_175c98ca.mp3",
  switch:  "/manus-storage/switch_60180a83.mp3",
  powerup: "/manus-storage/powerup_e37ec19c.mp3",
  unlock:  "/manus-storage/unlock_4ff389c4.mp3",
  confirm: "/manus-storage/confirm_8a7df15d.mp3",
  error:   "/manus-storage/error_d32667d8.mp3",
};

// Pre-create Audio elements so they're ready to play instantly
const audioElements: Partial<Record<SoundType, HTMLAudioElement>> = {};

function getAudio(type: SoundType): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audioElements[type]) {
    try {
      const el = new Audio(SOUND_URLS[type]);
      el.preload = "auto";
      el.volume = 0.5;
      audioElements[type] = el;
    } catch {
      return null;
    }
  }
  return audioElements[type] ?? null;
}

// Preload all sounds on module import
if (typeof window !== "undefined") {
  (Object.keys(SOUND_URLS) as SoundType[]).forEach(getAudio);
}

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
    const el = getAudio(type);
    if (!el) return;
    // Reset to start so rapid taps replay immediately
    el.currentTime = 0;
    const promise = el.play();
    if (promise) {
      promise.catch(() => {
        // Autoplay blocked — try cloning for iOS
        try {
          const clone = el.cloneNode() as HTMLAudioElement;
          clone.volume = 0.5;
          clone.play().catch(() => {});
        } catch {
          // silently ignore
        }
      });
    }
  } catch {
    // silently ignore
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
