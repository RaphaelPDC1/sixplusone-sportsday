import { invokeLLM } from "./_core/llm";
import { getTeamCounts } from "./sportsday.db";


/**
 * Team fairness chatbot with guardrails
 * Only answers questions about team assignment fairness and event info
 * Blocks sensitive/competitive questions
 */

const SYSTEM_PROMPT = `You are a friendly AI assistant for Sports Day 002. Your ONLY job is to answer questions about:
1. How teams were assigned (load-balancing algorithm)
2. Whether teams are fair (team balance statistics)
3. Why someone is on their team (algorithm explanation)
4. General Sports Day event information (date, location, rules)

You MUST REFUSE and redirect if someone asks about:
- Other team members' profiles or data
- Team rosters before unlock
- Hints about who's on which team
- Ways to cheat or game the system
- Personal information about participants
- Payment/unlock workarounds
- Anything outside Sports Day event info

If they ask something off-topic, respond: "I can only answer questions about team fairness and Sports Day event details. What would you like to know about how teams were assigned or the event?"

Be concise, friendly, and transparent about the algorithm.`;

export async function askTeamFairnessBot(userMessage: string): Promise<string> {
  // Get team statistics for context
  const teamCounts = await getTeamCounts();
  const teamSummary = Object.entries(teamCounts)
    .map(([team, count]: [string, number]) => `${team}: ${count} members`)
    .join(", ");

  const contextMessage = `
Current team statistics: ${teamSummary}

Team assignment algorithm: Load-balanced assignment ensures teams stay within 1 member of each other. When someone registers, they're assigned to the team with the fewest members. If multiple teams are tied, one is randomly selected. This ensures fair, balanced teams.

User question: ${userMessage}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: contextMessage },
      ],
    });

        const botReply = response.choices[0]?.message?.content;
    if (typeof botReply === 'string') {
      return botReply;
    }
    return "I couldn't process that question.";
  } catch (error) {
    console.error("Chatbot error:", error);
    return "Sorry, I'm having trouble answering right now. Please try again.";
  }
}
