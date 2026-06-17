import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Sports Day Registrations ────────────────────────────────────────────────

export const sportsDayRegistrations = mysqlTable("sports_day_registrations", {
  id: varchar("id", { length: 36 }).primaryKey(), // UUID
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  // Identity
  fullName: varchar("fullName", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  instagramHandle: varchar("instagramHandle", { length: 100 }),

  // Context
  attendedBefore: boolean("attendedBefore"),
  comingType: mysqlEnum("comingType", ["solo", "with_friends"]),
  groupCode: varchar("groupCode", { length: 15 }),
  groupRole: mysqlEnum("groupRole", ["creator", "joiner"]),

  // Date preferences
  date4July: boolean("date4July").default(false),
  date11July: boolean("date11July").default(false),
  date18July: boolean("date18July").default(false),
  dateAny: boolean("dateAny").default(false),

  // Personality
  competitiveness: mysqlEnum("competitiveness", ["vibes", "balanced", "winner"]),
  teammateType: mysqlEnum("teammateType", [
    "motivator",
    "strategist",
    "wildcard",
    "silent_assassin",
    "energy_bringer",
  ]),
  strongestEvent: mysqlEnum("strongestEvent", [
    "speed",
    "strength",
    "endurance",
    "coordination",
    "vibes",
  ]),
  fear: mysqlEnum("fear", [
    "sprinting",
    "team_events",
    "letting_team_down",
    "looking_unfit",
    "nothing",
  ]),
  eventMotivation: text("eventMotivation"),

  // Generated identity
  sportsDayProfile: varchar("sportsDayProfile", { length: 50 }),
  profileTagline: text("profileTagline"),
  aiTeamIdentity: text("aiTeamIdentity"), // AI-generated personalised team name + message

  // Logistics
  shirtSize: mysqlEnum("shirtSize", ["XS", "S", "M", "L", "XL", "XXL"]),
  shirtFit: mysqlEnum("shirtFit", ["regular", "oversized"]),
  healthNotes: text("healthNotes"),
  contentConsent: mysqlEnum("contentConsent", ["yes", "no", "ask"]),

  // Team
  team: mysqlEnum("team", ["red", "blue", "pink", "orange"]),
  isCaptain: boolean("isCaptain").default(false), // true if this person is the team captain
  revealStatus: mysqlEnum("revealStatus", ["locked", "unlocked"]).default("locked"),
  revealSeen: boolean("revealSeen").default(false), // true once they've watched the animation

  // Access / Payment
  accessType: mysqlEnum("accessType", ["free", "priority"]).default("free"),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid"]).default("unpaid"),
  paidAt: timestamp("paidAt"),

  // Referral
  referralCode: varchar("referralCode", { length: 10 }).unique(),
  referredBy: varchar("referredBy", { length: 10 }),
  referralCount: int("referralCount").default(0),
  referralRewardUnlocked: boolean("referralRewardUnlocked").default(false),

  // Klaviyo tags
  klaviyoTags: json("klaviyoTags").$type<string[]>(),

  // Metadata
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),

  // Personalised top name
  topName: varchar("topName", { length: 32 }),           // what appears on the printed top
  topNameLastEditedAt: timestamp("topNameLastEditedAt"), // last time user edited it
  topNameLockedAt: timestamp("topNameLockedAt"),         // set only when production lock happens (not on payment)

  // Payment tracking (Phase 10+)
  unlockToken: varchar("unlockToken", { length: 36 }).unique(), // UUID, non-guessable, primary match key
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 100 }),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  paymentEmail: varchar("paymentEmail", { length: 255 }), // email used to pay (may differ from registered)
  paymentMatchStatus: mysqlEnum("paymentMatchStatus", [
    "none",
    "matched_by_token",
    "matched_by_id",
    "matched_by_email",
    "unmatched",
    "manual_verified",
  ]).default("none"),

  // Manual unlock (admin override)
  manualUnlock: boolean("manualUnlock").default(false),
  manuallyUnlockedBy: varchar("manuallyUnlockedBy", { length: 64 }),
  manualUnlockReason: text("manualUnlockReason"),
  manuallyUnlockedAt: timestamp("manuallyUnlockedAt"),

  // AI-generated personalised pop-up copy (cached per user)
  popupCopyFirstVisit: text("popupCopyFirstVisit"),   // JSON: { headline, body, cta }
  popupCopyReturnVisit: text("popupCopyReturnVisit"), // JSON: { headline, body, cta }
  popupCopyGeneratedAt: timestamp("popupCopyGeneratedAt"),

  // Consent tracking
  operationalConsent: boolean("operationalConsent").default(true), // consent to contact about Sports Day 002
  operationalConsentReason: text("operationalConsentReason"), // why operational consent was given
  operationalConsentSource: varchar("operationalConsentSource", { length: 100 }), // where consent came from
  operationalConsentCapturedAt: timestamp("operationalConsentCapturedAt"), // when operational consent was captured
  marketingConsent: boolean("marketingConsent").default(false), // consent for marketing emails
  marketingConsentCapturedAt: timestamp("marketingConsentCapturedAt"), // when marketing consent was given

  // Auto-unlock tracking (July 11th 8pm BST)
  autoUnlockEventFired: boolean("autoUnlockEventFired").default(false), // true once Sports Day 002 Auto Unlocked event sent to Klaviyo
  autoUnlockedAt: timestamp("autoUnlockedAt"), // timestamp when auto-unlock event fired

  // UTM / Ad Attribution (captured from URL params on landing, stored at registration)
  utmSource: varchar("utmSource", { length: 100 }),    // e.g. instagram, facebook, google
  utmMedium: varchar("utmMedium", { length: 100 }),    // e.g. paid_social, cpc, email
  utmCampaign: varchar("utmCampaign", { length: 200 }), // e.g. launch_june_2026
  utmContent: varchar("utmContent", { length: 200 }),  // e.g. video_ad_v1
  utmTerm: varchar("utmTerm", { length: 200 }),        // e.g. sports day london
  utmLandingPage: varchar("utmLandingPage", { length: 500 }), // full URL they landed on
});

