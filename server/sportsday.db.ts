import { and, count, eq, like, sql } from "drizzle-orm";
import { groupCodes, sportsDayRegistrations } from "../drizzle/schema";
import { getDb } from "./db";

// ─── Team Assignment ──────────────────────────────────────────────────────────

const TEAMS = ["red", "blue", "pink", "orange"] as const;
export type Team = (typeof TEAMS)[number];

export async function assignTeam(): Promise<Team> {
  const db = await getDb();
  if (!db) return TEAMS[Math.floor(Math.random() * TEAMS.length)];

  const counts = await db
    .select({ team: sportsDayRegistrations.team, count: count() })
    .from(sportsDayRegistrations)
    .groupBy(sportsDayRegistrations.team);

  const teamCounts: Record<Team, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
  for (const row of counts) {
    if (row.team) teamCounts[row.team as Team] = row.count;
  }

  const minCount = Math.min(...Object.values(teamCounts));
  const eligible = TEAMS.filter((t) => teamCounts[t] === minCount);
  return eligible[Math.floor(Math.random() * eligible.length)];
}

// ─── Referral Code ────────────────────────────────────────────────────────────

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function generateUniqueReferralCode(): Promise<string> {
  const db = await getDb();
  let code = generateReferralCode();
  if (!db) return code;

  for (let attempts = 0; attempts < 10; attempts++) {
    const existing = await db
      .select({ id: sportsDayRegistrations.id })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.referralCode, code))
      .limit(1);
    if (existing.length === 0) break;
    code = generateReferralCode();
  }
  return code;
}

// ─── Group Codes ──────────────────────────────────────────────────────────────

export function generateGroupCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "SD002-";
  // 5 chars = 32^5 = ~33M combinations — not brute-forceable
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createGroupCode(createdBy: string): Promise<string> {
  const db = await getDb();
  const code = generateGroupCode();
  if (!db) return code;

  await db.insert(groupCodes).values({ code, createdBy, memberCount: 1 });
  return code;
}

// Pre-create a group code in the DB before registration is complete.
// Uses a temporary placeholder createdBy ("pending-" + random) that gets
// updated to the real registration ID when the user finishes registering.
export async function createGroupCodeEarly(creatorFirstName?: string): Promise<string> {
  const db = await getDb();
  // Generate a unique code (retry up to 5 times on collision)
  let code = generateGroupCode();
  if (!db) return code;
  for (let i = 0; i < 5; i++) {
    const existing = await db
      .select({ code: groupCodes.code })
      .from(groupCodes)
      .where(eq(groupCodes.code, code))
      .limit(1);
    if (existing.length === 0) break;
    code = generateGroupCode();
  }
  const tempId = `pending-${crypto.randomUUID()}`;
  await db.insert(groupCodes).values({
    code,
    createdBy: tempId,
    creatorName: creatorFirstName ?? null,
    memberCount: 0,
  });
  return code;
}

// Link a pending group code (created early) to a real registration ID
// This is called when a user who created a code early completes their registration
export async function linkPendingGroupCode(registrationId: string, creatorFirstName?: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  if (!creatorFirstName) return null;
  
  console.log('[linkPendingGroupCode] Looking for pending code with name:', creatorFirstName);
  
  // Look for a pending code with this creator name
  const pending = await db
    .select()
    .from(groupCodes)
    .where(
      and(
        eq(groupCodes.creatorName, creatorFirstName),
        like(groupCodes.createdBy, 'pending-%')
      )
    )
    .limit(1);
  
  console.log('[linkPendingGroupCode] Found pending codes:', pending.length);
  if (pending.length > 0) {
    console.log('[linkPendingGroupCode] Pending code:', pending[0].code);
  }
  
  if (pending.length === 0) return null;
  
  // Update the pending code to link it to the real registration ID
  const code = pending[0].code;
  console.log('[linkPendingGroupCode] Linking code', code, 'to registration', registrationId);
  await db
    .update(groupCodes)
    .set({ createdBy: registrationId })
    .where(eq(groupCodes.code, code));
  
  console.log('[linkPendingGroupCode] Successfully linked');
  return code;
}

