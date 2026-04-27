import crypto from "crypto";
import { and, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { groupCodes, sportsDayRegistrations } from "../drizzle/schema";
import { getDb } from "./db";
import {
  assignTeam,
  buildKlaviyoTags,
  buildPaymentKlaviyoTags,
  createGroupCode,
  generateProfile,
  generateUniqueReferralCode,
  getAdminStats,
  getAllRegistrations,
  getRegistrationByEmail,
  getRegistrationById,
  getRegistrationByReferralCode,
  incrementReferralCount,
  joinGroupCode,
} from "./sportsday.db";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

// ─── Admin Guard ──────────────────────────────────────────────────────────────

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Sports Day Router ────────────────────────────────────────────────────────

const sportsDayRouter = router({
  register: publicProcedure
    .input(
      z.object({
        fullName: z.string().min(1),
        email: z.string().email(),
        instagramHandle: z.string().optional(),
        attendedBefore: z.boolean().optional(),
        comingType: z.enum(["solo", "with_friends"]).optional(),
        groupCode: z.string().optional(),
        groupRole: z.enum(["creator", "joiner"]).optional(),
        date4July: z.boolean().optional(),
        date11July: z.boolean().optional(),
        date18July: z.boolean().optional(),
        dateAny: z.boolean().optional(),
        competitiveness: z.enum(["vibes", "balanced", "winner"]).optional(),
        teammateType: z
          .enum(["motivator", "strategist", "wildcard", "silent_assassin", "energy_bringer"])
          .optional(),
        strongestEvent: z
          .enum(["speed", "strength", "endurance", "coordination", "vibes"])
          .optional(),
        fear: z
          .enum(["sprinting", "team_events", "letting_team_down", "looking_unfit", "nothing"])
          .optional(),
        eventMotivation: z.string().optional(),
        captainVoteInterest: z.enum(["yes", "no", "maybe"]).optional(),
        shirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]).optional(),
        shirtFit: z.enum(["regular", "oversized"]).optional(),
        healthNotes: z.string().optional(),
        contentConsent: z.enum(["yes", "no", "ask"]).optional(),
        referredBy: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const email = input.email.toLowerCase().trim();

      // Check for duplicate email
      const existing = await getRegistrationByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already registered." });
      }

      // Assign team (load-balanced)
      const team = await assignTeam();

      // Generate IDs
      const id = crypto.randomUUID();
      const referralCode = await generateUniqueReferralCode();

      // Generate profile
      const { profile, tagline } = generateProfile(
        input.competitiveness ?? null,
        input.teammateType ?? null
      );

      // Build Klaviyo tags
      const klaviyoTags = buildKlaviyoTags({
        date4July: input.date4July,
        date11July: input.date11July,
        date18July: input.date18July,
        dateAny: input.dateAny,
        comingType: input.comingType,
        shirtSize: input.shirtSize,
        contentConsent: input.contentConsent,
      });

      // Handle group code
      let finalGroupCode = input.groupCode;
      if (input.comingType === "with_friends") {
        if (input.groupRole === "creator") {
          finalGroupCode = await createGroupCode(id);
        } else if (input.groupRole === "joiner" && input.groupCode) {
          const joined = await joinGroupCode(input.groupCode);
          if (!joined) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Group code not found." });
          }
        }
      }

      // Insert registration
      await db.insert(sportsDayRegistrations).values({
        id,
        fullName: input.fullName.trim(),
        email,
        instagramHandle: input.instagramHandle?.trim() || null,
        attendedBefore: input.attendedBefore ?? null,
        comingType: input.comingType ?? null,
        groupCode: finalGroupCode ?? null,
        groupRole: input.groupRole ?? null,
        date4July: input.date4July ?? false,
        date11July: input.date11July ?? false,
        date18July: input.date18July ?? false,
        dateAny: input.dateAny ?? false,
        competitiveness: input.competitiveness ?? null,
        teammateType: input.teammateType ?? null,
        strongestEvent: input.strongestEvent ?? null,
        fear: input.fear ?? null,
        eventMotivation: input.eventMotivation?.trim() || null,
        captainVoteInterest: input.captainVoteInterest ?? null,
        sportsDayProfile: profile,
        profileTagline: tagline,
        shirtSize: input.shirtSize ?? null,
        shirtFit: input.shirtFit ?? null,
        healthNotes: input.healthNotes?.trim() || null,
        contentConsent: input.contentConsent ?? null,
        team,
        revealStatus: "locked",
        accessType: "free",
        paymentStatus: "unpaid",
        referralCode,
        referredBy: input.referredBy ?? null,
        referralCount: 0,
        referralRewardUnlocked: false,
        klaviyoTags,
        ipAddress: ctx.req.ip ?? null,
        userAgent: ctx.req.headers["user-agent"] ?? null,
      });

      // Increment referrer's count
      if (input.referredBy) {
        await incrementReferralCount(input.referredBy);
      }

      return { id, referralCode, team, profile, tagline };
    }),

  getUserStatus: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const reg = await getRegistrationById(input.id);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });
      return {
        id: reg.id,
        fullName: reg.fullName,
        email: reg.email,
        revealStatus: reg.revealStatus,
        paymentStatus: reg.paymentStatus,
        accessType: reg.accessType,
        team: reg.revealStatus === "unlocked" ? reg.team : null,
        sportsDayProfile: reg.sportsDayProfile,
        profileTagline: reg.profileTagline,
        referralCode: reg.referralCode,
        referralCount: reg.referralCount,
        referralRewardUnlocked: reg.referralRewardUnlocked,
        groupCode: reg.groupCode,
        groupRole: reg.groupRole,
        aiTeamIdentity: reg.revealStatus === "unlocked" ? reg.aiTeamIdentity : null,
      };
    }),
  // Generate AI-powered personalised team identity using all form data
  generateTeamIdentity: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const reg = await getRegistrationById(input.id);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });
      if (reg.revealStatus !== "unlocked") throw new TRPCError({ code: "FORBIDDEN", message: "Team not yet revealed" });
      // Return cached identity if already generated
      if (reg.aiTeamIdentity) return { aiTeamIdentity: reg.aiTeamIdentity };
      const teamName = reg.team ? reg.team.charAt(0).toUpperCase() + reg.team.slice(1) : "Unknown";
      const prompt = `You are the identity engine for 6+1 Sports Day 002 — a high-energy competitive sports event. 
A participant has just been revealed as TEAM ${teamName.toUpperCase()}.

Here is everything we know about them:
- Name: ${reg.fullName}
- Competitiveness level: ${reg.competitiveness ?? "balanced"}
- Teammate type: ${reg.teammateType?.replace(/_/g, " ") ?? "motivator"}
- Strongest event: ${reg.strongestEvent ?? "unknown"}
- Biggest fear: ${reg.fear?.replace(/_/g, " ") ?? "unknown"}
- Captain vote interest: ${reg.captainVoteInterest ?? "maybe"}
- Event motivation: ${reg.eventMotivation ?? "not provided"}
- Attended before: ${reg.attendedBefore ? "Yes, returning" : "No, first time"}

Generate a SHORT, punchy, personalised sports day identity for this person on TEAM ${teamName.toUpperCase()}.
Format: One bold title (max 5 words, ALL CAPS) on the first line, then a single sentence (max 20 words) that captures their specific personality and team role.
Make it feel earned, specific to their answers, and hype them up. No generic platitudes.
Example format:
THE SILENT WEAPON OF TEAM BLUE
You don't talk about it. You just show up and make everyone else look slow.

Return ONLY the two lines. No extra text, no quotes, no explanation.`;
      let aiTeamIdentity = "";
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a high-energy sports event identity generator. Be bold, specific, and punchy." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const candidate = (typeof rawContent === "string" ? rawContent : "").trim();
        // Validate: must have at least two non-empty lines
        const lines = candidate.split("\n").map((l: string) => l.trim()).filter(Boolean);
        if (lines.length >= 2 && lines[0].length > 0) {
          aiTeamIdentity = lines.slice(0, 2).join("\n");
        } else {
          // Fallback to deterministic profile
          aiTeamIdentity = `${reg.sportsDayProfile ?? "THE COMPETITOR"} OF TEAM ${teamName.toUpperCase()}\n${reg.profileTagline ?? "You were built for this."}`;
        }
      } catch (err) {
        console.error("[AI Identity] LLM call failed:", err);
        // Fallback to profile + tagline
        aiTeamIdentity = `${reg.sportsDayProfile ?? "THE COMPETITOR"} OF TEAM ${teamName.toUpperCase()}\n${reg.profileTagline ?? "You were built for this."}`;
      }
      // Cache in DB
      await db
        .update(sportsDayRegistrations)
        .set({ aiTeamIdentity })
        .where(eq(sportsDayRegistrations.id, input.id));
      return { aiTeamIdentity };
    }),

  checkEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const existing = await getRegistrationByEmail(input.email.toLowerCase());
      return { exists: !!existing, id: existing?.id ?? null };
    }),

  verifyGroupCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false };
      const rows = await db
        .select()
        .from(groupCodes)
        .where(eq(groupCodes.code, input.code))
        .limit(1);
      return { valid: rows.length > 0, memberCount: rows[0]?.memberCount ?? 0 };
    }),

  confirmPayment: publicProcedure
    .input(z.object({ uid: z.string(), orderId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const reg = await getRegistrationById(input.uid);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });

      if (reg.paymentStatus === "paid") {
        return { success: true, team: reg.team, alreadyPaid: true };
      }

      // In production this would verify with Shopify API
      // For now we trust the return URL (webhook is source of truth)
      const updatedTags = buildPaymentKlaviyoTags(
        (reg.klaviyoTags as string[]) ?? [],
        reg.team!
      );

      await db
        .update(sportsDayRegistrations)
        .set({
          paymentStatus: "paid",
          accessType: "priority",
          revealStatus: "unlocked",
          shopifyOrderId: input.orderId ?? null,
          paidAt: new Date(),
          klaviyoTags: updatedTags,
        })
        .where(eq(sportsDayRegistrations.id, input.uid));

      return { success: true, team: reg.team, alreadyPaid: false };
    }),

  // Admin procedures
  adminStats: adminProcedure.query(async () => {
    return getAdminStats();
  }),

  adminUsers: adminProcedure
    .input(
      z.object({
        team: z.enum(["red", "blue", "pink", "orange", "all"]).optional(),
        paymentStatus: z.enum(["paid", "unpaid", "all"]).optional(),
        shirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL", "all"]).optional(),
        contentConsent: z.enum(["yes", "no", "ask", "all"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getAllRegistrations();
    }),

  adminHealthNotes: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const rows = await db
      .select({
        id: sportsDayRegistrations.id,
        fullName: sportsDayRegistrations.fullName,
        email: sportsDayRegistrations.email,
        healthNotes: sportsDayRegistrations.healthNotes,
      })
      .from(sportsDayRegistrations)
      .where(
        and(
          eq(sportsDayRegistrations.healthNotes, sportsDayRegistrations.healthNotes)
        )
      );
    return rows.filter((r) => r.healthNotes && r.healthNotes.trim().length > 0);
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  sportsday: sportsDayRouter,
});

export type AppRouter = typeof appRouter;
