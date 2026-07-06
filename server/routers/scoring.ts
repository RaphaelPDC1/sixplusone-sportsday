/**
 * Phase 1 Scoring Router
 * Handles: events CRUD, result entry/locking, live leaderboard, audit log, admin overrides
 */
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { sdEventResults, sdEvents, sdPointsLog } from "../../drizzle/schema";
import { getDb } from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";

// ─── Points table (configurable) ─────────────────────────────────────────────
const BASE_POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 4, 4: 2 };

// ─── Admin session guard ──────────────────────────────────────────────────────
const ADMIN_SESSION_COOKIE = "sd_admin_session";

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

function hasAdminSession(req: { headers?: { cookie?: string } }): boolean {
  const cookies = parseCookieString(req.headers?.cookie);
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) return false;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const expected = crypto.createHmac("sha256", adminPassword).update("admin_session").digest("hex");
  return token === expected;
}

const adminProcedure = publicProcedure.use(({ ctx, next }) => {
  const isOAuthAdmin = ctx.user?.role === "admin";
  const hasCookieSession = hasAdminSession(ctx.req);
  if (!isOAuthAdmin && !hasCookieSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Admin access required" });
  }
  return next({ ctx });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Team = "red" | "blue" | "pink" | "orange";
const TEAMS: Team[] = ["red", "blue", "pink", "orange"];

/** Compute live team totals from the points log */
async function computeTeamTotals(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) return { red: 0, blue: 0, pink: 0, orange: 0 };
  const rows = await db
    .select({
      team: sdPointsLog.team,
      total: sql<number>`COALESCE(SUM(${sdPointsLog.delta}), 0)`,
    })
    .from(sdPointsLog)
    .groupBy(sdPointsLog.team);

  const totals: Record<Team, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
  for (const r of rows) {
    totals[r.team as Team] = Number(r.total);
  }
  // Floor at 0
  for (const t of TEAMS) totals[t] = Math.max(0, totals[t]);
  return totals;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const scoringRouter = router({
  // ── Get all events ────────────────────────────────────────────────────────
  getEvents: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(sdEvents).orderBy(asc(sdEvents.sortOrder));
  }),

  // ── Admin: update event status ────────────────────────────────────────────
  adminSetEventStatus: adminProcedure
    .input(z.object({
      eventId: z.number(),
      status: z.enum(["upcoming", "armed", "briefing", "live", "delayed", "complete"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(sdEvents)
        .set({ status: input.status })
        .where(eq(sdEvents.id, input.eventId));
      console.log(`[SCORING] Admin set event ${input.eventId} → ${input.status}`);
      return { success: true };
    }),

  // ── Admin: update event details (name, arena, times, sort, multiplier) ───
  adminUpdateEvent: adminProcedure
    .input(z.object({
      eventId: z.number(),
      name: z.string().min(1).max(100).optional(),
      arena: z.string().max(50).optional(),
      startTime: z.string().max(10).optional(),
      endTime: z.string().max(10).optional(),
      sortOrder: z.number().optional(),
      pointsMultiplier: z.number().min(1).max(10).optional(),
      wildcardsEnabled: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const { eventId, ...updates } = input;
      // Remove undefined keys
      const set = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
      if (Object.keys(set).length === 0) return { success: true };
      await db.update(sdEvents).set(set).where(eq(sdEvents.id, eventId));
      return { success: true };
    }),

  // ── Admin: enter/update result for one team in one event ─────────────────
  adminEnterResult: adminProcedure
    .input(z.object({
      eventId: z.number(),
      team: z.enum(["red", "blue", "pink", "orange"]),
      placement: z.number().min(1).max(4),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get event multiplier
      const [event] = await db.select().from(sdEvents).where(eq(sdEvents.id, input.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      // Prevent editing locked results
      const [existing] = await db
        .select()
        .from(sdEventResults)
        .where(and(eq(sdEventResults.eventId, input.eventId), eq(sdEventResults.team, input.team)))
        .limit(1);
      if (existing?.locked) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Result is locked. Use admin override to change." });
      }

      const basePoints = BASE_POINTS[input.placement] ?? 0;
      const finalPoints = basePoints * event.pointsMultiplier;

      await db
        .insert(sdEventResults)
        .values({
          eventId: input.eventId,
          team: input.team,
          placement: input.placement,
          basePoints,
          finalPoints,
          locked: false,
        })
        .onDuplicateKeyUpdate({
          set: {
            placement: input.placement,
            basePoints,
            finalPoints,
            locked: false,
          },
        });

      return { success: true, basePoints, finalPoints };
    }),

  // ── Admin: lock results for an event (pushes to leaderboard) ─────────────
  adminLockEventResults: adminProcedure
    .input(z.object({ eventId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const actor = ctx.user?.openId ?? "admin";
      const now = new Date();

      // Get all unlocked results for this event
      const results = await db
        .select()
        .from(sdEventResults)
        .where(and(eq(sdEventResults.eventId, input.eventId), eq(sdEventResults.locked, false)));

      if (results.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No unlocked results to lock for this event." });
      }

      // Lock each result and write audit log
      for (const r of results) {
        await db
          .update(sdEventResults)
          .set({ locked: true, lockedAt: now, lockedBy: actor })
          .where(eq(sdEventResults.id, r.id));

        await db.insert(sdPointsLog).values({
          team: r.team,
          delta: r.finalPoints ?? 0,
          reason: "event_result",
          eventId: input.eventId,
          actor,
          note: `Event ${input.eventId}: placement ${r.placement}, ${r.finalPoints} pts`,
        });
      }

      console.log(`[SCORING] Admin locked ${results.length} results for event ${input.eventId}`);
      return { success: true, locked: results.length };
    }),

  // ── Admin: override a locked result ───────────────────────────────────────
  adminOverrideResult: adminProcedure
    .input(z.object({
      eventId: z.number(),
      team: z.enum(["red", "blue", "pink", "orange"]),
      newPlacement: z.number().min(1).max(4),
      reason: z.string().min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const actor = ctx.user?.openId ?? "admin";
      const now = new Date();

      const [event] = await db.select().from(sdEvents).where(eq(sdEvents.id, input.eventId)).limit(1);
      if (!event) throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });

      const [existing] = await db
        .select()
        .from(sdEventResults)
        .where(and(eq(sdEventResults.eventId, input.eventId), eq(sdEventResults.team, input.team)))
        .limit(1);

      const oldFinalPoints = existing?.finalPoints ?? 0;
      const newBasePoints = BASE_POINTS[input.newPlacement] ?? 0;
      const newFinalPoints = newBasePoints * event.pointsMultiplier;
      const delta = newFinalPoints - oldFinalPoints;

      // Update the result
      await db
        .insert(sdEventResults)
        .values({
          eventId: input.eventId,
          team: input.team,
          placement: input.newPlacement,
          basePoints: newBasePoints,
          finalPoints: newFinalPoints,
          locked: true,
          lockedAt: now,
          lockedBy: actor,
        })
        .onDuplicateKeyUpdate({
          set: {
            placement: input.newPlacement,
            basePoints: newBasePoints,
            finalPoints: newFinalPoints,
            locked: true,
            lockedAt: now,
            lockedBy: actor,
          },
        });

      // Write audit log for the correction
      if (delta !== 0) {
        await db.insert(sdPointsLog).values({
          team: input.team,
          delta,
          reason: "admin_override",
          eventId: input.eventId,
          actor,
          note: `Override: placement ${existing?.placement ?? '?'} → ${input.newPlacement}. Reason: ${input.reason}`,
        });
      }

      console.log(`[SCORING] Admin override event ${input.eventId} team ${input.team}: delta ${delta}`);
      return { success: true, delta };
    }),

  // ── Admin: manual points adjustment (non-event) ───────────────────────────
  adminAdjustPoints: adminProcedure
    .input(z.object({
      team: z.enum(["red", "blue", "pink", "orange"]),
      delta: z.number(),
      reason: z.enum(["admin_override", "sabotage"]),
      note: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const actor = ctx.user?.openId ?? "admin";
      await db.insert(sdPointsLog).values({
        team: input.team,
        delta: input.delta,
        reason: input.reason,
        actor,
        note: input.note ?? null,
      });

      console.log(`[SCORING] Admin adjusted ${input.team} by ${input.delta} (${input.reason})`);
      return { success: true };
    }),

  // ── Live leaderboard ───────────────────────────────────────────────────────
  getLiveLeaderboard: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    const totals = await computeTeamTotals(db);
    const lastLog = await db
      .select({ createdAt: sdPointsLog.createdAt })
      .from(sdPointsLog)
      .orderBy(desc(sdPointsLog.createdAt))
      .limit(1);

    return TEAMS.map((team) => ({
      team,
      points: totals[team],
    }))
      .sort((a, b) => b.points - a.points)
      .map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        lastUpdated: lastLog[0]?.createdAt ?? null,
      }));
  }),

  // ── Event results (for admin result entry view) ────────────────────────────
  getEventResults: adminProcedure
    .input(z.object({ eventId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(sdEventResults)
        .where(eq(sdEventResults.eventId, input.eventId));
    }),

  // ── Audit log ─────────────────────────────────────────────────────────────
  getAuditLog: adminProcedure
    .input(z.object({ limit: z.number().min(1).max(500).default(100) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db
        .select()
        .from(sdPointsLog)
        .orderBy(desc(sdPointsLog.createdAt))
        .limit(input.limit);
    }),

  // ── Public: locked event results (for TeamHub leaderboard tab) ────────────
  getPublicEventResults: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    // Only return locked results (pushed to leaderboard by admin)
    const results = await db
      .select({
        eventId: sdEventResults.eventId,
        team: sdEventResults.team,
        placement: sdEventResults.placement,
        finalPoints: sdEventResults.finalPoints,
        locked: sdEventResults.locked,
      })
      .from(sdEventResults)
      .where(eq(sdEventResults.locked, true));
    return results;
  }),
});
