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
  captainVoteInterest: mysqlEnum("captainVoteInterest", ["yes", "no", "maybe"]),

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
export type InsertEventScheduleEntry = typeof eventSchedule.$inferInsert;