export type SportsDayRegistration = typeof sportsDayRegistrations.$inferSelect;
export type InsertSportsDayRegistration = typeof sportsDayRegistrations.$inferInsert;

// ─── Group Codes ──────────────────────────────────────────────────────────────

export const groupCodes = mysqlTable("group_codes", {
  code: varchar("code", { length: 15 }).primaryKey(),
  createdBy: varchar("createdBy", { length: 50 }), // references sportsDayRegistrations.id (or pending-UUID)
  creatorName: varchar("creatorName", { length: 100 }), // first name of creator for display
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  memberCount: int("memberCount").default(1),
});

export type GroupCode = typeof groupCodes.$inferSelect;
export type InsertGroupCode = typeof groupCodes.$inferInsert;

// ─── Profile Photos ───────────────────────────────────────────────────────────
export const profilePhotos = mysqlTable("profile_photos", {
  id: int("id").autoincrement().primaryKey(),
  registrationId: varchar("registrationId", { length: 36 }).notNull().unique(),
  storageKey: text("storageKey").notNull(),
  url: text("url").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
});
export type ProfilePhoto = typeof profilePhotos.$inferSelect;

// ─── Awards Votes ─────────────────────────────────────────────────────────────
// Each voter can cast one vote per award category
export const awardsVotes = mysqlTable("awards_votes", {
  id: int("id").autoincrement().primaryKey(),
  voterId: varchar("voterId", { length: 36 }).notNull(),      // registrationId of voter
  nomineeId: varchar("nomineeId", { length: 36 }).notNull(),  // registrationId of nominee
  category: mysqlEnum("category", [
    "mvp",
    "funniest_moment",
    "most_dramatic",
    "best_dressed",
    "most_competitive",
    "biggest_surprise",
    "team_player",
  ]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // One vote per voter per category
  voterCategoryIdx: uniqueIndex("voter_category_idx").on(t.voterId, t.category),
}));
export type AwardsVote = typeof awardsVotes.$inferSelect;

// ─── Wildcard Votes ───────────────────────────────────────────────────────────
// Each team has 3 wildcards they can vote to activate
export const wildcardVotes = mysqlTable("wildcard_votes", {
  id: int("id").autoincrement().primaryKey(),
  voterId: varchar("voterId", { length: 36 }).notNull(),
  team: mysqlEnum("team", ["red", "blue", "pink", "orange"]).notNull(),
  wildcardId: varchar("wildcardId", { length: 50 }).notNull(), // e.g. "double_points", "steal_a_player", "bonus_round"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => ({
  // One vote per voter per wildcard
  voterWildcardIdx: uniqueIndex("voter_wildcard_idx").on(t.voterId, t.wildcardId),
}));
export type WildcardVote = typeof wildcardVotes.$inferSelect;

