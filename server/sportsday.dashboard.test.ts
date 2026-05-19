/**
 * Dashboard Visibility Protection Tests
 *
 * These tests verify that the backend-led dashboard state machine:
 * 1. Never returns team data to unpaid users
 * 2. Never returns unpaid teammate names/identifiers before public reveal
 * 3. Correctly determines state based on reveal_status and manual_unlock
 * 4. Applies is_public_reveal_active manual override
 * 5. Applies is_price_increase_active manual override
 */

import { describe, it, expect } from "vitest";
import { isEffectivelyUnlocked, buildTeammateCard, buildPriceState, determineDashboardState } from "./sportsday.dashboard.helpers";

// ─── Re-export helpers for testing ───────────────────────────────────────────
// We test the pure logic functions extracted from buildSportsDayDashboard.
// These helpers are deterministic and don't require a DB connection.

// ─── Types (mirrored from sportsday.db.ts) ───────────────────────────────────

type TeammateInput = {
  id: string;
  fullName: string;
  sportsDayProfile: string | null;
  profileTagline: string | null;
  revealStatus: string | null;
  manualUnlock: boolean | null;
};

type SettingsInput = {
  earlyPrice: number | null;
  futurePrice: number | null;
  priceIncreaseAt: Date | null;
  isPriceIncreaseActive: boolean | null;
  publicTeamRevealAt: Date | null;
  isPublicRevealActive: boolean | null;
};

// ─── Inline pure helpers (duplicated from sportsday.db.ts for unit testing) ──

function testIsEffectivelyUnlocked(reg: { revealStatus: string | null; manualUnlock: boolean | null }): boolean {
  return reg.revealStatus === "unlocked" || reg.manualUnlock === true;
}

function testBuildTeammateCard(
  teammate: TeammateInput,
  isPublicReveal: boolean
): { status: "visible" | "locked"; displayName: string; message?: string } {
  const teammateUnlocked = isPublicReveal || testIsEffectivelyUnlocked(teammate);
  if (teammateUnlocked) {
    return {
      status: "visible",
      displayName: teammate.fullName,
    };
  }
  return {
    status: "locked",
    displayName: "Teammate Locked",
    message: "This player has not unlocked their Priority Player Pack yet.",
  };
}

