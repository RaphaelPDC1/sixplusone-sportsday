import { and, eq } from "drizzle-orm";
import { sportsDayRegistrations, sportsDaySettings } from "../drizzle/schema";
import { getDb } from "./db";
import { ENV } from "./_core/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DashboardState =
  | "LOCKED_UNPAID"
  | "RETURNING_UNPAID"
  | "UNLOCKED_PRIORITY"
  | "PUBLIC_REVEAL";

export interface TeammateCard {
  displayName: string;
  status: "visible" | "locked";
  profile?: string;
  tagline?: string;
  instagramHandle?: string;
  message?: string;
}

export interface PriceState {
  currentPricePence: number;
  currentPriceLabel: string;
  isEarlyPrice: boolean;
  futurePricePence: number;
  futurePriceLabel: string;
  priceIncreaseAt: Date | null;
  countdownMs: number | null; // ms until price increase, null if already increased
  topProductionCutoffAt: Date | null;
  topNameEditableUntil: Date | null; // same as topProductionCutoffAt
  topNameLocked: boolean; // true if past production cutoff
}

export interface SportsDayDashboard {
  state: DashboardState;
  registrationId: string;
  unlockToken: string;
  revealStatus: string;
  accessType: string | null;
  topName: string | null;
  topNameLocked: boolean;

  // Player identity
  playerName: string;
  playerEmail: string;
  referralCode: string | null;
  referralCount: number;

  // Only populated for UNLOCKED_PRIORITY / PUBLIC_REVEAL
  team: string | null;
  teamColour: string | null;
  profile: string | null;
  tagline: string | null;
  shirtSize: string | null;
  shirtFit: string | null;
  teammates: TeammateCard[];

  // Copy / CTA (state-specific)
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaNote: string | null;

  // Pricing
  priceState: PriceState;
}

// ─── Team colour map ──────────────────────────────────────────────────────────

const TEAM_COLOURS: Record<string, string> = {
  red: "#E53E3E",
  blue: "#3182CE",
  pink: "#D53F8C",
  orange: "#DD6B20",
};

// ─── Settings loader ──────────────────────────────────────────────────────────

export async function getSportsDaySettings() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(sportsDaySettings).limit(1);
  return rows[0] ?? null;
}

// ─── Price state builder ──────────────────────────────────────────────────────

function buildPriceState(settings: typeof sportsDaySettings.$inferSelect | null): PriceState {
  const now = Date.now();

  // Price comes from database settings
  const earlyPricePence = settings?.earlyPrice ?? 2000; // £20.00 default
  const futurePricePence = settings?.futurePrice ?? 3500; // £35.00 default
  
  // If no priceIncreaseAt is set, default to 1 week from now
  let priceIncreaseAtTime = settings?.priceIncreaseAt ? new Date(settings.priceIncreaseAt).getTime() : null;
  if (!priceIncreaseAtTime) {
    priceIncreaseAtTime = now + (7 * 24 * 60 * 60 * 1000); // 1 week from now
  }
  const priceIncreaseAt = settings?.priceIncreaseAt ? new Date(settings.priceIncreaseAt) : null;
  const topProductionCutoffAt = settings?.topProductionCutoffAt
    ? new Date(settings.topProductionCutoffAt)
    : null;

  // Manual override takes precedence
  const isPriceIncreased =
    settings?.isPriceIncreaseActive === true ||
    (priceIncreaseAtTime !== null && now >= priceIncreaseAtTime);

  const currentPricePence = isPriceIncreased ? futurePricePence : earlyPricePence;
  const countdownMs =
    !isPriceIncreased && priceIncreaseAtTime ? Math.max(0, priceIncreaseAtTime - now) : null;

  const topNameLocked =
    topProductionCutoffAt !== null && now >= topProductionCutoffAt.getTime();

  return {
    currentPricePence,
    currentPriceLabel: `£${(currentPricePence / 100).toFixed(2)}`,
    isEarlyPrice: !isPriceIncreased,
    futurePricePence,
    futurePriceLabel: `£${(futurePricePence / 100).toFixed(2)}`,
    priceIncreaseAt: priceIncreaseAtTime ? new Date(priceIncreaseAtTime) : null,
    countdownMs,
    topProductionCutoffAt,
    topNameEditableUntil: topProductionCutoffAt,
    topNameLocked,
  };
}

// ─── Main dashboard builder ───────────────────────────────────────────────────