// ─── Sports Day Settings ─────────────────────────────────────────────────────
// Single-row config table for pricing, dates, and manual overrides
export const sportsDaySettings = mysqlTable("sports_day_settings", {
  id: int("id").autoincrement().primaryKey(),

  // Pricing (in pence)
  earlyPrice: int("earlyPrice").default(1500).notNull(),   // £15.00
  futurePrice: int("futurePrice").default(3500).notNull(), // £35.00

  // Dates (UTC timestamps in ms)
  priceIncreaseAt: timestamp("priceIncreaseAt"),       // when early price ends
  publicTeamRevealAt: timestamp("publicTeamRevealAt"), // when all teams become public
  topProductionCutoffAt: timestamp("topProductionCutoffAt"), // when top name locks

  // Manual overrides (admin can flip these)
  isPriceIncreaseActive: boolean("isPriceIncreaseActive").default(false),
  isPublicRevealActive: boolean("isPublicRevealActive").default(false),

  // Funnel pop-ups toggle (admin enables before ads/emails go out)
  popupsEnabled: boolean("popupsEnabled").default(false),

  // Day-of voting gate: admin flips this on the morning of Sports Day
  // Gates wildcard voting AND fun awards voting
  votingEnabled: boolean("votingEnabled").default(false),

  // Unity Unlock Code: a global code that unlocks any registration (for offline payments)
  // Admin sets this in the Settings tab; players enter it on the Holding page
  globalUnlockCode: varchar("globalUnlockCode", { length: 64 }),

  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SportsDaySettings = typeof sportsDaySettings.$inferSelect;

// ─── Unmatched Payments ───────────────────────────────────────────────────────
// Payments that couldn't be auto-matched to a registration — admin review queue
export const unmatchedPayments = mysqlTable("unmatched_payments", {
  id: int("id").autoincrement().primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  // Stripe identifiers
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 100 }),
  stripeCheckoutSessionId: varchar("stripeCheckoutSessionId", { length: 100 }),
  stripeEventId: varchar("stripeEventId", { length: 100 }),
  stripeEventType: varchar("stripeEventType", { length: 100 }),

  // Payment details
  amountPaid: int("amountPaid"),         // in pence
  currency: varchar("currency", { length: 10 }),
  paymentEmail: varchar("paymentEmail", { length: 255 }),
  paymentName: varchar("paymentName", { length: 255 }),

  // Metadata from Stripe (what was passed in)
  metaUnlockToken: varchar("metaUnlockToken", { length: 100 }),
  metaRegistrationId: varchar("metaRegistrationId", { length: 36 }),
  metaRegisteredEmail: varchar("metaRegisteredEmail", { length: 255 }),
  metaPlayerName: varchar("metaPlayerName", { length: 255 }),
  metaTopName: varchar("metaTopName", { length: 32 }),

  // Admin resolution
  resolvedAt: timestamp("resolvedAt"),
  resolvedBy: varchar("resolvedBy", { length: 64 }),
  resolvedRegistrationId: varchar("resolvedRegistrationId", { length: 36 }),
  resolutionNote: text("resolutionNote"),
});
export type UnmatchedPayment = typeof unmatchedPayments.$inferSelect;

// ─── Sports Day Sessions ─────────────────────────────────────────────────────
// Maps session cookie tokens to registration IDs for server-side auth
export const sportsDaySessions = mysqlTable("sports_day_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(), // session token (random hex)
  registrationId: varchar("registrationId", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});
export type SportsDaySession = typeof sportsDaySessions.$inferSelect;

// ─── Phase 1: Sports Day Scoring System ──────────────────────────────────────