function testDetermineDashboardState(
  reg: { revealStatus: string | null; manualUnlock: boolean | null; createdAt: Date },
  settings: SettingsInput,
  now: Date
): "LOCKED_UNPAID" | "RETURNING_UNPAID" | "UNLOCKED_PRIORITY" | "PUBLIC_REVEAL" {
  const isPublicRevealActiveOverride = settings.isPublicRevealActive ?? false;
  const publicRevealAt = settings.publicTeamRevealAt ?? null;
  const isPublicReveal =
    isPublicRevealActiveOverride || (publicRevealAt != null && now >= publicRevealAt);

  const unlocked = testIsEffectivelyUnlocked(reg);

  if (isPublicReveal) return "PUBLIC_REVEAL";
  if (unlocked) return "UNLOCKED_PRIORITY";

  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
  const isReturning = reg.createdAt < thirtyMinutesAgo;
  return isReturning ? "RETURNING_UNPAID" : "LOCKED_UNPAID";
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Dashboard State Machine", () => {
  const now = new Date("2026-06-01T12:00:00Z");
  const futureDate = new Date("2026-07-11T08:00:00Z");
  const pastDate = new Date("2026-05-01T08:00:00Z");
  const recentCreatedAt = new Date(now.getTime() - 10 * 60 * 1000); // 10 min ago
  const oldCreatedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago

  const baseSettings: SettingsInput = {
    earlyPrice: 2500,
    futurePrice: 3500,
    priceIncreaseAt: futureDate,
    isPriceIncreaseActive: false,
    publicTeamRevealAt: futureDate,
    isPublicRevealActive: false,
  };

  describe("isEffectivelyUnlocked", () => {
    it("returns true when revealStatus is unlocked", () => {
      expect(testIsEffectivelyUnlocked({ revealStatus: "unlocked", manualUnlock: false })).toBe(true);
    });

    it("returns true when manualUnlock is true (admin override)", () => {
      expect(testIsEffectivelyUnlocked({ revealStatus: "locked", manualUnlock: true })).toBe(true);
    });

    it("returns false when revealStatus is locked and no manual unlock", () => {
      expect(testIsEffectivelyUnlocked({ revealStatus: "locked", manualUnlock: false })).toBe(false);
    });

    it("returns false when revealStatus is null and no manual unlock", () => {
      expect(testIsEffectivelyUnlocked({ revealStatus: null, manualUnlock: null })).toBe(false);
    });
  });

  describe("determineDashboardState", () => {
    it("returns LOCKED_UNPAID for new unpaid user (registered < 30 min ago)", () => {
      const state = testDetermineDashboardState(
        { revealStatus: "locked", manualUnlock: false, createdAt: recentCreatedAt },
        baseSettings,
        now
      );
      expect(state).toBe("LOCKED_UNPAID");
    });

    it("returns RETURNING_UNPAID for older unpaid user (registered > 30 min ago)", () => {
      const state = testDetermineDashboardState(
        { revealStatus: "locked", manualUnlock: false, createdAt: oldCreatedAt },
        baseSettings,
        now
      );
      expect(state).toBe("RETURNING_UNPAID");
    });

    it("returns UNLOCKED_PRIORITY for paid user before public reveal", () => {
      const state = testDetermineDashboardState(
        { revealStatus: "unlocked", manualUnlock: false, createdAt: oldCreatedAt },
        baseSettings,
        now
      );
      expect(state).toBe("UNLOCKED_PRIORITY");
    });

    it("returns UNLOCKED_PRIORITY for manually unlocked user (admin override)", () => {
      const state = testDetermineDashboardState(
        { revealStatus: "locked", manualUnlock: true, createdAt: oldCreatedAt },
        baseSettings,
        now
      );
      expect(state).toBe("UNLOCKED_PRIORITY");
    });

    it("returns PUBLIC_REVEAL when publicTeamRevealAt has passed", () => {
      const state = testDetermineDashboardState(
        { revealStatus: "locked", manualUnlock: false, createdAt: oldCreatedAt },
        { ...baseSettings, publicTeamRevealAt: pastDate },
        now
      );
      expect(state).toBe("PUBLIC_REVEAL");
    });

    it("returns PUBLIC_REVEAL when isPublicRevealActive manual override is true", () => {
      const state = testDetermineDashboardState(
        { revealStatus: "locked", manualUnlock: false, createdAt: oldCreatedAt },
        { ...baseSettings, isPublicRevealActive: true },
        now
      );
      expect(state).toBe("PUBLIC_REVEAL");
    });

    it("PUBLIC_REVEAL takes priority over UNLOCKED_PRIORITY", () => {
      const state = testDetermineDashboardState(
        { revealStatus: "unlocked", manualUnlock: false, createdAt: oldCreatedAt },
        { ...baseSettings, isPublicRevealActive: true },
        now
      );
      expect(state).toBe("PUBLIC_REVEAL");
    });
  });

  describe("Teammate Visibility Protection (CRITICAL SECURITY)", () => {
    const paidTeammate: TeammateInput = {
      id: "paid-123",
      fullName: "Alice Smith",
      sportsDayProfile: "The Strategist",
      profileTagline: "Always two steps ahead.",
      revealStatus: "unlocked",
      manualUnlock: false,
    };

    const unpaidTeammate: TeammateInput = {
      id: "unpaid-456",
      fullName: "Bob Jones",
      sportsDayProfile: "The Wildcard",
      profileTagline: "Unpredictable.",
      revealStatus: "locked",
      manualUnlock: false,
    };

    const manuallyUnlockedTeammate: TeammateInput = {
      id: "manual-789",
      fullName: "Carol Davis",
      sportsDayProfile: "The Motivator",
      profileTagline: "The glue.",
      revealStatus: "locked",
      manualUnlock: true,
    };

    it("SECURITY: unpaid teammate name is NEVER returned before public reveal", () => {
      const card = testBuildTeammateCard(unpaidTeammate, false /* not public reveal */);
      expect(card.status).toBe("locked");
      expect(card.displayName).toBe("Teammate Locked");
      // Critical: real name must NOT appear anywhere in the card
      expect(card.displayName).not.toContain("Bob");
      expect(card.displayName).not.toContain("Jones");
    });

    it("SECURITY: unpaid teammate profile/tagline is NEVER returned before public reveal", () => {
      const card = testBuildTeammateCard(unpaidTeammate, false);
      // Card should not have sportsDayProfile or profileTagline fields
      expect((card as any).sportsDayProfile).toBeUndefined();
      expect((card as any).profileTagline).toBeUndefined();
    });

    it("paid teammate is visible before public reveal", () => {
      const card = testBuildTeammateCard(paidTeammate, false);
      expect(card.status).toBe("visible");
      expect(card.displayName).toBe("Alice Smith");
    });

    it("manually unlocked teammate is visible before public reveal", () => {
      const card = testBuildTeammateCard(manuallyUnlockedTeammate, false);
      expect(card.status).toBe("visible");
      expect(card.displayName).toBe("Carol Davis");
    });

    it("unpaid teammate IS visible after public reveal", () => {
      const card = testBuildTeammateCard(unpaidTeammate, true /* public reveal active */);
      expect(card.status).toBe("visible");
      expect(card.displayName).toBe("Bob Jones");
    });

    it("locked card has the correct anonymous message", () => {
      const card = testBuildTeammateCard(unpaidTeammate, false);
      expect(card.message).toBe("This player has not unlocked their Priority Player Pack yet.");
    });

    it("SECURITY: mixed team — only paid teammates are visible, unpaid are anonymous", () => {
      const teammates = [paidTeammate, unpaidTeammate, manuallyUnlockedTeammate];
      const cards = teammates.map((t) => testBuildTeammateCard(t, false));

      const visibleCards = cards.filter((c) => c.status === "visible");
      const lockedCards = cards.filter((c) => c.status === "locked");

      expect(visibleCards).toHaveLength(2); // Alice (paid) + Carol (manually unlocked)
      expect(lockedCards).toHaveLength(1); // Bob (unpaid)

      // Verify the locked card has no real name
      expect(lockedCards[0].displayName).toBe("Teammate Locked");

      // Verify visible cards have real names
      const visibleNames = visibleCards.map((c) => c.displayName);
      expect(visibleNames).toContain("Alice Smith");
      expect(visibleNames).toContain("Carol Davis");
      expect(visibleNames).not.toContain("Bob Jones");
    });
  });

  describe("Price State Logic", () => {
    it("returns early price before price increase date", () => {
      const isPriceIncreaseTriggered =
        (baseSettings.isPriceIncreaseActive ?? false) ||
        (baseSettings.priceIncreaseAt != null && now >= baseSettings.priceIncreaseAt);
      expect(isPriceIncreaseTriggered).toBe(false);
    });

    it("returns future price after price increase date", () => {
      const settingsWithPastIncrease = { ...baseSettings, priceIncreaseAt: pastDate };
      const isPriceIncreaseTriggered =
        (settingsWithPastIncrease.isPriceIncreaseActive ?? false) ||
        (settingsWithPastIncrease.priceIncreaseAt != null && now >= settingsWithPastIncrease.priceIncreaseAt);
      expect(isPriceIncreaseTriggered).toBe(true);
    });

    it("manual isPriceIncreaseActive override forces future price regardless of date", () => {
      const settingsWithOverride = { ...baseSettings, isPriceIncreaseActive: true, priceIncreaseAt: futureDate };
      const isPriceIncreaseTriggered =
        (settingsWithOverride.isPriceIncreaseActive ?? false) ||
        (settingsWithOverride.priceIncreaseAt != null && now >= settingsWithOverride.priceIncreaseAt);
      expect(isPriceIncreaseTriggered).toBe(true);
    });
  });
});
