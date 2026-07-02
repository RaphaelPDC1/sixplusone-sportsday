/**
 * useHapticSound
 *
 * iOS Safari rule: audio.play() MUST be called synchronously and directly
 * inside a user gesture handler (touchstart/touchend/click).
 * Any function call wrapping breaks the gesture chain on iOS.
 *
 * Solution: return a play() function that creates a fresh Audio element
 * and calls .play() immediately — no async, no wrapper functions.
 */

export type SoundType =
  | "tap"
  | "switch"
  | "powerup"
  | "unlock"
  | "confirm"
  | "error";

const URLS: Record<SoundType, string> = {
  tap:     "/manus-storage/tap_175c98ca.mp3",
  switch:  "/manus-storage/switch_60180a83.mp3",
  powerup: "/manus-storage/powerup_e37ec19c.mp3",
  unlock:  "/manus-storage/unlock_4ff389c4.mp3",
  confirm: "/manus-storage/confirm_8a7df15d.mp3",
  error:   "/manus-storage/error_d32667d8.mp3",
};

const VIBRATION: Record<SoundType, number | number[]> = {
  tap:     10,
  switch:  10,
  powerup: [30, 20, 30],
  unlock:  25,
  confirm: [20, 10, 20],
  error:   [15, 10, 15],
};

export function useHapticSound() {
  return function play(type: SoundType) {
    // Vibrate (Android only — iOS blocks this)
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(VIBRATION[type]);
      }
    } catch { /* ignore */ }

    // Play sound — create fresh Audio each time so rapid taps work
    // This must stay synchronous and direct for iOS Safari
    try {
      const a = new Audio(URLS[type]);
      a.volume = 1.0;
      a.play().catch(() => { /* autoplay blocked — user hasn't interacted yet */ });
    } catch { /* ignore */ }
  };
}
