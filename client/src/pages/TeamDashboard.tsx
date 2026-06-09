/**
 * TeamDashboard — /team-dashboard
 *
 * Clean, mobile-first landing screen shown immediately after the reveal journey.
 * Sits between /shirt-confirm (paid) or /reveal (free) and the full /team-hub.
 *
 * Shows:
 *   1. Team name in team colour
 *   2. Team identity line
 *   3. Captain name (first captain candidate by captainVoteInterest)
 *   4. Teammates count + list (first names only)
 *   5. Event details: July 11th, Sheffield
 *   6. Single CTA: "ENTER YOUR TEAM HUB →"
 */

import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const TEAM_COLOURS: Record<string, { hex: string; glow: string; label: string; identity: string }> = {
  red:    { hex: "#B80000", glow: "rgba(184,0,0,0.35)",    label: "RED",    identity: "THE COMPETITORS" },
  blue:   { hex: "#1A4FE8", glow: "rgba(26,79,232,0.35)",  label: "BLUE",   identity: "THE STRATEGISTS" },
  pink:   { hex: "#F72B8C", glow: "rgba(247,43,140,0.35)", label: "PINK",   identity: "THE ENERGY" },
  orange: { hex: "#FF6B00", glow: "rgba(255,107,0,0.35)",  label: "ORANGE", identity: "THE WILDCARDS" },
};

