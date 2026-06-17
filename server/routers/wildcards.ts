/**
 * Wildcard system backend
 * Vote engine, Steal/Block logic, vote weight calculation, card tracking
 */
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sdWildcards, sdWildcardVotes, sdTeams, sdTeamMembers, sdRosterOverrides, sdPointsLog, sdEvents } from "../../drizzle/schema";

// ─── Vote Weight Calculation ──────────────────────────────────────────────────

/**
 * Calculate vote weights for a team at the time a wildcard is opened.
 * Captain = 0.50, remaining 0.50 split equally among present members.
 */
async function calculateVoteWeights(teamName: string, db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  
  // Get team ID
  const teams = await db.select().from(sdTeams).where(eq(sdTeams.name, teamName as any));
  const team = teams[0];
  if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });

  // Get team members
  const members = await db.select().from(sdTeamMembers).where(eq(sdTeamMembers.teamId, team.id));

  // Snapshot: captain always gets 0.50, members split remaining 0.50
  const memberCount = members.filter((m) => m.role === "member").length;
  const memberWeight = memberCount > 0 ? (0.50 / memberCount).toFixed(2) : "0.00";

  return {
    captain: "0.50",
    memberWeight,
    memberCount,
    captainUserId: team.captainUserId,
    viceCaptainUserId: team.viceCaptainUserId,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const wildcardsRouter = router({
  // Open a wildcard vote
  openVote: protectedProcedure
    .input(
      z.object({
        teamName: z.enum(["red", "blue", "pink", "orange"]),
        eventId: z.number().int(),
        wildcardType: z.enum(["steal", "sabotage", "double_down", "all_in"]),
        targetTeam: z.enum(["red", "blue", "pink", "orange"]).optional(),
        targetPlayerId: z.number().int().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // TODO: verify user is captain of teamName

      // Check team has cards remaining
      const teams = await db.select().from(sdTeams).where(eq(sdTeams.name, input.teamName as any));
      const team = teams[0];
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      if (team.cardsRemaining <= 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No wildcard cards remaining" });
      }

      // Check no pending wildcard for this team on this event
      const pending = await db
        .select()
        .from(sdWildcards)
        .where(
          and(
            eq(sdWildcards.ownerTeam, input.teamName as any),
            eq(sdWildcards.eventId, input.eventId),
            eq(sdWildcards.status, "pending")
          )
        );
      if (pending.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Team already has a pending wildcard for this event" });
      }

      // Create wildcard
      await db.insert(sdWildcards).values({
        type: input.wildcardType,
        ownerTeam: input.teamName as any,
        eventId: input.eventId,
        status: "pending",
        targetTeam: input.targetTeam as any,
        targetPlayerId: input.targetPlayerId,
      });

      return { success: true }
    }),

  // Cast a vote on a wildcard
  castVote: protectedProcedure
    .input(
      z.object({
        wildcardId: z.number().int(),
        vote: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Get wildcard to find team and weights
      const wildcards = await db.select().from(sdWildcards).where(eq(sdWildcards.id, input.wildcardId));
      const wc = wildcards[0];
      if (!wc) throw new TRPCError({ code: "NOT_FOUND", message: "Wildcard not found" });
      if (wc.status !== "pending") {
        throw new TRPCError({ code: "CONFLICT", message: "Wildcard is not open for voting" });
      }

      const weights = await calculateVoteWeights(wc.ownerTeam, db);

      // Determine user's weight
      let userWeight = "0.00";
      if (ctx.user?.id === weights.captainUserId) {
        userWeight = weights.captain;
      } else {
        userWeight = weights.memberWeight;
      }

      // Insert vote
      await db.insert(sdWildcardVotes).values({
        wildcardId: input.wildcardId,
        userId: ctx.user!.id,
        vote: input.vote,
        weight: userWeight,
      });

      return { success: true };
    }),

  // Check if a wildcard has reached threshold
  checkThreshold: protectedProcedure
    .input(z.object({ wildcardId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const wildcards = await db.select().from(sdWildcards).where(eq(sdWildcards.id, input.wildcardId));
      const wc = wildcards[0];
      if (!wc) throw new TRPCError({ code: "NOT_FOUND", message: "Wildcard not found" });

      const weights = await calculateVoteWeights(wc.ownerTeam, db);

      // Get all votes
      const votes = await db.select().from(sdWildcardVotes).where(eq(sdWildcardVotes.wildcardId, input.wildcardId));

      // Check captain voted YES
      const captainVote = votes.find((v) => v.userId === weights.captainUserId);
      if (!captainVote || !captainVote.vote) {
        return { reached: false, reason: "Captain did not vote YES" };
      }

      // Sum YES weights
      const yesWeight = votes
        .filter((v) => v.vote)
        .reduce((sum, v) => sum + parseFloat(v.weight), 0);

      if (yesWeight >= 0.75) {
        return { reached: true, yesWeight };
      }

      return { reached: false, reason: `Insufficient weight: ${yesWeight.toFixed(2)} < 0.75`, yesWeight };
    }),

  // Get active wildcards for an event
  getActiveWildcards: protectedProcedure
    .input(z.object({ eventId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return await db
        .select()
        .from(sdWildcards)
        .where(
          and(
            eq(sdWildcards.eventId, input.eventId),
            eq(sdWildcards.status, "active")
          )
        );
    }),

  // Get team's card budget
  getCardBudget: protectedProcedure
    .input(z.object({ teamName: z.enum(["red", "blue", "pink", "orange"]) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const teams = await db.select().from(sdTeams).where(eq(sdTeams.name, input.teamName as any));
      const team = teams[0];
      if (!team) throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      return { cardsRemaining: team.cardsRemaining };
    }),

  // Get all wildcards for an event (admin view)
  getEventWildcards: protectedProcedure
    .input(z.object({ eventId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return await db.select().from(sdWildcards).where(eq(sdWildcards.eventId, input.eventId));
    }),

  // Get votes on a wildcard (admin view)
  getWildcardVotes: protectedProcedure
    .input(z.object({ wildcardId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      return await db.select().from(sdWildcardVotes).where(eq(sdWildcardVotes.wildcardId, input.wildcardId));
    }),
});
