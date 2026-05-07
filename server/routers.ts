import crypto from "crypto";
import { and, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { awardsVotes, eventSchedule, groupCodes, leaderboard, profilePhotos, sportsDayRegistrations, wildcardVotes } from "../drizzle/schema";
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
  getAllRegistrations,
  getRegistrationByEmail,
  getRegistrationById,
  getRegistrationByReferralCode,
  incrementReferralCount,
  joinGroupCode,
  linkPendingGroupCode,
} from "./sportsday.db";
import { storagePut } from "./storage";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

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
        revealSeen: reg.revealSeen ?? false,
      };
    }),
  // Mark reveal animation as seen so user goes directly to team hub on next visit
  markRevealSeen: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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

  // ─── Team Hub: get team members + leaderboard + wildcards ─────────────────
  getTeamHub: publicProcedure
    .input(z.object({ registrationId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const reg = await getRegistrationById(input.registrationId);
      if (!reg || reg.revealStatus !== "unlocked") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Team not unlocked" });
      }
      const team = reg.team;
      // Team members
      const members = await db
        .select({
          id: sportsDayRegistrations.id,
          fullName: sportsDayRegistrations.fullName,
          instagramHandle: sportsDayRegistrations.instagramHandle,
          sportsDayProfile: sportsDayRegistrations.sportsDayProfile,
          profileTagline: sportsDayRegistrations.profileTagline,
          teammateType: sportsDayRegistrations.teammateType,
          strongestEvent: sportsDayRegistrations.strongestEvent,
          captainVoteInterest: sportsDayRegistrations.captainVoteInterest,
        })
        .from(sportsDayRegistrations)
        .where(eq(sportsDayRegistrations.team, team as "red" | "blue" | "pink" | "orange"));
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
        members: members.map((m) => ({
          ...m,
          photoUrl: photoMap.get(m.id) ?? null,
        })),
        leaderboard: lb,
        wildcardCounts,
        myWildcardVotes,
        totalMembers: members.length,
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
          updatedBy: ctx.user.openId,
        })
        .onDuplicateKeyUpdate({
          set: {
            position: input.position ?? null,
            points: input.points,
            dnf: input.dnf,
            notes: input.notes ?? null,
            updatedBy: ctx.user.openId,
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
    .query(async ({ input }) => {
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
    const results = await db
      .select()
      .from(eventSchedule)
      .where(eq(eventSchedule.isLive, true))
      .limit(1);
    return results[0] ?? null;
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

  // ─── Admin password verification (server-side — password never leaks to client) ───
  verifyAdminPassword: publicProcedure
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (!adminPassword) {
        // Dev fallback: accept hardcoded default if env var not set
        if (input.password.trim() === "sd002admin") return { success: true };
        return { success: false as const, error: "Admin password not configured in deployment environment. Set ADMIN_PASSWORD in project secrets." };
      }
      if (input.password.trim() === adminPassword.trim()) {
        return { success: true as const };
      }
      return { success: false as const, error: "Incorrect password." };
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