export async function joinGroupCode(code: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const existing = await db
    .select()
    .from(groupCodes)
    .where(eq(groupCodes.code, code))
    .limit(1);

  if (existing.length === 0) return false;

  // Hard cap: max 20 members per group
  const currentCount = existing[0].memberCount ?? 0;
  if (currentCount >= 20) return false;

  await db
    .update(groupCodes)
    .set({ memberCount: sql`${groupCodes.memberCount} + 1` })
    .where(eq(groupCodes.code, code));

  return true;
}

// ─── Profile Generation ───────────────────────────────────────────────────────

type Competitiveness = "vibes" | "balanced" | "winner";
type TeammateType = "motivator" | "strategist" | "wildcard" | "silent_assassin" | "energy_bringer";

const PROFILE_MAP: Record<string, { profile: string; tagline: string }> = {
  "winner-strategist": { profile: "The Strategist", tagline: "You're looking like a calculated threat." },
  "winner-wildcard": { profile: "The Wildcard", tagline: "Chaotic. Dangerous. Exactly what we need." },
  "winner-silent_assassin": { profile: "The Silent Threat", tagline: "The silent threat. Your team won't know what hit them." },
  "winner-motivator": { profile: "The Competitor", tagline: "You came to win. The team will feel that." },
  "winner-energy_bringer": { profile: "The Competitor", tagline: "All that energy, pointed at victory. Dangerous." },
  "vibes-energy_bringer": { profile: "The Energy Bringer", tagline: "Pure energy. The team will feel you." },
  "vibes-motivator": { profile: "The Motivator", tagline: "The glue. Every team needs one." },
  "vibes-silent_assassin": { profile: "The Underdog", tagline: "Quiet. But don't sleep on them." },
  "vibes-wildcard": { profile: "The Wildcard", tagline: "Unpredictable. That's your superpower." },
  "vibes-strategist": { profile: "The Anchor", tagline: "Calm under pressure. The team leans on you." },
  "balanced-motivator": { profile: "The Motivator", tagline: "The glue. Every team needs one." },
  "balanced-strategist": { profile: "The Strategist", tagline: "Measured. Precise. Always two steps ahead." },
  "balanced-wildcard": { profile: "The Wildcard", tagline: "You keep everyone guessing. That's the plan." },
  "balanced-silent_assassin": { profile: "The Silent Threat", tagline: "You don't need to say much. Your results speak." },
  "balanced-energy_bringer": { profile: "The Energy Bringer", tagline: "You bring the spark. The team brings the fire." },
};

export function generateProfile(
  competitiveness?: Competitiveness | null,
  teammateType?: TeammateType | null
): { profile: string; tagline: string } {
  const key = `${competitiveness ?? "balanced"}-${teammateType ?? "motivator"}`;
  return (
    PROFILE_MAP[key] ?? {
      profile: "The Competitor",
      tagline: "Your team is waiting. Don't let them down.",
    }
  );
}

// ─── Klaviyo Tags ─────────────────────────────────────────────────────────────

export function buildKlaviyoTags(data: {
  date4July?: boolean;
  date11July?: boolean;
  date18July?: boolean;
  dateAny?: boolean;
  comingType?: string | null;
  shirtSize?: string | null;
  contentConsent?: string | null;
}): string[] {
  const tags: string[] = ["SportsDay002_Registered", "SportsDay002_Locked"];

  if (data.date4July) tags.push("SportsDay002_4July");
  if (data.date11July) tags.push("SportsDay002_11July");
  if (data.date18July) tags.push("SportsDay002_18July");
  if (data.dateAny) tags.push("SportsDay002_AnyDate");

  if (data.comingType === "solo") tags.push("SportsDay002_Solo");
  if (data.comingType === "with_friends") tags.push("SportsDay002_WithFriends");

  if (data.shirtSize) tags.push(`SportsDay002_ShirtSize_${data.shirtSize}`);

  if (data.contentConsent === "yes") tags.push("SportsDay002_ContentConsent_Yes");
  else if (data.contentConsent === "no") tags.push("SportsDay002_ContentConsent_No");
  else if (data.contentConsent === "ask") tags.push("SportsDay002_ContentConsent_AskFirst");

  return tags;
}

