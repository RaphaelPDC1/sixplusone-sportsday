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
  shopifyOrderId: varchar("shopifyOrderId", { length: 100 }),
  paidAt: timestamp("paidAt"),

  // Referral
  referralCode: varchar("referralCode", { length: 10 }).unique(),
  referredBy: varchar("referredBy", { length: 10 }),
  referralCount: int("referralCount").default(0),
  referralRewardUnlocked: boolean("referralRewardUnlocked").default(false),

  // Klaviyo tags
  klaviyoTags: json("klaviyoTags").$type<string[]>(),

  // Shopify
  shopifyCustomerId: varchar("shopifyCustomerId", { length: 100 }),

  // Metadata
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),

  // Personalised top name
  topName: varchar("topName", { length: 32 }),           // what appears on the printed top
  topNameLastEditedAt: timestamp("topNameLastEditedAt"), // last time user edited it
  topNameLockedAt: timestamp("topNameLockedAt"),         // set only when production lock happens (not on payment)

  // Shopify audit mirror (not the source of unlock truth)
  shopifyOrderStatus: mysqlEnum("shopifyOrderStatus", [
    "pending_configuration",
    "created",
    "failed",
  ]),

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

// ─── Leaderboard ──────────────────────────────────────────────────────────────
// Admin fills in results per event per team
export const leaderboard = mysqlTable("leaderboard", {
  id: int("id").autoincrement().primaryKey(),
  eventName: varchar("eventName", { length: 100 }).notNull(),
  team: mysqlEnum("team", ["red", "blue", "pink", "orange"]).notNull(),
  position: int("position"),          // 1st, 2nd, 3rd, 4th
  points: int("points").default(0),
  dnf: boolean("dnf").default(false),
  notes: text("notes"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  updatedBy: varchar("updatedBy", { length: 64 }), // admin openId
}, (t) => ({
  // One result per event per team
  eventTeamIdx: uniqueIndex("event_team_idx").on(t.eventName, t.team),
}));
export type LeaderboardEntry = typeof leaderboard.$inferSelect;
export type InsertLeaderboardEntry = typeof leaderboard.$inferInsert;

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

// ─── Event Schedule & Live Status ─────────────────────────────────────────────
// Admin controls which event is "now happening" and the event schedule
export const eventSchedule = mysqlTable("event_schedule", {
  id: int("id").autoincrement().primaryKey(),
  eventName: varchar("eventName", { length: 100 }).notNull(),
  startTime: varchar("startTime", { length: 10 }),   // e.g. "10:00"
  endTime: varchar("endTime", { length: 10 }),
  location: varchar("location", { length: 200 }),
  description: text("description"),
  sortOrder: int("sortOrder").default(0),
  isLive: boolean("isLive").default(false),
  isCompleted: boolean("isCompleted").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type EventScheduleEntry = typeof eventSchedule.$inferSelect;
export type InsertEventScheduleEntry = typeof eventSchedule.$inferSelect;

// ─── Sports Day Sessions ─────────────────────────────────────────────────────
// Maps session cookie tokens to registration IDs for server-side auth
export const sportsDaySessions = mysqlTable("sports_day_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(), // session token (random hex)
  registrationId: varchar("registrationId", { length: 36 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
});
export type SportsDaySession = typeof sportsDaySessions.$inferSelect;
