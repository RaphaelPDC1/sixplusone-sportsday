import { describe, expect, it, vi, beforeEach } from "vitest";

// ─── Team assignment logic ────────────────────────────────────────────────────

type Team = "red" | "blue" | "pink" | "orange";

function assignTeam(counts: Record<Team, number>): Team {
  const teams: Team[] = ["red", "blue", "pink", "orange"];
  const minCount = Math.min(...teams.map((t) => counts[t]));
  const eligible = teams.filter((t) => counts[t] === minCount);
  return eligible[Math.floor(Math.random() * eligible.length)];
}

describe("assignTeam (load-balanced)", () => {
  it("assigns to the team with the lowest count", () => {
    const counts: Record<Team, number> = { red: 5, blue: 3, pink: 5, orange: 5 };
    const team = assignTeam(counts);
    expect(team).toBe("blue");
  });

  it("picks randomly among tied teams", () => {
    const counts: Record<Team, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
    const results = new Set<Team>();
    for (let i = 0; i < 200; i++) {
      results.add(assignTeam(counts));
    }
    // All 4 teams should appear in 200 trials
    expect(results.size).toBe(4);
  });

  it("never assigns to a team that is not at the minimum", () => {
    const counts: Record<Team, number> = { red: 10, blue: 10, pink: 10, orange: 2 };
    for (let i = 0; i < 50; i++) {
      const team = assignTeam(counts);
      expect(team).toBe("orange");
    }
  });

  it("keeps distribution roughly even over many assignments", () => {
    const counts: Record<Team, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
    for (let i = 0; i < 400; i++) {
      const team = assignTeam(counts);
      counts[team]++;
    }
    const values = Object.values(counts);
    const max = Math.max(...values);
    const min = Math.min(...values);
    // Max spread should be ≤ 4 for a balanced algorithm
    expect(max - min).toBeLessThanOrEqual(4);
  });
});

// ─── Profile generation logic ─────────────────────────────────────────────────

type ProfileInput = {
  competitiveness?: string | null;
  teammateType?: string | null;
  strongestEvent?: string | null;
};

function generateProfile(input: ProfileInput): { profile: string; tagline: string } {
  const { competitiveness, teammateType, strongestEvent } = input;

  const profileMap: Record<string, string> = {
    "winner-motivator": "THE CAPTAIN",
    "winner-strategist": "THE TACTICIAN",
    "winner-wildcard": "THE DISRUPTOR",
    "winner-silent_assassin": "THE CLOSER",
    "winner-energy_bringer": "THE HYPE MACHINE",
    "balanced-motivator": "THE BACKBONE",
    "balanced-strategist": "THE PLANNER",
    "balanced-wildcard": "THE X-FACTOR",
    "balanced-silent_assassin": "THE DARK HORSE",
    "balanced-energy_bringer": "THE CATALYST",
    "vibes-motivator": "THE CHEERLEADER",
    "vibes-strategist": "THE ANALYST",
    "vibes-wildcard": "THE ENTERTAINER",
    "vibes-silent_assassin": "THE SLEEPER",
    "vibes-energy_bringer": "THE GOOD VIBES",
  };

  const key = `${competitiveness ?? "balanced"}-${teammateType ?? "motivator"}`;
  const profile = profileMap[key] ?? "THE COMPETITOR";

  const taglines: Record<string, string> = {
    "THE CAPTAIN": "You lead from the front. Your team follows.",
    "THE TACTICIAN": "You see three moves ahead. Every time.",
    "THE DISRUPTOR": "You change the game before anyone realises it.",
    "THE CLOSER": "You show up when it matters most.",
    "THE HYPE MACHINE": "You make everyone believe they can win.",
    "THE BACKBONE": "You hold it together when others fall apart.",
    "THE PLANNER": "You've already mapped the route to victory.",
    "THE X-FACTOR": "Nobody sees you coming. That's the point.",
    "THE DARK HORSE": "Underestimated. Undefeated.",
    "THE CATALYST": "You spark something in everyone around you.",
    "THE CHEERLEADER": "Your energy is the team's fuel.",
    "THE ANALYST": "You know exactly what went wrong. And how to fix it.",
    "THE ENTERTAINER": "Win or lose, you make it a show.",
    "THE SLEEPER": "Quiet until it counts. Then unstoppable.",
    "THE GOOD VIBES": "You make Sports Day worth showing up for.",
    "THE COMPETITOR": "You're built for this. Simple as that.",
  };

  return { profile, tagline: taglines[profile] ?? "You're built for this." };
}

