/**
 * useTips — inline onboarding tip system for the Team Hub
 *
 * Tips are stored in localStorage as a JSON array of dismissed tip IDs.
 * Each tip is shown once; "Got it" dismisses it permanently.
 * "Hide all tips" dismisses every tip at once.
 *
 * localStorage key: sportsday_seen_tips
 */

import { useState, useCallback } from "react";

// ─── Tip definitions ──────────────────────────────────────────────────────────

export interface Tip {
  id: string;
  label: string;   // small monospace category label
  body: string;    // main tip copy
}

export const TIPS: Tip[] = [
  {
    id: "team-hub-intro",
    label: "TEAM HUB",
    body: "This is your Team Hub — squad info, events, points and updates live here.",
  },
  {
    id: "team-shirt",
    label: "YOUR COLOUR",
    body: "Your colour is locked. Wear your team shirt on Sports Day.",
  },
  {
    id: "ai-intel",
    label: "AI INTEL",
    body: "Tap any event card to see your squad's AI-generated strategy for that event.",
  },
  {
    id: "events",
    label: "EVENTS",
    body: "Events shows what's coming up, who's competing, and what's live.",
  },
  {
    id: "power-ups",
    label: "POWER UPS",
    body: "Power Ups are captain-led moves that can shift the points battle.",
  },
  {
    id: "power-up-voting",
    label: "VOTING",
    body: "Tap a Power Up to cast your vote. Your captain activates the chosen move on the day.",
  },
  {
    id: "leaderboard",
    label: "LEADERBOARD",
    body: "Track the battle as results come in.",
  },
  {
    id: "leaderboard-live",
    label: "LIVE UPDATES",
    body: "Points update live as events finish. Check back during Sports Day.",
  },
  {
    id: "share-reveal",
    label: "SHARE",
    body: "Share your reveal card and let everyone know your team.",
  },
  {
    id: "location",
    label: "LOCATION",
    body: "Use this card for directions to Endcliffe Park.",
  },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "sportsday_seen_tips";

function getSeenTips(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set<string>(parsed);
  } catch {
    // ignore parse errors
  }
  return new Set();
}

function saveSeenTips(seen: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen)));
  } catch {
    // ignore storage errors
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTips() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => getSeenTips());

  const isSeen = useCallback(
    (id: string) => dismissed.has(id),
    [dismissed]
  );

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveSeenTips(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const all = new Set(TIPS.map((t) => t.id));
    saveSeenTips(all);
    setDismissed(all);
  }, []);

  const hasAnyVisible = TIPS.some((t) => !dismissed.has(t.id));

  return { isSeen, dismiss, dismissAll, hasAnyVisible };
}