// Events (the 11 events on the day)
export const sdEvents = mysqlTable("sd_events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  arena: varchar("arena", { length: 50 }),         // "Arena A" | "Arena B"
  blockNo: int("blockNo"),                          // 1–5, F=6
  startTime: varchar("startTime", { length: 10 }), // "10:30"
  endTime: varchar("endTime", { length: 10 }),      // "11:00"
  status: mysqlEnum("status", ["upcoming", "armed", "live", "complete"]).default("upcoming").notNull(),
  wildcardsEnabled: boolean("wildcardsEnabled").default(false).notNull(),
  pointsMultiplier: int("pointsMultiplier").default(1).notNull(), // 2 for Tug of War finale
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SdEvent = typeof sdEvents.$inferSelect;
export type InsertSdEvent = typeof sdEvents.$inferInsert;

// Per-event results (one row per team per event)
export const sdEventResults = mysqlTable("sd_event_results", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  team: mysqlEnum("team", ["red", "blue", "pink", "orange"]).notNull(),
  placement: int("placement"),          // 1st, 2nd, 3rd, 4th — null until entered
  basePoints: int("basePoints"),        // raw points from placement (before multipliers)
  finalPoints: int("finalPoints"),      // after multipliers applied
  locked: boolean("locked").default(false).notNull(), // true = pushed to leaderboard
  lockedAt: timestamp("lockedAt"),
  lockedBy: varchar("lockedBy", { length: 64 }), // admin identifier
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SdEventResult = typeof sdEventResults.$inferSelect;
export type InsertSdEventResult = typeof sdEventResults.$inferInsert;

// Audit log — every points change is recorded here
export const sdPointsLog = mysqlTable("sd_points_log", {
  id: int("id").autoincrement().primaryKey(),
  team: mysqlEnum("team", ["red", "blue", "pink", "orange"]).notNull(),
  delta: int("delta").notNull(),       // positive or negative
  reason: mysqlEnum("reason", [
    "event_result",   // locked event result
    "double_down",    // wildcard modifier
    "all_in",         // wildcard modifier
    "sabotage",       // wildcard deduction
    "admin_override", // manual correction
  ]).notNull(),
  eventId: int("eventId"),             // nullable — not all adjustments are event-tied
  actor: varchar("actor", { length: 64 }).notNull(), // admin id or "system"
  note: text("note"),                  // optional human note
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SdPointsLog = typeof sdPointsLog.$inferSelect;
export type InsertSdPointsLog = typeof sdPointsLog.$inferInsert;

// ─── Wildcard System (Phase 2–3) ─────────────────────────────────────────────

// Wildcard activations — one per team per event (mostly)
export const sdWildcards = mysqlTable("sd_wildcards", {
  id: int("id").autoincrement().primaryKey(),
  type: mysqlEnum("type", ["steal", "sabotage", "block", "double_down", "all_in"]).notNull(),
  ownerTeam: mysqlEnum("ownerTeam", ["red", "blue", "pink", "orange"]).notNull(),
  eventId: int("eventId").notNull(),
  status: mysqlEnum("status", ["pending", "active", "resolved", "blocked", "failed"]).notNull().default("pending"),
  targetTeam: mysqlEnum("targetTeam", ["red", "blue", "pink", "orange"]), // for steal/sabotage
  targetPlayerId: int("targetPlayerId"),                                  // for steal (player being stolen)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),                                    // when vote closed or activation resolved
});
export type SdWildcard = typeof sdWildcards.$inferSelect;
export type InsertSdWildcard = typeof sdWildcards.$inferInsert;

// Votes on wildcards — one row per voter per wildcard
export const sdWildcardVotes = mysqlTable("sd_wildcard_votes", {
  id: int("id").autoincrement().primaryKey(),
  wildcardId: int("wildcardId").notNull(),
  userId: int("userId").notNull(),
  vote: boolean("vote").notNull(),      // true = YES, false = NO
  weight: varchar("weight", { length: 10 }).notNull(), // "0.50" for captain, split for members — stored as string
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SdWildcardVote = typeof sdWildcardVotes.$inferSelect;
export type InsertSdWildcardVote = typeof sdWildcardVotes.$inferInsert;

// Roster overrides — when a player is stolen, record the override for that event
export const sdRosterOverrides = mysqlTable("sd_roster_overrides", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  playerId: int("playerId").notNull(),
  originalTeam: mysqlEnum("originalTeam", ["red", "blue", "pink", "orange"]).notNull(),
  competingTeam: mysqlEnum("competingTeam", ["red", "blue", "pink", "orange"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SdRosterOverride = typeof sdRosterOverrides.$inferSelect;
export type InsertSdRosterOverride = typeof sdRosterOverrides.$inferInsert;

// Team metadata — captain, vice-captain, cards remaining, points total
export const sdTeams = mysqlTable("sd_teams", {
  id: int("id").autoincrement().primaryKey(),
  name: mysqlEnum("name", ["red", "blue", "pink", "orange"]).notNull().unique(),
  captainUserId: int("captainUserId"),      // user.id of captain
  viceCaptainUserId: int("viceCaptainUserId"), // user.id of vice-captain
  cardsRemaining: int("cardsRemaining").notNull().default(3),
  pointsTotal: int("pointsTotal").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type SdTeam = typeof sdTeams.$inferSelect;
export type InsertSdTeam = typeof sdTeams.$inferInsert;

// Team membership — which user is on which team, and their role
export const sdTeamMembers = mysqlTable("sd_team_members", {
  id: int("id").autoincrement().primaryKey(),
  teamId: int("teamId").notNull(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["captain", "vice_captain", "member"]).notNull().default("member"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type SdTeamMember = typeof sdTeamMembers.$inferSelect;
export type InsertSdTeamMember = typeof sdTeamMembers.$inferInsert;
