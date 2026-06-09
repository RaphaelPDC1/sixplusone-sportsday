/**
 * Reveal Journey State Manager
 *
 * Manages the post-payment/post-unlock reveal flow.
 *
 * TWO DISTINCT JOURNEYS:
 *
 * PAID (Priority) users — accessType === "priority":
 *   /reveal → /unlock-reveal → /shirt-confirm → /team-hub
 *
 * FREE users — accessType === "free" (unlocked on July 4th 8pm):
 *   /reveal → /team-hub  (NO player pack animation, NO shirt confirm)
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

/**
 * Returns true if a PAID user has completed their full reveal flow.
 * For free users, only team reveal + team-hub are required.
 */
export function hasCompletedFullRevealFlow(
  registrationId: string,
  accessType?: string | null
): boolean {
  const isPaid = accessType === "priority";
  if (isPaid) {
    return (
      hasSeenTeamReveal(registrationId) &&
      hasSeenUnlockReveal(registrationId) &&
      hasSeenShirtConfirm(registrationId)
    );
  }
  // Free users: only need to have seen the team reveal
  return hasSeenTeamReveal(registrationId);
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
 *
 * For PAID users: resets team reveal + unlock reveal (shirt confirm stays)
 * For FREE users: resets only team reveal
 */
export function resetRevealJourneyForReplay(
  registrationId: string,
  accessType?: string | null
): void {
  localStorage.removeItem(KEY_TEAM_REVEAL(registrationId));
  if (accessType === "priority") {
    localStorage.removeItem(KEY_UNLOCK_REVEAL(registrationId));
    // Keep shirt confirm — no need to re-confirm shirt size after replay
  }
}

// ─── Next route helper ────────────────────────────────────────────────────────

/**
 * Given the current registration ID and access type,
 * returns the correct next route in the reveal journey.
 *
 * PAID journey (accessType === "priority"):
 *   /reveal → /unlock-reveal → /shirt-confirm → /team-hub
 *
 * FREE journey (accessType === "free" or null):
 *   /reveal → /team-hub  (skip player pack and shirt confirm)
 *
 * @param registrationId - The user's registration ID (used for localStorage flags)
 * @param accessType - "priority" for paid users, "free" or null for free users
 */
export function getNextRevealRoute(
  registrationId: string,
  accessType?: string | null
): string {
  const isPaid = accessType === "priority";

  // Both paid and free users start with team reveal
  if (!hasSeenTeamReveal(registrationId)) return "/reveal";

  if (isPaid) {
    // Paid-only steps: player pack animation → shirt confirm
    if (!hasSeenUnlockReveal(registrationId)) return "/unlock-reveal";
    if (!hasSeenShirtConfirm(registrationId)) return "/shirt-confirm";
  }

  // Both end at team hub
  return "/team-hub";
}