export default function TeamDashboard() {
  const [, navigate] = useLocation();
  const [userId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("sd_user_id") : null)
  );
  const [revealed, setRevealed] = useState(false);

  const { data: hub, isLoading, error } = trpc.sportsday.getTeamHub.useQuery(
    { registrationId: userId! },
    { enabled: !!userId, retry: false }
  );

  // Guard: redirect unpaid/locked users back to holding
  useEffect(() => {
    if (!userId) {
      navigate("/holding", { replace: true });
      return;
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Staggered entrance animation
  useEffect(() => {
    if (hub) {
      const t = setTimeout(() => setRevealed(true), 100);
      return () => clearTimeout(t);
    }
  }, [hub]);

  if (isLoading || !hub) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-mono text-white/40 text-sm tracking-widest text-center">
          UNABLE TO LOAD YOUR TEAM
        </p>
        <button
          onClick={() => navigate("/holding")}
          className="font-mono text-white/60 text-xs tracking-widest underline"
        >
          BACK TO HOLDING PAGE
        </button>
      </div>
    );
  }

  const team = hub.team ?? "red";
  const tc = TEAM_COLOURS[team] ?? TEAM_COLOURS.red;

  // Captain: first member with captainVoteInterest === "yes", else first member
  const captain = hub.members.find((m) => m.captainVoteInterest === "yes") ?? hub.members[0] ?? null;

  // My own record
  const me = hub.members.find((m) => m.id === userId);

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col"
      style={{ fontFamily: "'DM Mono', monospace" }}
    >
      {/* ── Top nav ── */}
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => navigate("/holding")}
          className="text-white/30 text-xs tracking-widest hover:text-white/60 transition-colors"
        >
          ← BACK
        </button>
        <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
        <div className="w-16" />
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col px-5 pb-10 max-w-lg mx-auto w-full">

        {/* ── 1. Team name ── */}
        <div
          className="mt-8 transition-all duration-700"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <p className="text-white/30 text-xs tracking-[0.3em] mb-2">YOUR TEAM</p>
          <h1
            className="text-7xl font-black tracking-widest leading-none"
            style={{
              color: tc.hex,
              textShadow: `0 0 60px ${tc.glow}`,
              fontFamily: "'Bebas Neue', sans-serif",
            }}
          >
            {tc.label}
          </h1>
        </div>

        {/* ── 2. Team identity ── */}
        <div
          className="mt-3 transition-all duration-700 delay-100"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(16px)",
          }}
        >
          <p
            className="text-sm tracking-[0.25em] font-semibold"
            style={{ color: tc.hex }}
          >
            {tc.identity}
          </p>
        </div>

        {/* ── Divider ── */}
        <div
          className="mt-8 mb-8 h-px transition-all duration-700 delay-150"
          style={{
            background: `linear-gradient(90deg, ${tc.hex}60, transparent)`,
            opacity: revealed ? 1 : 0,
          }}
        />

        {/* ── 3. Captain ── */}
        {captain && (
          <div
            className="mb-6 transition-all duration-700 delay-200"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(12px)",
            }}
          >
            <p className="text-white/30 text-[10px] tracking-[0.3em] mb-3">CAPTAIN CANDIDATE</p>
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border-2"
                style={{ borderColor: tc.hex, boxShadow: `0 0 20px ${tc.glow}` }}
              >
                {captain.photoUrl ? (
                  <img src={captain.photoUrl} alt={captain.fullName ?? ""} className="w-full h-full object-cover" />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-xl font-black"
                    style={{ background: `${tc.hex}20`, color: tc.hex }}
                  >
                    {(captain.fullName ?? "?")[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="text-white font-bold text-lg tracking-wider leading-tight">
                  {captain.fullName}
                </p>
                {captain.profileTagline && (
                  <p className="text-white/40 text-xs mt-0.5 italic">"{captain.profileTagline}"</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 4. Teammates ── */}
        <div
          className="mb-8 transition-all duration-700 delay-300"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <p className="text-white/30 text-[10px] tracking-[0.3em] mb-3">
            YOUR SQUAD — {hub.totalMembers} {hub.totalMembers === 1 ? "PLAYER" : "PLAYERS"}
          </p>
          <div className="flex flex-wrap gap-2">
            {hub.members.slice(0, 12).map((m) => (
              <div
                key={m.id}
                className="px-3 py-1.5 border text-xs tracking-wider"
                style={{
                  borderColor: m.id === userId ? tc.hex : "rgba(255,255,255,0.12)",
                  background: m.id === userId ? `${tc.hex}15` : "transparent",
                  color: m.id === userId ? tc.hex : "rgba(255,255,255,0.7)",
                }}
              >
                {m.fullName?.split(" ")[0] ?? "?"}
                {m.id === userId && (
                  <span className="ml-1 opacity-60 text-[9px]">YOU</span>
                )}
              </div>
            ))}
            {hub.totalMembers > 12 && (
              <div className="px-3 py-1.5 border border-white/10 text-xs tracking-wider text-white/30">
                +{hub.totalMembers - 12} MORE
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Event details ── */}
        <div
          className="mb-10 border border-white/10 p-5 transition-all duration-700 delay-400"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <p className="text-white/30 text-[10px] tracking-[0.3em] mb-4">THE EVENT</p>
          <div className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-white/20 text-xs tracking-widest w-16 shrink-0">DATE</span>
              <span className="text-white font-bold tracking-wider text-sm">FRIDAY 11 JULY 2026</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-white/20 text-xs tracking-widest w-16 shrink-0">CITY</span>
              <span className="text-white font-bold tracking-wider text-sm">SHEFFIELD</span>
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-white/20 text-xs tracking-widest w-16 shrink-0">FORMAT</span>
              <span className="text-white/70 tracking-wider text-sm">4 TEAMS · 7 EVENTS · 1 WINNER</span>
            </div>
          </div>
        </div>

        {/* ── 6. CTA ── */}
        <div
          className="transition-all duration-700 delay-500"
          style={{
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(12px)",
          }}
        >
          <button
            onClick={() => navigate("/team-hub")}
            className="w-full py-4 text-sm tracking-[0.25em] font-bold border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              borderColor: tc.hex,
              color: "#000",
              background: tc.hex,
              boxShadow: `0 0 30px ${tc.glow}`,
            }}
          >
            ENTER YOUR TEAM HUB →
          </button>

          {me?.profileTagline && (
            <p className="text-white/20 text-xs text-center mt-4 tracking-wider italic">
              "{me.profileTagline}"
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
