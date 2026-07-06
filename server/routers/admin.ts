/**
 * Admin Router
 * Handles: attendance check-in, invite codes, paid-user T-shirt export, power-up admin controls
 */
import crypto from "crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  sdAttendance,
  sdInviteCodes,
  sportsDayRegistrations,
} from "../../drizzle/schema";

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

// ─── Router ───────────────────────────────────────────────────────────────────

export const adminRouter = router({

  // ── Attendance: get full roster for all teams ─────────────────────────────
  getAttendance: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    // Get all registrations with their attendance status
    const regs = await db
      .select({
        id: sportsDayRegistrations.id,
        fullName: sportsDayRegistrations.fullName,
        team: sportsDayRegistrations.team,
        shirtSize: sportsDayRegistrations.shirtSize,
        shirtFit: sportsDayRegistrations.shirtFit,
        topName: sportsDayRegistrations.topName,
        accessType: sportsDayRegistrations.accessType,
      })
      .from(sportsDayRegistrations)
      .orderBy(sportsDayRegistrations.team, sportsDayRegistrations.fullName);

    // Get all attendance records
    const attendance = await db.select().from(sdAttendance);
    const attendanceMap = new Map(attendance.map((a) => [a.registrationId, a]));

    return regs.map((r) => ({
      ...r,
      present: attendanceMap.get(r.id)?.present ?? false,
      markedAt: attendanceMap.get(r.id)?.markedAt ?? null,
    }));
  }),

  // ── Attendance: mark a participant as present/absent ─────────────────────
  markAttendance: adminProcedure
    .input(z.object({
      registrationId: z.string(),
      present: z.boolean(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Get the registration to confirm team
      const [reg] = await db
        .select({ team: sportsDayRegistrations.team })
        .from(sportsDayRegistrations)
        .where(eq(sportsDayRegistrations.id, input.registrationId))
        .limit(1);

      if (!reg?.team) throw new TRPCError({ code: "NOT_FOUND", message: "Registration not found" });

      const adminId = ctx.user?.id?.toString() ?? "admin";

      await db
        .insert(sdAttendance)
        .values({
          registrationId: input.registrationId,
          team: reg.team as any,
          present: input.present,
          markedAt: input.present ? new Date() : null,
          markedBy: adminId,
        })
        .onDuplicateKeyUpdate({
          set: {
            present: input.present,
            markedAt: input.present ? new Date() : null,
            markedBy: adminId,
          },
        });

      return { success: true };
    }),

  // ── Attendance: get present counts per team (for power-up threshold) ──────
  getPresentCounts: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { red: 0, blue: 0, pink: 0, orange: 0 };

    const rows = await db
      .select({
        team: sdAttendance.team,
        count: sql<number>`COUNT(*)`,
      })
      .from(sdAttendance)
      .where(eq(sdAttendance.present, true))
      .groupBy(sdAttendance.team);

    const counts: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
    for (const r of rows) {
      counts[r.team] = Number(r.count);
    }
    return counts;
  }),

  // ── Paid users export (T-shirt fulfillment) ───────────────────────────────
  getPaidUsersExport: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];

    const rows = await db
      .select({
        id: sportsDayRegistrations.id,
        fullName: sportsDayRegistrations.fullName,
        email: sportsDayRegistrations.email,
        team: sportsDayRegistrations.team,
        shirtSize: sportsDayRegistrations.shirtSize,
        shirtFit: sportsDayRegistrations.shirtFit,
        topName: sportsDayRegistrations.topName,
        paidAt: sportsDayRegistrations.paidAt,
        paymentMatchStatus: sportsDayRegistrations.paymentMatchStatus,
        accessType: sportsDayRegistrations.accessType,
      })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.paymentStatus, "paid"))
      .orderBy(sportsDayRegistrations.team, sportsDayRegistrations.fullName);

    return rows;
  }),

  // ── Invite codes: list all ────────────────────────────────────────────────
  getInviteCodes: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(sdInviteCodes).orderBy(desc(sdInviteCodes.createdAt));
  }),

  // ── Invite codes: create a new one ────────────────────────────────────────
  createInviteCode: adminProcedure
    .input(z.object({
      note: z.string().max(200).optional(),
      maxUses: z.number().min(1).max(20).default(1),
      expiresHours: z.number().min(1).max(168).optional(), // optional expiry in hours
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Generate a readable code: LATE-XXXX
      const suffix = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
      const code = `LATE-${suffix}`;

      const expiresAt = input.expiresHours
        ? new Date(Date.now() + input.expiresHours * 60 * 60 * 1000)
        : null;

      const adminId = ctx.user?.id?.toString() ?? "admin";

      await db.insert(sdInviteCodes).values({
        code,
        createdBy: adminId,
        note: input.note ?? null,
        maxUses: input.maxUses,
        expiresAt: expiresAt ?? undefined,
      });

      console.log(`[Admin] Invite code created: ${code} by ${adminId}`);
      return { success: true, code };
    }),

  // ── Invite codes: validate (public — used by registration page) ───────────
  validateInviteCode: publicProcedure
    .input(z.object({ code: z.string().max(20) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { valid: false, reason: "Database unavailable" };

      const [invite] = await db
        .select()
        .from(sdInviteCodes)
        .where(eq(sdInviteCodes.code, input.code.toUpperCase().trim()))
        .limit(1);

      if (!invite) return { valid: false, reason: "Invalid code" };
      if (invite.useCount >= invite.maxUses) return { valid: false, reason: "Code already used" };
      if (invite.expiresAt && new Date() > invite.expiresAt) return { valid: false, reason: "Code expired" };

      return { valid: true, code: invite.code };
    }),

  // ── Invite codes: consume (called during straggler registration) ──────────
  consumeInviteCode: publicProcedure
    .input(z.object({
      code: z.string().max(20),
      registrationId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [invite] = await db
        .select()
        .from(sdInviteCodes)
        .where(eq(sdInviteCodes.code, input.code.toUpperCase().trim()))
        .limit(1);

      if (!invite) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite code" });
      if (invite.useCount >= invite.maxUses) throw new TRPCError({ code: "FORBIDDEN", message: "Code already used" });
      if (invite.expiresAt && new Date() > invite.expiresAt) throw new TRPCError({ code: "FORBIDDEN", message: "Code expired" });

      await db
        .update(sdInviteCodes)
        .set({
          useCount: invite.useCount + 1,
          usedAt: new Date(),
          usedByRegistrationId: input.registrationId,
        })
        .where(eq(sdInviteCodes.id, invite.id));

      return { success: true };
    }),

  // ── Power-up threshold: get required YES votes per team ───────────────────
  getPowerUpThresholds: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { red: 3, blue: 3, pink: 3, orange: 3 };

    // Get present counts
    const rows = await db
      .select({
        team: sdAttendance.team,
        count: sql<number>`COUNT(*)`,
      })
      .from(sdAttendance)
      .where(eq(sdAttendance.present, true))
      .groupBy(sdAttendance.team);

    const counts: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
    for (const r of rows) counts[r.team] = Number(r.count);

    // Threshold: captain + min(3, presentCount - 1) members
    // If present count is 0 (attendance not set), default to 3
    const threshold = (team: string) => {
      const present = counts[team] ?? 0;
      if (present === 0) return 3; // default before attendance is taken
      return Math.min(3, Math.max(1, present - 1));
    };

    return {
      red: threshold("red"),
      blue: threshold("blue"),
      pink: threshold("pink"),
      orange: threshold("orange"),
    };
  }),
});