describe("generateProfile", () => {
  it("returns THE CAPTAIN for winner + motivator", () => {
    const { profile } = generateProfile({ competitiveness: "winner", teammateType: "motivator" });
    expect(profile).toBe("THE CAPTAIN");
  });

  it("returns THE TACTICIAN for winner + strategist", () => {
    const { profile } = generateProfile({ competitiveness: "winner", teammateType: "strategist" });
    expect(profile).toBe("THE TACTICIAN");
  });

  it("falls back to THE BACKBONE for null+null (balanced+motivator defaults)", () => {
    const { profile } = generateProfile({ competitiveness: null, teammateType: null });
    // null defaults to 'balanced' + 'motivator' = THE BACKBONE
    expect(profile).toBe("THE BACKBONE");
  });

  it("falls back to THE COMPETITOR for truly unknown combo", () => {
    const { profile } = generateProfile({ competitiveness: "extreme", teammateType: "unknown" });
    expect(profile).toBe("THE COMPETITOR");
  });

  it("always returns a non-empty tagline", () => {
    const combos = [
      { competitiveness: "winner", teammateType: "wildcard" },
      { competitiveness: "vibes", teammateType: "energy_bringer" },
      { competitiveness: "balanced", teammateType: "silent_assassin" },
    ];
    for (const combo of combos) {
      const { tagline } = generateProfile(combo);
      expect(tagline.length).toBeGreaterThan(0);
    }
  });
});

// ─── Referral code generation ─────────────────────────────────────────────────

function generateReferralCode(name: string): string {
  const prefix = name.replace(/\s+/g, "").slice(0, 3).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
}

describe("generateReferralCode", () => {
  it("starts with the first 3 letters of the name", () => {
    const code = generateReferralCode("Jordan Smith");
    expect(code.startsWith("JOR")).toBe(true);
  });

  it("is at least 7 characters long", () => {
    const code = generateReferralCode("Ali");
    expect(code.length).toBeGreaterThanOrEqual(7);
  });

  it("is uppercase", () => {
    const code = generateReferralCode("test user");
    expect(code).toBe(code.toUpperCase());
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferralCode("Sam")));
    expect(codes.size).toBeGreaterThan(90);
  });
});

// ─── Klaviyo tag builder ──────────────────────────────────────────────────────

function buildKlaviyoTags(input: {
  attendedBefore?: boolean | null;
  comingType?: string | null;
  competitiveness?: string | null;
  teammateType?: string | null;
  date4July?: boolean;
  date11July?: boolean;
  date18July?: boolean;
  dateAny?: boolean;
  contentConsent?: string | null;
}): string[] {
  const tags: string[] = ["sd002-registered"];
  if (input.attendedBefore) tags.push("sd002-returning");
  else tags.push("sd002-new");
  if (input.comingType === "with_friends") tags.push("sd002-group");
  else tags.push("sd002-solo");
  if (input.competitiveness) tags.push(`sd002-${input.competitiveness}`);
  if (input.teammateType) tags.push(`sd002-${input.teammateType}`);
  if (input.date4July) tags.push("sd002-date-4jul");
  if (input.date11July) tags.push("sd002-date-11jul");
  if (input.date18July) tags.push("sd002-date-18jul");
  if (input.dateAny) tags.push("sd002-date-any");
  if (input.contentConsent === "yes") tags.push("sd002-content-ok");
  return tags;
}

describe("buildKlaviyoTags", () => {
  it("always includes the base registration tag", () => {
    const tags = buildKlaviyoTags({});
    expect(tags).toContain("sd002-registered");
  });

  it("adds returning tag for repeat attendees", () => {
    const tags = buildKlaviyoTags({ attendedBefore: true });
    expect(tags).toContain("sd002-returning");
    expect(tags).not.toContain("sd002-new");
  });

  it("adds new tag for first-timers", () => {
    const tags = buildKlaviyoTags({ attendedBefore: false });
    expect(tags).toContain("sd002-new");
  });

  it("adds date tags correctly", () => {
    const tags = buildKlaviyoTags({ date4July: true, date18July: true });
    expect(tags).toContain("sd002-date-4jul");
    expect(tags).toContain("sd002-date-18jul");
    expect(tags).not.toContain("sd002-date-11jul");
  });

  it("adds content consent tag when yes", () => {
    const tags = buildKlaviyoTags({ contentConsent: "yes" });
    expect(tags).toContain("sd002-content-ok");
  });

  it("does not add content tag when no or ask", () => {
    const tags = buildKlaviyoTags({ contentConsent: "no" });
    expect(tags).not.toContain("sd002-content-ok");
  });
});
