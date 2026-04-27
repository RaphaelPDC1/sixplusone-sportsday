import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

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
  groupCode: varchar("groupCode", { length: 10 }),
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
  code: varchar("code", { length: 10 }).primaryKey(),
  createdBy: varchar("createdBy", { length: 36 }), // references sportsDayRegistrations.id
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  memberCount: int("memberCount").default(1),
});

export type GroupCode = typeof groupCodes.$inferSelect;
export type InsertGroupCode = typeof groupCodes.$inferInsert;