export async function buildSportsDayDashboard(
  registrationId: string
): Promise<SportsDayDashboard | null> {
  const db = await getDb();
  if (!db) return null;

  // Load registration
  const regRows = await db
    .select()
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.id, registrationId))
    .limit(1);

  const reg = regRows[0];
  if (!reg) return null;

  // Load settings
  const settings = await getSportsDaySettings();
  const priceState = buildPriceState(settings);
  const now = Date.now();

  // Determine if public reveal is active
  const publicRevealAt = settings?.publicTeamRevealAt
    ? new Date(settings.publicTeamRevealAt)
    : null;
  const isPublicReveal =
    settings?.isPublicRevealActive === true ||
    (publicRevealAt !== null && now >= publicRevealAt.getTime());

  // Determine if user is unlocked (paid OR manual override)
  const isUnlocked =
    reg.revealStatus === "unlocked" ||
    reg.paymentStatus === "paid" ||
    reg.manualUnlock === true;

  // ─── Determine state ───────────────────────────────────────────────────────

  let state: DashboardState;

  if (isPublicReveal) {
    state = "PUBLIC_REVEAL";
  } else if (isUnlocked) {
    state = "UNLOCKED_PRIORITY";
  } else if (reg.createdAt && new Date(reg.createdAt).getTime() < now - 30 * 60 * 1000) {
    // Returning unpaid: registered more than 30 minutes ago
    state = "RETURNING_UNPAID";
  } else {
    state = "LOCKED_UNPAID";
  }

  // ─── Build teammate cards ──────────────────────────────────────────────────

  let teammates: TeammateCard[] = [];

  if (state === "UNLOCKED_PRIORITY" || state === "PUBLIC_REVEAL") {
    if (reg.team) {
      const teamRows = await db
        .select()
        .from(sportsDayRegistrations)
        .where(
          and(
            eq(sportsDayRegistrations.team, reg.team)
          )
        );

      teammates = teamRows
        .filter((t) => t.id !== reg.id) // exclude self
        .map((t): TeammateCard => {
          const teammateUnlocked =
            t.revealStatus === "unlocked" ||
            t.paymentStatus === "paid" ||
            t.manualUnlock === true;

          // Before public reveal: only show paid teammates
          if (!isPublicReveal && !teammateUnlocked) {
            return {
              displayName: "Teammate Locked",
              status: "locked",
              message: "This player has not unlocked their Priority Player Pack yet.",
            };
          }

          // Visible teammate
          return {
            displayName: t.fullName ?? "Player",
            status: "visible",
            profile: t.sportsDayProfile ?? undefined,
            tagline: t.profileTagline ?? undefined,
            instagramHandle: t.instagramHandle ?? undefined,
          };
        });
    }
  }

  // ─── State-specific copy ───────────────────────────────────────────────────

  const priceLabel = priceState.currentPriceLabel;
  const futureLabel = priceState.futurePriceLabel;

  let headline = "";
  let subheadline = "";
  let ctaLabel = "";
  let ctaNote: string | null = null;

  switch (state) {
    case "LOCKED_UNPAID":
      headline = "Your team has been picked.";
      subheadline =
        "Unlock your Priority Player Pack to reveal your team, your personalised top, and your player profile.";
      ctaLabel = `Unlock My Player Pack — ${priceLabel}`;
      ctaNote = priceState.countdownMs !== null
        ? `Price may increase to ${futureLabel} once personalised tops move closer to production.`
        : null;
      break;

    case "RETURNING_UNPAID":
      headline = "Your team is still waiting.";
      subheadline =
        "Your registration is saved. Unlock before the price changes to reveal your team and secure your personalised top.";
      ctaLabel = priceState.isEarlyPrice
        ? `Unlock Before Price Changes — ${priceLabel}`
        : `Unlock My Player Pack — ${priceLabel}`;
      ctaNote = priceState.countdownMs !== null
        ? `Price increases to ${futureLabel} in ${formatCountdown(priceState.countdownMs)}.`
        : null;
      break;

    case "UNLOCKED_PRIORITY":
      headline = "You're in.";
      subheadline = `Team ${reg.team ? reg.team.charAt(0).toUpperCase() + reg.team.slice(1) : ""} — your personalised top is reserved.`;
      ctaLabel = "View My Team Hub";
      ctaNote = null;
      break;

    case "PUBLIC_REVEAL":
      headline = "Teams are live.";
      subheadline = "The full team reveal is now public. See your team and teammates below.";
      ctaLabel = "View My Team Hub";
      ctaNote = null;
      break;
  }

  return {
    state,
    registrationId: reg.id,
    unlockToken: reg.unlockToken ?? "",
    revealStatus: reg.revealStatus ?? "locked",
    accessType: reg.accessType ?? null,
    topName: reg.topName ?? null,
    topNameLocked: priceState.topNameLocked,

    playerName: reg.fullName ?? "",
    playerEmail: reg.email ?? "",
    referralCode: reg.referralCode ?? null,
    referralCount: reg.referralCount ?? 0,

    team: isUnlocked || isPublicReveal ? reg.team ?? null : null,
    teamColour:
      isUnlocked || isPublicReveal
        ? (reg.team ? TEAM_COLOURS[reg.team] ?? null : null)
        : null,
    profile: isUnlocked || isPublicReveal ? reg.sportsDayProfile ?? null : null,
    tagline: isUnlocked || isPublicReveal ? reg.profileTagline ?? null : null,
    shirtSize: isUnlocked || isPublicReveal ? reg.shirtSize ?? null : null,
    shirtFit: isUnlocked || isPublicReveal ? reg.shirtFit ?? null : null,
    teammates,

    headline,
    subheadline,
    ctaLabel,
    ctaNote,
    priceState,
  };
}

// ─── Countdown formatter ──────────────────────────────────────────────────────

export function formatCountdown(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const days = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);

  if (days > 0) return `${days}D ${hours}H ${mins}M`;
  if (hours > 0) return `${hours}H ${mins}M`;
  return `${mins}M`;
}
