import crypto from "crypto";
import { and, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { awardsVotes, eventSchedule, groupCodes, leaderboard, profilePhotos, sdEvents, sportsDayRegistrations, sportsDaySessions, unmatchedPayments, wildcardVotes } from "../drizzle/schema";
import { getDb } from "./db";
import {
  assignTeam,
  buildKlaviyoTags,
  buildPaymentKlaviyoTags,
  createGroupCode,
  createGroupCodeEarly,
  generateProfile,
  generateUniqueReferralCode,
  getAdminStats,
  getUnlockStats,
  getAllRegistrations,
  getRegistrationByEmail,
  getRegistrationById,
  getRegistrationByReferralCode,
  incrementReferralCount,
  joinGroupCode,
  linkPendingGroupCode,
} from "./sportsday.db";
import { buildSportsDayDashboard, getSportsDaySettings } from "./sportsday.dashboard";
import Stripe from "stripe";
import { MAX_TOP_NAME_LENGTH } from "@shared/const";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { handleSportsDayRegistration, handleSportsDayPayment, handleTeamReassignment, handleAutoUnlock, handleShirtUpdate } from "./_core/klaviyo";
import { sendCompleteRegistrationEvent, extractUserDataFromRequest } from "./_core/metaConversionsApi";
import { TRPCError } from "@trpc/server";
import { scoringRouter } from "./routers/scoring";
import { wildcardsRouter } from "./routers/wildcards";

// ─── In-memory rate limiter ───────────────────────────────────────────────────
// Simple sliding-window rate limiter — no external dependency needed.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed
  }
  if (entry.count >= maxRequests) return false; // blocked
  entry.count++;
  return true;
}

// ─── Admin Guard ──────────────────────────────────────────────────────────────

// Admin session cookie name — separate from the sports-day participant session
const ADMIN_SESSION_COOKIE = "sd_admin_session";

// Parse raw cookie header string into a key-value map
function parseCookieString(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const idx = c.indexOf("=");
      if (idx === -1) return [c.trim(), ""];
      return [c.slice(0, idx).trim(), decodeURIComponent(c.slice(idx + 1).trim())];
    })
  );
}

// Check if the request has a valid admin session cookie
function hasAdminSession(req: { headers?: { cookie?: string } }): boolean {
  const cookies = parseCookieString(req.headers?.cookie);
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) return false;
  // Token is a HMAC of the admin password — verify it matches
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expected = crypto.createHmac("sha256", adminPassword).update("admin_session").digest("hex");
  return token === expected;
}

