/**
 * Reveal Journey State Manager
 *
 * Manages the one-time post-payment reveal flow:
 *   Payment → Confirming → /unlock-reveal → /reveal → /shirt-confirm → /team-hub
 *
 * Flags are stored in localStorage keyed by registration ID so that
 * different users on the same device don't share state.
 *
 * IMPORTANT: These flags are visual-only. They never affect payment,
 * unlock status, shirt size, or any server-side state.
 */

const KEY_UNLOCK_REVEAL = (id: string) => `sd_seen_unlock_reveal_${id}`;
const KEY_TEAM_REVEAL = (id: string) => `sd_seen_team_reveal_${id}`;
const KEY_SHIRT_CONFIRM = (id: string) => `sd_seen_shirt_confirm_${id}`;

// ─── Getters ──────────────────────────────────────────────────────────────────

export function hasSeenUnlockReveal(registrationId: string): boolean {
  return localStorage.getItem(KEY_UNLOCK_REVEAL(registrationId)) === "true";
}

export function hasSeenTeamReveal(registrationId: string): boolean {
  return localStorage.getItem(KEY_TEAM_REVEAL(registrationId)) === "true";
}

export function hasSeenShirtConfirm(registrationId: string): boolean {
  return localStorage.getItem(KEY_SHIRT_CONFIRM(registrationId)) === "true";
}

export function hasCompletedFullRevealFlow(registrationId: string): boolean {
  return (
    hasSeenUnlockReveal(registrationId) &&
    hasSeenTeamReveal(registrationId) &&
    hasSeenShirtConfirm(registrationId)
  );
}

// ─── Setters ──────────────────────────────────────────────────────────────────

export function markUnlockRevealSeen(registrationId: string): void {
  localStorage.setItem(KEY_UNLOCK_REVEAL(registrationId), "true");
}

export function markTeamRevealSeen(registrationId: string): void {
  localStorage.setItem(KEY_TEAM_REVEAL(registrationId), "true");
}

export function markShirtConfirmSeen(registrationId: string): void {
  localStorage.setItem(KEY_SHIRT_CONFIRM(registrationId), "true");
}

// ─── Replay ───────────────────────────────────────────────────────────────────

/**
 * Reset the visual reveal flags so the user can replay the animations.
 * Does NOT reset payment, unlock status, shirt size, or any server state.
 */
export function resetRevealJourneyForReplay(registrationId: string): void {
  // Clear both reveal flags so the full sequence replays: /reveal → /unlock-reveal → /shirt-confirm
  localStorage.removeItem(KEY_TEAM_REVEAL(registrationId));
  localStorage.removeItem(KEY_UNLOCK_REVEAL(registrationId));
  // Keep shirt confirm — no need to re-confirm shirt size after replay
}

// ─── Next route helper ────────────────────────────────────────────────────────

/**
 * Given the current registration ID and paid/unlocked status,
 * returns the correct next route for a paid user.
 *
 * Correct sequence:
 *   Payment → Confirming → /reveal (team reveal, big moment) → /unlock-reveal (player pack celebration) → /shirt-confirm → /team-hub
 *
 * Logic:
 *   - Not paid → /holding (should not be here)
 *   - Paid, not seen team reveal → /reveal  (FIRST: team reveal with confetti)
 *   - Paid, seen team reveal, not seen unlock reveal → /unlock-reveal  (SECOND: player pack animation)
 *   - Paid, seen unlock reveal, not seen shirt confirm → /shirt-confirm
 *   - Paid, completed full flow → /team-hub
 */
export function getNextRevealRoute(registrationId: string): string {
  if (!hasSeenTeamReveal(registrationId)) return "/reveal";
  if (!hasSeenUnlockReveal(registrationId)) return "/unlock-reveal";
  if (!hasSeenShirtConfirm(registrationId)) return "/shirt-confirm";
  return "/team-hub";
}