export function buildPaymentKlaviyoTags(existingTags: string[], team: Team): string[] {
  const updated = existingTags.filter((t) => t !== "SportsDay002_Locked");
  updated.push("SportsDay002_Priority", "SportsDay002_Unlocked", `SportsDay002_Team${team.charAt(0).toUpperCase() + team.slice(1)}`);
  return updated;
}

// ─── Registration ─────────────────────────────────────────────────────────────

export async function getRegistrationByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRegistrationById(id: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getRegistrationByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.referralCode, code))
    .limit(1);
  return rows[0] ?? null;
}

export async function incrementReferralCount(referralCode: string) {
  const db = await getDb();
  if (!db) return;
  const rows = await db
    .select()
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.referralCode, referralCode))
    .limit(1);
  if (rows.length === 0) return;
  const current = rows[0].referralCount ?? 0;
  const newCount = current + 1;
  await db
    .update(sportsDayRegistrations)
    .set({
      referralCount: newCount,
      referralRewardUnlocked: newCount >= 3,
    })
    .where(eq(sportsDayRegistrations.referralCode, referralCode));
}

// ─── Admin Queries ────────────────────────────────────────────────────────────

export async function getAllRegistrations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sportsDayRegistrations).orderBy(sportsDayRegistrations.createdAt);
}

export async function getTeamCounts() {
  const db = await getDb();
  if (!db) return { red: 0, blue: 0, pink: 0, orange: 0 };
  const rows = await db
    .select({ team: sportsDayRegistrations.team, count: count() })
    .from(sportsDayRegistrations)
    .groupBy(sportsDayRegistrations.team);
  const result: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
  for (const row of rows) {
    if (row.team) result[row.team] = row.count;
  }
  return result;
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { total: 0, paid: 0, free: 0, teams: { red: 0, blue: 0, pink: 0, orange: 0 }, totalReferrals: 0 };

  const [totalRows, paidRows, teamRows, referralRows] = await Promise.all([
    db.select({ count: count() }).from(sportsDayRegistrations),
    db
      .select({ count: count() })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.paymentStatus, "paid")),
    db
      .select({ team: sportsDayRegistrations.team, count: count() })
      .from(sportsDayRegistrations)
      .groupBy(sportsDayRegistrations.team),
    db
      .select({ count: sql<number>`SUM(${sportsDayRegistrations.referralCount})` })
      .from(sportsDayRegistrations),
  ]);

  const total = totalRows[0]?.count ?? 0;
  const paid = paidRows[0]?.count ?? 0;
  const teams: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
  for (const row of teamRows) {
    if (row.team) teams[row.team] = row.count;
  }
  const totalReferrals = Number(referralRows[0]?.count ?? 0);

  return { total, paid, free: total - paid, teams, totalReferrals };
}


export async function getUnlockStats() {
  const db = await getDb();
  if (!db) return { total: 0, teams: { red: 0, blue: 0, pink: 0, orange: 0 } };
  
  // Get count of unlocked registrations
  const [unlockedRows, teamRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.revealStatus, "unlocked")),
    db
      .select({ team: sportsDayRegistrations.team, count: count() })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.revealStatus, "unlocked"))
      .groupBy(sportsDayRegistrations.team),
  ]);
  
  const total = unlockedRows[0]?.count ?? 0;
  const teams: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
  for (const row of teamRows) {
    if (row.team) teams[row.team] = row.count;
  }
  
  return { total, teams };
}