// Admin procedure: accepts either OAuth admin role OR valid admin session cookie
const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  const isOAuthAdmin = ctx.user?.role === "admin";
  const hasCookieSession = hasAdminSession(ctx.req);
  if (!isOAuthAdmin && !hasCookieSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
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
        groupCode: z.string().max(20).optional(), // SECURITY: Validate group code length
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
        shirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]).optional(),
        shirtFit: z.enum(["regular", "oversized"]).optional(),
        healthNotes: z.string().optional(),
        contentConsent: z.enum(["yes", "no", "ask"]).optional(),
        marketingConsent: z.boolean().optional(),
        referredBy: z.string().optional(),
        eventId: z.string().uuid().optional(),
        // UTM attribution
        utmSource: z.string().max(100).optional(),
        utmMedium: z.string().max(100).optional(),
        utmCampaign: z.string().max(200).optional(),
        utmContent: z.string().max(200).optional(),
        utmTerm: z.string().max(200).optional(),
        utmLandingPage: z.string().max(500).optional(),
      })
    )
     .mutation(async ({ input, ctx }) => {
      // Rate limit: 5 registrations per minute per IP
      const ip = ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown";
      if (!checkRateLimit(`register:${ip}`, 5, 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait a minute and try again." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const email = input.email.toLowerCase().trim();
      // Check for duplicate emaill
      const existing = await getRegistrationByEmail(email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "This email is already registered." });
      }

      // Assign team (load-balanced)
      const team = await assignTeam();

      // Generate IDs
      const id = crypto.randomUUID();
      const unlockToken = crypto.randomUUID(); // Non-guessable token for payment matching
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
          // Check if there's a pending code created early with this name
          const linkedCode = await linkPendingGroupCode(id, input.fullName.split(' ')[0]);
          if (linkedCode) {
            // Use the existing pending code
            finalGroupCode = linkedCode;
          } else {
            // Create a new code
            finalGroupCode = await createGroupCode(id);
          }
        } else if (input.groupRole === "joiner" && input.groupCode) {
          const joined = await joinGroupCode(input.groupCode.trim().toUpperCase());
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
        unlockToken, // Generated UUID for payment matching
        // UTM attribution
        utmSource: input.utmSource ?? null,
        utmMedium: input.utmMedium ?? null,
        utmCampaign: input.utmCampaign ?? null,
        utmContent: input.utmContent ?? null,
        utmTerm: input.utmTerm ?? null,
        utmLandingPage: input.utmLandingPage ?? null,
      });

      // Increment referrer's count
      if (input.referredBy) {
        await incrementReferralCount(input.referredBy);
      }

      // Send to Klaviyo (non-blocking)
      handleSportsDayRegistration(
        email,
        input.fullName.trim(),
        team,
        finalGroupCode ?? null,
        input.shirtSize ?? null,
        "unpaid",
        input.marketingConsent ?? false
      ).catch((err) => {
        console.error("[Registration] Klaviyo sync failed:", err);
      });

      // Send Meta Conversions API CompleteRegistration event (non-blocking)
      // Use provided eventId or generate one for deduplication with frontend pixel
      const completeRegistrationEventId = input.eventId || crypto.randomUUID();
      sendCompleteRegistrationEvent(completeRegistrationEventId, {
        email,
        ...extractUserDataFromRequest(ctx.req),
      }).catch((err) => {
        console.error("[Registration] Meta Conversions API failed:", err);
      });

      // Save marketing consent to database
      await db.update(sportsDayRegistrations).set({
        marketingConsent: input.marketingConsent ?? false,
        marketingConsentCapturedAt: new Date(),
        operationalConsent: true,
        operationalConsentReason: "Submitting means we can contact you about Sports Day 002",
        operationalConsentSource: "Sports Day 002 registration form",
        operationalConsentCapturedAt: new Date(),
      }).where(eq(sportsDayRegistrations.id, id));

      return { id, referralCode, team, profile, tagline, eventId: input.eventId || id };
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
        revealSeen: reg.revealSeen ?? false,
      };
    }),
  // Mark reveal animation as seen so user goes directly to team hub on next visit
  markRevealSeen: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      // Security: verify the session cookie belongs to this registration
      const sessionCookie = ctx.req.cookies?.[COOKIE_NAME];
      if (sessionCookie) {
        const session = await db.select().from(sportsDaySessions)
          .where(and(eq(sportsDaySessions.id, sessionCookie), eq(sportsDaySessions.registrationId, input.id)))
          .limit(1);
        if (session.length === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Session does not match registration" });
        }
      }
      await db.update(sportsDayRegistrations)
        .set({ revealSeen: true })
        .where(eq(sportsDayRegistrations.id, input.id));
      return { success: true };
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
      // Return cached identity only if it matches the user's actual team (prevents stale cross-team content)
      const teamName = reg.team ? reg.team.charAt(0).toUpperCase() + reg.team.slice(1) : "Unknown";
      const teamUpper = teamName.toUpperCase();
      if (reg.aiTeamIdentity) {
        const cached = reg.aiTeamIdentity.toUpperCase();
        // Validate the cached text mentions the correct team name
        const isCorrectTeam = cached.includes(`TEAM ${teamUpper}`) || cached.includes(teamUpper);
        if (isCorrectTeam) return { aiTeamIdentity: reg.aiTeamIdentity };
        // Stale/wrong team — clear it and regenerate below
        console.log(`[AI Identity] Stale cache detected for ${input.id}: expected ${teamUpper}, clearing.`);
      }
      const prompt = `You are the identity engine for 6+1 Sports Day 002 — a high-energy competitive sports event. 
A participant has just been revealed as TEAM ${teamName.toUpperCase()}.

Here is everything we know about them:
- Name: ${reg.fullName}
- Competitiveness level: ${reg.competitiveness ?? "balanced"}
- Teammate type: ${reg.teammateType?.replace(/_/g, " ") ?? "motivator"}
- Strongest event: ${reg.strongestEvent ?? "unknown"}
- Biggest fear: ${reg.fear?.replace(/_/g, " ") ?? "unknown"}
- Event motivation: ${reg.eventMotivation ?? "not provided"}
- Attended before: ${reg.attendedBefore ? "Yes, returning" : "No, first time"}

Generate a SHORT, punchy, personalised sports day identity for this person on TEAM ${teamName.toUpperCase()}.
Format: One plain-text title (max 5 words, ALL CAPS) on the first line, then a single sentence (max 20 words) that captures their specific personality and team role.
Make it feel earned, specific to their answers, and hype them up. No generic platitudes.
Example format:
THE SILENT WEAPON OF TEAM BLUE
You don't talk about it. You just show up and make everyone else look slow.

Return ONLY the two lines. No extra text, no quotes, no explanation, no markdown, no asterisks.`;
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
          // Strip any markdown bold markers the LLM may have added
          const cleaned = lines.slice(0, 2).map((l: string) => l.replace(/\*\*/g, "").trim());
          aiTeamIdentity = cleaned.join("\n");
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
    .query(async ({ input, ctx }) => {
      // Rate limit: 15 lookups per minute per IP
      const ip = ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown";
      if (!checkRateLimit(`verify:${ip}`, 15, 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again in a minute." });
      }
      const db = await getDb();
      if (!db) return { valid: false };
      const normalised = input.code.trim().toUpperCase();
      if (normalised.length < 6) return { valid: false };
      const rows = await db
        .select()
        .from(groupCodes)
        .where(eq(groupCodes.code, normalised))
        .limit(1);
      if (rows.length > 0) {
        // First try the stored creatorName on the group_codes row (set when code was pre-created)
        let creatorName: string | undefined = rows[0].creatorName ?? undefined;
        // Fallback: look up creator's first name from their registration record
        if (!creatorName && rows[0].createdBy && !rows[0].createdBy.startsWith('pending-')) {
          const creator = await db
            .select({ fullName: sportsDayRegistrations.fullName })
            .from(sportsDayRegistrations)
            .where(eq(sportsDayRegistrations.id, rows[0].createdBy))
            .limit(1);
          creatorName = creator[0]?.fullName?.split(' ')[0] ?? undefined;
        }
        return { valid: true, memberCount: rows[0].memberCount ?? 0, full: (rows[0].memberCount ?? 0) >= 20, creatorName };
      }
      // Fallback: check if any registration was created with this code as creator
      // (handles legacy codes created before the pre-save fix)
      const fallback = await db
        .select({ id: sportsDayRegistrations.id, fullName: sportsDayRegistrations.fullName })
        .from(sportsDayRegistrations)
        .where(eq(sportsDayRegistrations.groupCode, normalised))
        .limit(1);
      if (fallback.length > 0) {
        // Auto-heal: insert the missing group_codes row so future lookups work
        try {
          await db.insert(groupCodes).values({ code: normalised, createdBy: fallback[0].id, memberCount: 1 });
        } catch { /* already inserted by concurrent request, ignore */ }
        const creatorName = fallback[0].fullName?.split(' ')[0] ?? undefined;
        return { valid: true, memberCount: 1, full: false, creatorName };
      }
      return { valid: false, memberCount: 0, full: false, creatorName: undefined };
    }),

  // Pre-create a group code in the DB immediately when the user clicks
  // "Create a group code" — so friends can join before registration completes.
  createGroupCodeEarly: publicProcedure
    .input(z.object({ firstName: z.string().max(50).optional() }))
    .mutation(async ({ input, ctx }) => {
      // Rate limit: 3 code creations per minute per IP (prevent spam)
      const ip = ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown";
      if (!checkRateLimit(`create-code:${ip}`, 3, 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many code creations. Try again in a minute." });
      }
      const code = await createGroupCodeEarly(input.firstName);
      return { code };
    }),

  confirmPayment: publicProcedure
    .input(z.object({
      uid: z.string(),
      paymentIntentId: z.string().startsWith("pi_"),  // SECURITY: must be a real Stripe PaymentIntent ID
      orderId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const reg = await getRegistrationById(input.uid);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });

      if (reg.paymentStatus === "paid") {
        return { success: true, team: reg.team, alreadyPaid: true };
      }

      // SECURITY PATCH 1: Verify paymentIntentId with Stripe before marking as paid
      const stripeKey = ENV.STRIPE_SECRET_KEY;
      if (!stripeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });

      let paymentIntent: Stripe.PaymentIntent;
      try {
        const stripe = new Stripe(stripeKey);
        paymentIntent = await stripe.paymentIntents.retrieve(input.paymentIntentId);
      } catch (err) {
        console.error("[confirmPayment] Stripe verification failed:", err);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid payment reference" });
      }

      // Verify the PaymentIntent is actually succeeded
      if (paymentIntent.status !== "succeeded") {
        console.warn(`[confirmPayment] PaymentIntent ${input.paymentIntentId} status is '${paymentIntent.status}', not 'succeeded'`);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Payment not completed" });
      }

      // Verify the PaymentIntent belongs to this registration (metadata check)
      const metaRegId = paymentIntent.metadata?.registration_id;
      if (metaRegId && metaRegId !== input.uid) {
        console.error(`[confirmPayment] PaymentIntent ${input.paymentIntentId} belongs to registration ${metaRegId}, not ${input.uid}`);
        throw new TRPCError({ code: "FORBIDDEN", message: "Payment does not match registration" });
      }

      console.log(`[confirmPayment] Stripe verified: ${input.paymentIntentId} succeeded for registration ${input.uid.substring(0, 8)}...`);

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
          stripePaymentIntentId: input.paymentIntentId,
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
  unlockStats: publicProcedure.query(async () => {
    const stats = await getUnlockStats();
    // Add 34 as baseline offset
    return {
      total: stats.total + 34,
      teams: {
        red: stats.teams.red + Math.ceil(34 * 0.25),
        blue: stats.teams.blue + Math.ceil(34 * 0.25),
        pink: stats.teams.pink + Math.ceil(34 * 0.25),
        orange: stats.teams.orange + Math.floor(34 * 0.25),
      }
    };
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
    .query(async ({ input, ctx }) => {
      // SECURITY: Return only non-sensitive fields to prevent PII exposure
      // Do not expose: email, healthNotes, instagramHandle, etc.
      const db = await getDb();
      if (!db) return [];
      const rows = await db.select({
        id: sportsDayRegistrations.id,
        fullName: sportsDayRegistrations.fullName,
        team: sportsDayRegistrations.team,
        paymentStatus: sportsDayRegistrations.paymentStatus,
        shirtSize: sportsDayRegistrations.shirtSize,
        contentConsent: sportsDayRegistrations.contentConsent,
        createdAt: sportsDayRegistrations.createdAt,
      }).from(sportsDayRegistrations);
      return rows;
    }),

  // SECURITY: Separate endpoint for sensitive health data with audit logging
  adminHealthNotes: adminProcedure.query(async ({ ctx }) => {
    // SECURITY: Audit log access to sensitive health data
    if (ctx.user) {
      console.log(`[AUDIT] Admin ${ctx.user.id} accessed health notes at ${new Date().toISOString()}`);
    }
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

  // ─── GDPR: Admin data deletion (right to erasure) ──────────────────────────
  adminDeleteUserData: adminProcedure
    .input(z.object({
      email: z.string().email(),
      confirmDelete: z.literal(true), // Safety: must explicitly pass true
    }))
    .mutation(async ({ input, ctx }) => {
      // SECURITY: Audit log all deletion requests
      console.log(`[GDPR DELETION] Admin ${ctx.user?.id ?? 'password-session'} requested deletion for email: ${input.email} at ${new Date().toISOString()}`);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Find registration by email
      const rows = await db
        .select({ id: sportsDayRegistrations.id, fullName: sportsDayRegistrations.fullName, email: sportsDayRegistrations.email })
        .from(sportsDayRegistrations)
        .where(eq(sportsDayRegistrations.email, input.email.toLowerCase()))
        .limit(1);

      if (rows.length === 0) {
        return { success: false, message: "No registration found for this email address" };
      }

      const reg = rows[0];

      // Anonymise personal data (GDPR erasure — soft delete preserving non-PII)
      await db
        .update(sportsDayRegistrations)
        .set({
          fullName: "[DELETED]",
          email: `deleted-${reg.id.substring(0, 8)}@deleted.invalid`,
          instagramHandle: null,
          healthNotes: null,
          topName: null,
          sportsDayProfile: null,
          profileTagline: null,
          klaviyoTags: null,
          referralCode: null,
        })
        .where(eq(sportsDayRegistrations.id, reg.id));

      console.log(`[GDPR DELETION] Completed anonymisation for registration ${reg.id.substring(0, 8)}... (was: ${reg.fullName})`);

      return {
        success: true,
        message: `Personal data anonymised for registration ${reg.id.substring(0, 8)}. Non-PII records (team, payment status) retained for operational integrity.`,
      };
    }),

  // ─── Team Hub: get team members + leaderboard + wildcards ─────────────────
  getTeamHub: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const reg = await getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
      
      // Check if public reveal is active (July 11th 8pm BST)
      const { buildSportsDayDashboard } = await import("./sportsday.dashboard");
      const dashboard = await buildSportsDayDashboard(input.registrationId);
      const isPublicReveal = dashboard?.state === "PUBLIC_REVEAL";
      
      // Allow access if: paid/unlocked OR public reveal is active
      if (reg.revealStatus !== "unlocked" && !isPublicReveal) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Team not unlocked" });
      }
      const team = reg.team;
      // Team members:
      // - Before public reveal: only show paid/unlocked teammates
      // - After public reveal (July 11th 8pm): show all teammates
      const memberQuery = isPublicReveal
        ? db.select({
            id: sportsDayRegistrations.id,
            fullName: sportsDayRegistrations.fullName,
            instagramHandle: sportsDayRegistrations.instagramHandle,
            sportsDayProfile: sportsDayRegistrations.sportsDayProfile,
            profileTagline: sportsDayRegistrations.profileTagline,
            teammateType: sportsDayRegistrations.teammateType,
            strongestEvent: sportsDayRegistrations.strongestEvent,
          })
          .from(sportsDayRegistrations)
          .where(eq(sportsDayRegistrations.team, team as "red" | "blue" | "pink" | "orange"))
        : db.select({
            id: sportsDayRegistrations.id,
            fullName: sportsDayRegistrations.fullName,
            instagramHandle: sportsDayRegistrations.instagramHandle,
            sportsDayProfile: sportsDayRegistrations.sportsDayProfile,
            profileTagline: sportsDayRegistrations.profileTagline,
            teammateType: sportsDayRegistrations.teammateType,
            strongestEvent: sportsDayRegistrations.strongestEvent,
          })
          .from(sportsDayRegistrations)
          .where(
            and(
              eq(sportsDayRegistrations.team, team as "red" | "blue" | "pink" | "orange"),
              eq(sportsDayRegistrations.revealStatus, "unlocked") // Only paid/unlocked users before Sports Day
            )
          );
      const members = await memberQuery;
      // Profile photos
      const photos = await db.select().from(profilePhotos);
      const photoMap = new Map(photos.map((p) => [p.registrationId, p.url]));
      // Leaderboard
      const lb = await db.select().from(leaderboard);
      // Wildcard votes for this team
      const wv = await db
        .select()
        .from(wildcardVotes)
        .where(eq(wildcardVotes.team, team as "red" | "blue" | "pink" | "orange"));
      const wildcardCounts: Record<string, number> = {};
      wv.forEach((v) => {
        wildcardCounts[v.wildcardId] = (wildcardCounts[v.wildcardId] ?? 0) + 1;
      });
      // Has this user voted for each wildcard?
      const myWildcardVotes = wv.filter((v) => v.voterId === input.registrationId).map((v) => v.wildcardId);
      return {
        team,
        accessType: reg.accessType ?? "free",
        isPublicReveal,
        isCaptain: reg.isCaptain ?? false,
        members: members.map((m) => ({
          ...m,
          photoUrl: photoMap.get(m.id) ?? null,
        })),
        leaderboard: lb,
        wildcardCounts,
        myWildcardVotes,
        totalMembers: members.length,
        event: {
          name: "6+1 Sports Day 002",
          date: "Saturday 11 July 2026",
          dateIso: "2026-07-11",
          location: "Endcliffe Park",
          city: "Sheffield",
          postcode: "S11 7AB",
          fullAddress: "Endcliffe Park, Sheffield, S11 7AB",
          mapsUrl: "https://maps.google.com/?q=Endcliffe+Park+Sheffield+S11+7AB",
        },
      };
    }),

  // ─── Team Roster (Captains Only) ────────────────────────────────────────────
  getTeamRoster: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const reg = await getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
      
      // Security: verify the session cookie belongs to this registration
      // For legacy users (logged in before session tracking was added), allow access
      // if cookie exists but no session record found (graceful fallback)
      const sessionCookie = ctx.req.cookies?.[COOKIE_NAME];
      if (sessionCookie) {
        // Check if we have a session record — if we do, verify it matches
        const session = await db.select().from(sportsDaySessions)
          .where(eq(sportsDaySessions.id, sessionCookie))
          .limit(1);
        if (session.length > 0 && session[0].registrationId !== input.registrationId) {
          // Session exists but belongs to a different registration — block
          throw new TRPCError({ code: "FORBIDDEN", message: "Session does not match registration" });
        }
        // If no session record (legacy login) or session matches — allow through
      } else {
        // No session cookie at all — deny access
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
      }

      // Only captains of Red, Blue, Orange can see roster (not Pink)
      if (!reg.isCaptain || reg.team === "pink") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only team captains can view roster" });
      }
      
      const team = reg.team;
      // Get all team members with their unlock status
      const members = await db.select({
        id: sportsDayRegistrations.id,
        fullName: sportsDayRegistrations.fullName,
        instagramHandle: sportsDayRegistrations.instagramHandle,
        sportsDayProfile: sportsDayRegistrations.sportsDayProfile,
        profileTagline: sportsDayRegistrations.profileTagline,
        teammateType: sportsDayRegistrations.teammateType,
        strongestEvent: sportsDayRegistrations.strongestEvent,
        revealStatus: sportsDayRegistrations.revealStatus,
        paymentStatus: sportsDayRegistrations.paymentStatus,
      })
        .from(sportsDayRegistrations)
        .where(eq(sportsDayRegistrations.team, team as "red" | "blue" | "pink" | "orange"));
      
      // Get profile photos
      const photos = await db.select().from(profilePhotos);
      const photoMap = new Map(photos.map((p) => [p.registrationId, p.url]));
      
      return {
        team,
        members: members.map((m) => ({
          ...m,
          photoUrl: photoMap.get(m.id) ?? null,
          isLocked: m.revealStatus !== "unlocked",
        })),
        totalMembers: members.length,
        unlockedCount: members.filter((m) => m.revealStatus === "unlocked").length,
      };
    }),

  // ─── Profile photo upload ─────────────────────────────────────────────────
  uploadProfilePhoto: publicProcedure
    .input(z.object({
      registrationId: z.string(),
      imageDataUrl: z.string(), // base64 data URL
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const reg = await getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
      // Parse base64
      const matches = input.imageDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid image data" });
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      if (buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "Image too large (max 5MB)" });
      const ext = mimeType.includes("png") ? "png" : "jpg";
      const key = `profile-photos/${input.registrationId}.${ext}`;
      const { url } = await storagePut(key, buffer, mimeType);
      // Upsert photo record
      await db
        .insert(profilePhotos)
        .values({ registrationId: input.registrationId, storageKey: key, url })
        .onDuplicateKeyUpdate({ set: { storageKey: key, url, uploadedAt: new Date() } });
      return { url };
    }),

  // ─── Awards voting ────────────────────────────────────────────────────────
  castAwardVote: publicProcedure
    .input(z.object({
      voterId: z.string(),
      nomineeId: z.string(),
      category: z.enum(["mvp","funniest_moment","most_dramatic","best_dressed","most_competitive","biggest_surprise","team_player"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      if (input.voterId === input.nomineeId) throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot vote for yourself" });
      // Upsert: one vote per voter per category
      await db
        .insert(awardsVotes)
        .values({ voterId: input.voterId, nomineeId: input.nomineeId, category: input.category })
        .onDuplicateKeyUpdate({ set: { nomineeId: input.nomineeId } });
      return { success: true };
    }),

  getAwardVotes: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { myVotes: [], allVotes: [] };
      const reg = await getRegistrationById(input.registrationId);
      if (!reg) return { myVotes: [], allVotes: [] };
      const myVotes = await db
        .select()
        .from(awardsVotes)
        .where(eq(awardsVotes.voterId, input.registrationId));
      const allVotes = await db.select().from(awardsVotes);
      return { myVotes, allVotes };
    }),

  // ─── Awards: all competitors across all teams (for cross-team voting) ────────
  getAllCompetitors: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const reg = await getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });

      // Only accessible to unlocked users (or during public reveal)
      const { buildSportsDayDashboard } = await import("./sportsday.dashboard");
      const dashboard = await buildSportsDayDashboard(input.registrationId);
      const isPublicReveal = dashboard?.state === "PUBLIC_REVEAL";
      if (reg.revealStatus !== "unlocked" && !isPublicReveal) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Team not unlocked" });
      }

      const TEAM_HEX: Record<string, string> = {
        red: "#B80000",
        blue: "#0057FF",
        pink: "#FF3EC9",
        orange: "#FF6B00",
      };

      // Before public reveal: only unlocked competitors; after: everyone
      const whereClause = isPublicReveal
        ? undefined
        : eq(sportsDayRegistrations.revealStatus, "unlocked");

      const rows = whereClause
        ? await db.select({
            id: sportsDayRegistrations.id,
            fullName: sportsDayRegistrations.fullName,
            instagramHandle: sportsDayRegistrations.instagramHandle,
            team: sportsDayRegistrations.team,
            sportsDayProfile: sportsDayRegistrations.sportsDayProfile,
          }).from(sportsDayRegistrations).where(whereClause)
        : await db.select({
            id: sportsDayRegistrations.id,
            fullName: sportsDayRegistrations.fullName,
            instagramHandle: sportsDayRegistrations.instagramHandle,
            team: sportsDayRegistrations.team,
            sportsDayProfile: sportsDayRegistrations.sportsDayProfile,
          }).from(sportsDayRegistrations);

      // Profile photos
      const photos = await db.select().from(profilePhotos);
      const photoMap = new Map(photos.map((p) => [p.registrationId, p.url]));

      // Group by team for easy UI rendering
      const byTeam: Record<string, typeof competitors> = {};
      const competitors = rows
        .filter((r) => r.id !== input.registrationId) // exclude self
        .map((r) => ({
          id: r.id,
          playerName: r.fullName ?? "Unknown",
          team: r.team ?? "unknown",
          teamColour: TEAM_HEX[r.team ?? ""] ?? "#888888",
          instagramHandle: r.instagramHandle ?? null,
          photoUrl: photoMap.get(r.id) ?? null,
          profile: r.sportsDayProfile ?? null,
        }));

      competitors.forEach((c) => {
        if (!byTeam[c.team]) byTeam[c.team] = [];
        byTeam[c.team].push(c);
      });

      return { competitors, byTeam };
    }),

  // ─── Wildcard voting ──────────────────────────────────────────────────────
  castWildcardVote: publicProcedure
    .input(z.object({
      voterId: z.string(),
      team: z.enum(["red","blue","pink","orange"]),
      wildcardId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Check voter is on this team
      const reg = await getRegistrationById(input.voterId);
      if (!reg || reg.team !== input.team) throw new TRPCError({ code: "FORBIDDEN", message: "Not on this team" });
      // Check hasn't already voted for this wildcard
      const existing = await db
        .select()
        .from(wildcardVotes)
        .where(and(eq(wildcardVotes.voterId, input.voterId), eq(wildcardVotes.wildcardId, input.wildcardId)))
        .limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Already voted for this wildcard" });
      await db.insert(wildcardVotes).values({ voterId: input.voterId, team: input.team, wildcardId: input.wildcardId });
      return { success: true };
    }),

  // ─── Admin: leaderboard management ───────────────────────────────────────
  adminUpsertLeaderboard: adminProcedure
    .input(z.object({
      eventName: z.string(),
      team: z.enum(["red","blue","pink","orange"]),
      position: z.number().optional(),
      points: z.number().default(0),
      dnf: z.boolean().default(false),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db
        .insert(leaderboard)
        .values({
          eventName: input.eventName,
          team: input.team,
          position: input.position ?? null,
          points: input.points,
          dnf: input.dnf,
          notes: input.notes ?? null,
          updatedBy: ctx.user?.openId ?? 'admin',
        })
        .onDuplicateKeyUpdate({
          set: {
            position: input.position ?? null,
            points: input.points,
            dnf: input.dnf,
            notes: input.notes ?? null,
            updatedBy: ctx.user?.openId ?? 'admin',
          },
        });
      return { success: true };
    }),

  adminGetLeaderboard: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(leaderboard);
  }),

  adminGetAwardVotes: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const votes = await db.select().from(awardsVotes);
    // Count votes per nominee per category
    const counts: Record<string, Record<string, number>> = {};
    votes.forEach((v) => {
      if (!counts[v.category]) counts[v.category] = {};
      counts[v.category][v.nomineeId] = (counts[v.category][v.nomineeId] ?? 0) + 1;
    });
    return counts;
  }),

  checkEmailExists: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input, ctx }) => {
      // SECURITY PATCH 2: Rate limit to prevent email enumeration (5 req/min/IP)
      const ip = ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown";
      if (!checkRateLimit(`checkEmailExists:${ip}`, 5, 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Try again in a minute." });
      }
      const db = await getDb();
      if (!db) return { exists: false, id: null };
      const result = await db
        .select()
        .from(sportsDayRegistrations)
        .where(eq(sportsDayRegistrations.email, input.email))
        .limit(1);
      return { exists: result.length > 0, id: result[0]?.id ?? null };
    }),

  // Event Schedule (public)
  getEventSchedule: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(eventSchedule).orderBy(eventSchedule.sortOrder);
  }),

  getLiveEvent: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return null;
    // First try sd_events (new scoring system — status = 'live')
    const liveFromScoring = await db
      .select()
      .from(sdEvents)
      .where(eq(sdEvents.status, "live"))
      .orderBy(sdEvents.sortOrder)
      .limit(1);
    if (liveFromScoring[0]) {
      const e = liveFromScoring[0];
      // Find the next upcoming event for "up next"
      const upNext = await db
        .select()
        .from(sdEvents)
        .where(eq(sdEvents.status, "upcoming"))
        .orderBy(sdEvents.sortOrder)
        .limit(1);
      return {
        eventName: e.name,
        startTime: e.startTime ?? undefined,
        endTime: e.endTime ?? undefined,
        location: e.arena ?? undefined,
        description: undefined,
        upNext: upNext[0] ? { eventName: upNext[0].name, startTime: upNext[0].startTime ?? undefined, location: upNext[0].arena ?? undefined } : null,
      };
    }
    // Fallback: old event_schedule table
    const results = await db
      .select()
      .from(eventSchedule)
      .where(eq(eventSchedule.isLive, true))
      .limit(1);
    if (!results[0]) return null;
    return { ...results[0], upNext: null };
  }),

  // Event Schedule (admin)
  adminSetLiveEvent: adminProcedure
    .input(z.object({ id: z.number().nullable() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(eventSchedule).set({ isLive: false });
      if (input.id !== null) {
        await db.update(eventSchedule).set({ isLive: true }).where(eq(eventSchedule.id, input.id));
      }
      return { success: true };
    }),

  adminUpsertEvent: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      eventName: z.string(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      location: z.string().optional(),
      description: z.string().optional(),
      sortOrder: z.number().optional(),
      isCompleted: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      if (input.id) {
        await db.update(eventSchedule).set({
          eventName: input.eventName,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          location: input.location ?? null,
          description: input.description ?? null,
          sortOrder: input.sortOrder ?? 0,
          isCompleted: input.isCompleted ?? false,
        }).where(eq(eventSchedule.id, input.id));
      } else {
        await db.insert(eventSchedule).values({
          eventName: input.eventName,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          location: input.location ?? null,
          description: input.description ?? null,
          sortOrder: input.sortOrder ?? 0,
          isCompleted: input.isCompleted ?? false,
        });
      }
      return { success: true };
    }),

  adminDeleteEvent: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.delete(eventSchedule).where(eq(eventSchedule.id, input.id));
      return { success: true };
    }),

  // ─── Admin: Manual payment recovery ─────────────────────────────────────────
  // SECURITY: admin-only — can unlock paid access. Never expose publicly.
  adminSearchRegistration: adminProcedure
    .input(z.object({
      query: z.string().min(1).max(200),
      searchBy: z.enum(["email", "registrationId", "unlockToken", "stripePaymentIntentId"]),
    }))
    .query(async ({ input, ctx }) => {
      console.log(`[AUDIT] Admin ${ctx.user?.id ?? 'password-session'} searched registrations by ${input.searchBy} at ${new Date().toISOString()}`);
      const db = await getDb();
      if (!db) return null;

      let rows: typeof sportsDayRegistrations.$inferSelect[] = [];
      switch (input.searchBy) {
        case "email":
          rows = await db.select().from(sportsDayRegistrations)
            .where(eq(sportsDayRegistrations.email, input.query)).limit(5);
          break;
        case "registrationId":
          rows = await db.select().from(sportsDayRegistrations)
            .where(eq(sportsDayRegistrations.id, input.query)).limit(1);
          break;
        case "unlockToken":
          rows = await db.select().from(sportsDayRegistrations)
            .where(eq(sportsDayRegistrations.unlockToken, input.query)).limit(1);
          break;
        case "stripePaymentIntentId":
          rows = await db.select().from(sportsDayRegistrations)
            .where(eq(sportsDayRegistrations.stripePaymentIntentId, input.query)).limit(1);
          break;
      }
      return rows;
    }),

  adminManualUnlock: adminProcedure
    .input(z.object({
      registrationId: z.string().min(1),
      stripePaymentIntentId: z.string().optional(),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      // SECURITY: Audit log every manual unlock — admin ID, target, reason, timestamp
      const adminId = String(ctx.user?.id ?? 'password-session');
      const now = new Date();
      console.log(`[AUDIT] Admin ${adminId} manually unlocking registration ${input.registrationId} — reason: ${input.reason} — at ${now.toISOString()}`);

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [reg] = await db.select().from(sportsDayRegistrations)
        .where(eq(sportsDayRegistrations.id, input.registrationId)).limit(1);

      if (!reg) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });

      if (reg.revealStatus === "unlocked" && reg.paymentStatus === "paid") {
        return { success: true, alreadyUnlocked: true, message: "User was already unlocked" };
      }

      await db.update(sportsDayRegistrations).set({
        revealStatus: "unlocked",
        paymentStatus: "paid",
        accessType: "priority",
        manualUnlock: true,
        manuallyUnlockedBy: adminId,
        manualUnlockReason: input.reason,
        manuallyUnlockedAt: now,
        paidAt: reg.paidAt ?? now,
        paymentMatchStatus: "manual_verified",
        ...(input.stripePaymentIntentId ? { stripePaymentIntentId: input.stripePaymentIntentId } : {}),
      }).where(eq(sportsDayRegistrations.id, input.registrationId));

      console.log(`[AUDIT] Manual unlock COMPLETE for registration ${input.registrationId} by admin ${adminId}`);
      return { success: true, alreadyUnlocked: false, message: "User unlocked successfully" };
    }),

  // Search unmatched payments for admin recovery
  adminGetUnmatchedPayments: adminProcedure.query(async ({ ctx }) => {
    console.log(`[AUDIT] Admin ${ctx.user?.id ?? 'password-session'} viewed unmatched payments at ${new Date().toISOString()}`);
    const db = await getDb();
    if (!db) return [];
    return db.select().from(unmatchedPayments).orderBy(unmatchedPayments.createdAt).limit(50);
  }),

  // ─── Admin password verification (server-side — password never leaks to client) ───
  verifyAdminPassword: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // SECURITY: Rate limit admin password attempts (3 per 15 minutes per IP)
      const ip = ctx.req.ip ?? ctx.req.socket?.remoteAddress ?? "unknown";
      if (!checkRateLimit(`admin_password:${ip}`, 3, 15 * 60_000)) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait 15 minutes and try again." });
      }

      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        // SECURITY: Fail fast if admin password not configured (no hardcoded fallback)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Admin password not configured in deployment environment. Set ADMIN_PASSWORD in project secrets." });
      }

      // SECURITY: Use timing-safe comparison to prevent timing attacks
      const inputBuffer = Buffer.from(input.password.trim());
      const passwordBuffer = Buffer.from(adminPassword.trim());
      
      let match = false;
      try {
        match = crypto.timingSafeEqual(inputBuffer, passwordBuffer);
      } catch (err) {
        // timingSafeEqual throws if lengths differ; treat as mismatch
        match = false;
      }

      if (match) {
        // Set a server-side admin session cookie so subsequent adminProcedure calls are authorised
        const token = crypto.createHmac("sha256", adminPassword).update("admin_session").digest("hex");
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(ADMIN_SESSION_COOKIE, token, {
          ...cookieOptions,
          maxAge: 12 * 60 * 60 * 1000, // 12 hours
        });
        return { success: true as const };
      }
      return { success: false as const, error: "Incorrect password." };
    }),

  // ─── Admin logout (clear admin session cookie) ─────────────────────────────
  adminLogout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.res.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
    return { success: true };
  }),

  // ─── Dashboard (backend-led, security-first) ────────────────────────────────
  getSportsDayDashboard: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ input }) => {
      const dashboard = await buildSportsDayDashboard(input.registrationId);
      if (!dashboard) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });
      return dashboard;
    }),

  // ─── Save top name (before payment) ────────────────────────────────────────
  saveTopName: publicProcedure
    .input(z.object({
      registrationId: z.string(),
      topName: z.string()
        .min(1, "Top name is required")
        .max(MAX_TOP_NAME_LENGTH, `Top name must be ${MAX_TOP_NAME_LENGTH} characters or less`)
        .regex(/^[A-Za-z0-9 ]+$/, "Only letters, numbers and spaces are allowed"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const reg = await getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });

      // Check if top name is locked (past production cutoff)
      const settings = await getSportsDaySettings();
      if (settings?.topProductionCutoffAt) {
        const cutoff = new Date(settings.topProductionCutoffAt);
        if (Date.now() >= cutoff.getTime()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Top name editing is locked. Production has started." });
        }
      }

      const sanitised = input.topName.trim().toUpperCase();
      await db
        .update(sportsDayRegistrations)
        .set({ topName: sanitised, topNameLastEditedAt: new Date() })
        .where(eq(sportsDayRegistrations.id, input.registrationId));

      return { success: true, topName: sanitised };
    }),

  // ─── Update shirt size/fit (from shirt confirm screen) ────────────────────────
  updateShirtSelection: publicProcedure
    .input(z.object({
      registrationId: z.string(),
      shirtSize: z.enum(["XS", "S", "M", "L", "XL", "XXL"]),
      shirtFit: z.enum(["regular", "oversized"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const reg = await getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });
      const settings = await getSportsDaySettings();
      if (settings?.topProductionCutoffAt) {
        const cutoff = new Date(settings.topProductionCutoffAt);
        if (Date.now() >= cutoff.getTime()) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Shirt selection is locked. Production has started." });
        }
      }
      await db
        .update(sportsDayRegistrations)
        .set({ shirtSize: input.shirtSize, shirtFit: input.shirtFit })
        .where(eq(sportsDayRegistrations.id, input.registrationId));
      return { success: true };
    }),

  // ─── Get popup settings (for holding page) ────────────────────────────────
  getPopupSettings: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { enabled: false, firstVisit: null, returnVisit: null };

      // Check global toggle
      const settings = await getSportsDaySettings();
      if (!settings?.popupsEnabled) return { enabled: false, firstVisit: null, returnVisit: null };

      const reg = await getRegistrationById(input.registrationId);
      if (!reg) return { enabled: false, firstVisit: null, returnVisit: null };

      // Return cached copy if available
      if (reg.popupCopyFirstVisit && reg.popupCopyReturnVisit) {
        return {
          enabled: true,
          firstVisit: JSON.parse(reg.popupCopyFirstVisit) as { headline: string; body: string; cta: string },
          returnVisit: JSON.parse(reg.popupCopyReturnVisit) as { headline: string; body: string; cta: string },
        };
      }

      // Generate AI copy personalised to this user
      const profile = reg.sportsDayProfile?.replace(/_/g, " ") ?? "competitor";
      const sport = reg.strongestEvent ?? "all-round";
      const type = reg.teammateType?.replace(/_/g, " ") ?? "team player";
      const firstName = reg.fullName.split(" ")[0];
      const tagline = reg.profileTagline ?? "";

      const prompt = `You are writing ultra-short, punchy marketing copy for a one-day sports event called "6+1 Sports Day 002" on 11 July 2026. The event is free to attend. There is an optional early team reveal for £15 (normally £22). The copy must feel personal, urgent, and premium — not generic.

Player profile:
- First name: ${firstName}
- Sports profile: ${profile}
- Teammate type: ${type}
- Strongest event: ${sport}
- Tagline: ${tagline}

Write two pop-up variants in JSON format:
1. "firstVisit" — for someone landing for the first time. Angle: this kit has a story, it can never be replicated, people will ask where you got it. CTA should be about claiming the kit.
2. "returnVisit" — for someone who came back. Angle: they showed interest, early access is still open but won't be for long. CTA should be urgency-based.

Each variant must have:
- headline: max 6 words, ALL CAPS, punchy
- body: max 30 words, conversational, uses their profile naturally (don't force it)
- cta: max 5 words, action-oriented

Return ONLY valid JSON with this exact shape:
{ "firstVisit": { "headline": "...", "body": "...", "cta": "..." }, "returnVisit": { "headline": "...", "body": "...", "cta": "..." } }`;

      let firstVisit = { headline: "THIS KIT HAS A STORY.", body: "One colour. One event. One run. When Sports Day is done, this top is done. People will ask where you got it.", cta: "CLAIM YOUR KIT →" };
      let returnVisit = { headline: "EARLY ACCESS STILL OPEN.", body: "You came back. The early price is still live — but not for much longer. Your spot is held.", cta: "UNLOCK BEFORE PRICE CHANGES →" };

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a concise sports marketing copywriter. Output only valid JSON, no markdown." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "popup_copy",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  firstVisit: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      body: { type: "string" },
                      cta: { type: "string" },
                    },
                    required: ["headline", "body", "cta"],
                    additionalProperties: false,
                  },
                  returnVisit: {
                    type: "object",
                    properties: {
                      headline: { type: "string" },
                      body: { type: "string" },
                      cta: { type: "string" },
                    },
                    required: ["headline", "body", "cta"],
                    additionalProperties: false,
                  },
                },
                required: ["firstVisit", "returnVisit"],
                additionalProperties: false,
              },
            },
          },
        });
        const rawContent = response?.choices?.[0]?.message?.content;
        const raw = typeof rawContent === "string" ? rawContent : null;
        if (raw) {
          const parsed = JSON.parse(raw);
          firstVisit = parsed.firstVisit;
          returnVisit = parsed.returnVisit;
        }
      } catch (err) {
        console.error("[PopupCopy] LLM generation failed, using fallback copy", err);
      }

      // Cache in DB
      await db
        .update(sportsDayRegistrations)
        .set({
          popupCopyFirstVisit: JSON.stringify(firstVisit),
          popupCopyReturnVisit: JSON.stringify(returnVisit),
          popupCopyGeneratedAt: new Date(),
        })
        .where(eq(sportsDayRegistrations.id, input.registrationId));

      return { enabled: true, firstVisit, returnVisit };
    }),

  // ─── Admin: toggle pop-ups globally ──────────────────────────────────────────
  adminTogglePopups: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sportsDaySettings } = await import("../drizzle/schema");
      const existing = await db.select().from(sportsDaySettings).limit(1);
      if (existing.length === 0) {
        await db.insert(sportsDaySettings).values({ popupsEnabled: input.enabled });
      } else {
        await db.update(sportsDaySettings).set({ popupsEnabled: input.enabled });
      }
      return { success: true, popupsEnabled: input.enabled };
    }),

  // ─── Admin: toggle day-of voting gate ──────────────────────────────────────────
  adminToggleVoting: adminProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { sportsDaySettings } = await import("../drizzle/schema");
      const existing = await db.select().from(sportsDaySettings).limit(1);
      if (existing.length === 0) {
        await db.insert(sportsDaySettings).values({ votingEnabled: input.enabled });
      } else {
        await db.update(sportsDaySettings).set({ votingEnabled: input.enabled });
      }
      return { success: true, votingEnabled: input.enabled };
    }),

  // ─── Public: check if voting is enabled (day-of gate) ────────────────────────
  getVotingEnabled: publicProcedure.query(async () => {
    const settings = await getSportsDaySettings();
    return { enabled: settings?.votingEnabled ?? false };
  }),

  // ─── Admin: get current settings (for admin panel display) ───────────────────
  adminGetSettings: adminProcedure.query(async () => {
    const settings = await getSportsDaySettings();
    return settings;
  }),

  // ─── Simple Email-Based Login (Case-Insensitive) ────────────────────────────
  emailLogin: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const reg = await getRegistrationByEmail(input.email.toLowerCase());
      if (!reg) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No registration found for this email. Please register first.",
        });
      }
      const sessionId = crypto.randomBytes(32).toString("hex");
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, sessionId, {
        ...cookieOptions,
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
      // Store session server-side so we can verify ownership on protected procedures
      const db = await getDb();
      if (db) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await db.insert(sportsDaySessions).values({ id: sessionId, registrationId: reg.id, expiresAt });
      }
      console.log(`[Login] User logged in via email: ${input.email}`);
      return { success: true, registrationId: reg.id, email: reg.email };
    }),

  // ─── Captain-only: initiate a wildcard vote ────────────────────────────────
  initiateWildcard: publicProcedure
    .input(z.object({
      registrationId: z.string(),
      team: z.enum(["red","blue","pink","orange"]),
      wildcardId: z.enum(["steal","sabotage","block","double_down","all_in"]),
      targetTeam: z.enum(["red","blue","pink","orange"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      // Verify voting is enabled
      const settings = await getSportsDaySettings();
      if (!settings?.votingEnabled) throw new TRPCError({ code: "FORBIDDEN", message: "Voting is not open yet. Wildcards unlock on the day." });
      // Verify registrant is on this team
      const reg = await getRegistrationById(input.registrationId);
      if (!reg || reg.team !== input.team) throw new TRPCError({ code: "FORBIDDEN", message: "Not on this team" });
      // Verify registrant is a captain (check TEAM_CAPTAINS constant by name)
      const CAPTAIN_NAMES: Record<string, string[]> = {
        red:    ["Raphael", "Togbe"],
        blue:   ["Shola", "Adekunle"],
        pink:   ["Sade", "Adesola"],
        orange: ["Temi", "Adewale"],
      };
      const captainNames = CAPTAIN_NAMES[input.team] ?? [];
      const isCaptain = captainNames.some((name) =>
        reg.fullName?.toLowerCase().includes(name.toLowerCase())
      );
      if (!isCaptain) throw new TRPCError({ code: "FORBIDDEN", message: "Only team captains can initiate wildcards." });
      // Check no duplicate pending wildcard for this team
      const existing = await db
        .select()
        .from(wildcardVotes)
        .where(and(eq(wildcardVotes.team, input.team), eq(wildcardVotes.wildcardId, input.wildcardId)))
        .limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "A vote for this wildcard is already in progress." });
      // Cast the captain's vote (counts as the initiation + first YES vote)
      await db.insert(wildcardVotes).values({
        voterId: input.registrationId,
        team: input.team,
        wildcardId: input.wildcardId,
      });
      return { success: true, message: "Wildcard initiated. Your team is now voting." };
    }),

  // ─── Create Stripe PaymentIntent (embedded element) ─────────────────────────
  createPaymentIntent: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const reg = await getRegistrationById(input.registrationId);
      if (!reg) throw new TRPCError({ code: "NOT_FOUND" });

      // Safeguard: already unlocked — do not create another PaymentIntent
      const isAlreadyUnlocked =
        reg.revealStatus === "unlocked" ||
        reg.paymentStatus === "paid" ||
        reg.manualUnlock === true;
      if (isAlreadyUnlocked) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "ALREADY_UNLOCKED" });
      }

      const settings = await getSportsDaySettings();
      const now = Date.now();
      const priceIncreaseAt = settings?.priceIncreaseAt ? new Date(settings.priceIncreaseAt) : null;
      const isPriceIncreased =
        settings?.isPriceIncreaseActive === true ||
        (priceIncreaseAt !== null && now >= priceIncreaseAt.getTime());
      
      // Price always comes from database settings
      const amountPence = isPriceIncreased
        ? (settings?.futurePrice ?? 3500)
        : (settings?.earlyPrice ?? 1500);
      
      const isTestMode = false;

      const stripeKey = ENV.STRIPE_SECRET_KEY;
      if (!stripeKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stripe not configured" });

      const stripe = new Stripe(stripeKey);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountPence,
        currency: "gbp",
        automatic_payment_methods: { enabled: true },
        metadata: {
          registration_id: reg.id,
          unlock_token: reg.unlockToken ?? "",
          registered_email: reg.email,
          player_name: reg.fullName,
          product_type: "sports_day_team_unlock",
          event_id: "sports_day_002",
          test_mode: isTestMode ? "true" : "false",
        },
        receipt_email: reg.email,
      });

      console.log(`[Stripe] PaymentIntent created: ${paymentIntent.id} for registration ${reg.id.substring(0, 8)}...`);

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amountPence,
        registrationId: reg.id,
      };
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
  scoring: scoringRouter,
  wildcards: wildcardsRouter,
});

export type AppRouter = typeof appRouter;
