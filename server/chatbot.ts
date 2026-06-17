import { invokeLLM } from "./_core/llm";
import { getTeamCounts } from "./sportsday.db";
import { checkRateLimit, withCache } from "./rateLimit";
import { getDb } from "./db";
import { sdEvents, sdTeams, sdPointsLog } from "../drizzle/schema";
import { desc } from "drizzle-orm";

/**
 * Sports Day 002 assistant chatbot
 * Answers questions about logistics, schedule, events, teams, rules, travel, and team fairness.
 */

/**
 * Build dynamic system prompt with live data
 */
async function buildSystemPrompt(): Promise<string> {
  const db = await getDb();
  let eventList = "";
  let leaderboard = "";

  if (db) {
    try {
      const events = await db.select().from(sdEvents).orderBy(sdEvents.sortOrder);
      eventList = events
        .map((e) => `- ${e.name} (${e.arena}): ${e.startTime}–${e.endTime}${e.pointsMultiplier > 1 ? ` [${e.pointsMultiplier}x]` : ""}`)
        .join("\n");

      const teams = await db.select().from(sdTeams);
      leaderboard = teams
        .sort((a, b) => (b.pointsTotal ?? 0) - (a.pointsTotal ?? 0))
        .map((t, i) => `${i + 1}. ${t.name.toUpperCase()}: ${t.pointsTotal ?? 0} pts (${t.cardsRemaining} cards)`)
        .join("\n");
    } catch (e) {
      console.warn("[Chatbot] Could not fetch live data:", e);
    }
  }

  return `You are a friendly, knowledgeable assistant for 6+1 Sports Day 002 — a private sports day event on 11 July 2026 in Sheffield, UK. You help attendees with any questions about the event.

## LIVE LEADERBOARD
${leaderboard || "(Loading...)"}

## LIVE EVENTS
${eventList || "(Loading...)"}

## EVENT OVERVIEW
- **Date:** Saturday 11 July 2026
- **Location:** Sheffield, UK
- **Format:** 4 teams (Red, Blue, Pink, Orange) competing across 11 events
- **Duration:** 10:30 – 13:30 (events), followed by awards/finale

## TEAMS
- **Red Team** — Squad name: FURY. Captains: Raphael, Mia
- **Blue Team** — Squad name: STORM. Captains: Zara, Luca
- **Pink Team** — Squad name: UNRULY. Captains: Verity, Henry
- **Orange Team** — Squad name: CHAOS. Captains: Nahal, George

## SCORING
- 1st place = 10 points, 2nd = 7, 3rd = 4, 4th = 2
- Tug of War (finale) = **double points**: 1st = 20, 2nd = 14, 3rd = 8, 4th = 4

## WILDCARDS
Each team gets **3 wildcard activations** per event. Types:
- **Steal** — Vote to borrow one player from a rival team for one event
- **Sabotage** — Vote to deduct 5 points from a rival team's total
- **Block** — Instantly counter an incoming Steal
- **Double Down** — Double your team's points for one event
- **All In** — Triple points if you place, zero if you don't

Vote mechanics: Captain vote = 0.50 weight, members split remaining 0.50. Requires: Captain YES + 75% team weight.

## EVENT RULES & LOGISTICS
- Arrive by **10:15** to register and warm up
- Wear your team colour
- Bring water, sunscreen, and appropriate footwear
- Events run rain or shine
- Food and drinks available on site

## WHAT YOU CAN HELP WITH
Answer questions about: schedule, events, rules, scoring, wildcards, teams, logistics, travel, what to bring, and general event info.

Be concise, warm, and helpful. Use bullet points for lists. Keep answers under 150 words unless detailed explanation is needed.`;
}

export async function askTeamFairnessBot(userMessage: string, ipKey = "global"): Promise<string> {
  // Rate limit: 10 requests per IP per minute
  if (!checkRateLimit(`chatbot:${ipKey}`, 10, 60 * 1000)) {
    return "You're asking a lot of questions! Please wait a moment before asking again.";
  }

  try {
    const systemPrompt = await buildSystemPrompt();
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const botReply = response.choices[0]?.message?.content;
    if (typeof botReply === "string") {
      return botReply;
    }
    return "I couldn't process that question — try rephrasing it!";
  } catch (error) {
    console.error("Chatbot error:", error);
    return "Sorry, I'm having trouble right now. Please try again in a moment.";
  }
}
