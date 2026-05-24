import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  hasSeenUnlockReveal,
  markUnlockRevealSeen,
  getNextRevealRoute,
} from "@/lib/revealJourney";

// ── Team colour palette (mirrors TeamHub) ──────────────────────────────────
const TEAM_COLORS: Record<string, { hex: string; name: string; glow: string; rgb: string }> = {
  red:    { hex: "#B80000", name: "TEAM RED",    glow: "rgba(184,0,0,0.6)",    rgb: "184,0,0" },
  blue:   { hex: "#1A4FE8", name: "TEAM BLUE",   glow: "rgba(26,79,232,0.6)",  rgb: "26,79,232" },
  pink:   { hex: "#F72B8C", name: "TEAM PINK",   glow: "rgba(247,43,140,0.6)", rgb: "247,43,140" },
  orange: { hex: "#FF6B00", name: "TEAM ORANGE", glow: "rgba(255,107,0,0.6)",  rgb: "255,107,0" },
};

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";
// ── Animation phases ───────────────────────────────────────────────────────
// 0: black screen
// 1: team colour flash
// 2: "YOUR PLAYER PACK IS UNLOCKED" text
// 3: blurred card becomes visible + team name
// 4: player name / top name
// 5: priority copy + CTA
type Phase = 0 | 1 | 2 | 3 | 4 | 5;

export default function UnlockReveal() {
  const [, navigate] = useLocation();
  const [userId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("sd_user_id") : null)
  );

  const { data: dashboard, isLoading } = trpc.sportsday.getSportsDayDashboard.useQuery(
    { registrationId: userId! },
    { enabled: !!userId, retry: false }
  );

  const [phase, setPhase] = useState<Phase>(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const hasStarted = useRef(false);

  // ── Guard: if not unlocked, redirect appropriately ─────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!dashboard) return;
    // Once animation has started, do not re-evaluate guards — prevents infinite loops
    if (hasStarted.current) return;
    const regId = userId ?? "";

    // If already seen unlock reveal, continue journey from where they left off
    if (hasSeenUnlockReveal(regId)) {
      navigate(getNextRevealRoute(regId), { replace: true });
      return;
    }

    // If not yet unlocked, send back to holding
    if (dashboard.state !== "UNLOCKED_PRIORITY" && dashboard.state !== "PUBLIC_REVEAL") {
      navigate("/holding", { replace: true });
      return;
    }

    // Start animation sequence (only once)
    hasStarted.current = true;
    startSequence();
  }, [dashboard, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  function startSequence() {
    // Phase 0 → 1: team colour flash (300ms)
    setTimeout(() => setPhase(1), 300);
    // Phase 1 → 2: text appears (1000ms)
    setTimeout(() => setPhase(2), 1000);
    // Phase 2 → 3: card reveal (2000ms)
    setTimeout(() => setPhase(3), 2000);
    // Phase 3 → 4: player name (2800ms)
    setTimeout(() => setPhase(4), 2800);
    // Phase 4 → 5: priority copy (3600ms)
    setTimeout(() => setPhase(5), 3600);
    // CTA appears (4000ms)
    setTimeout(() => setCtaVisible(true), 4000);
  }

  function handleEnterHub() {
    const regId = userId ?? "";
    // Mark unlock reveal as seen, then proceed to team reveal
    markUnlockRevealSeen(regId);
    navigate("/reveal", { replace: true });
  }

  const team = dashboard?.team ?? null;
  const tc = team ? (TEAM_COLORS[team] ?? TEAM_COLORS.orange) : null;
  const playerName = dashboard?.playerName ?? "";
  const topName = dashboard?.topName ?? playerName.split(" ")[0] ?? "";

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{
        background: phase >= 1 && tc
          ? `radial-gradient(ellipse at center, rgba(${tc.rgb},0.25) 0%, #000 70%)`
          : "#000",
        transition: "background 1.2s ease",
      }}
    >
      {/* ── Full-screen team colour flash overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: tc ? tc.hex : "transparent",
          opacity: phase === 1 ? 0.18 : 0,
          transition: "opacity 0.6s ease",
        }}
      />

      {/* ── Radial glow pulse ── */}
      {tc && phase >= 1 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${tc.glow} 0%, transparent 70%)`,
            opacity: phase >= 3 ? 0.7 : 0.3,
            transition: "opacity 1.5s ease",
          }}
        />
      )}

      {/* ── Logo ── */}
      <div
        className="absolute top-6 left-1/2 -translate-x-1/2"
        style={{
          opacity: phase >= 2 ? 1 : 0,
          transform: `translateX(-50%) translateY(${phase >= 2 ? 0 : -10}px)`,
          transition: "opacity 0.8s ease, transform 0.8s ease",
        }}
      >
        <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" />
      </div>

      {/* ── Main content ── */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-sm w-full">

        {/* Phase 2+: Main headline */}
        <div
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: `translateY(${phase >= 2 ? 0 : 20}px)`,
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <p className="font-mono text-[#F2F0EB]/50 text-xs tracking-[0.3em] mb-2">
            SPORTS DAY 002
          </p>
          <h1 className="font-mono font-bold text-[#F2F0EB] text-2xl tracking-[0.15em] leading-tight">
            YOUR PLAYER PACK<br />IS UNLOCKED.
          </h1>
        </div>

        {/* Phase 3+: Blurred team card becoming visible */}
        {tc && (
          <div
            className="w-full border rounded-sm overflow-hidden"
            style={{
              borderColor: tc.hex,
              boxShadow: phase >= 3 ? `0 0 40px ${tc.glow}, 0 0 80px ${tc.glow}` : "none",
              opacity: phase >= 3 ? 1 : 0,
              filter: phase >= 3 ? "blur(0px)" : "blur(12px)",
              transform: `scale(${phase >= 3 ? 1 : 0.95})`,
              transition: "opacity 1s ease, filter 1s ease, transform 1s ease, box-shadow 1s ease",
            }}
          >
            <div
              className="p-5 text-center"
              style={{ background: `linear-gradient(135deg, rgba(${tc.rgb},0.15) 0%, rgba(0,0,0,0.8) 100%)` }}
            >
              {/* Team name */}
              <p
                className="font-mono font-bold text-xl tracking-[0.3em] mb-1"
                style={{ color: tc.hex }}
              >
                {tc.name}
              </p>
              <div
                className="h-[1px] w-16 mx-auto mb-3"
                style={{ background: tc.hex }}
              />

              {/* Player name — phase 4+ */}
              <div
                style={{
                  opacity: phase >= 4 ? 1 : 0,
                  transform: `translateY(${phase >= 4 ? 0 : 8}px)`,
                  transition: "opacity 0.8s ease 0.2s, transform 0.8s ease 0.2s",
                }}
              >
                <p className="font-mono text-[#F2F0EB]/50 text-[10px] tracking-[0.25em] mb-1">
                  PLAYER
                </p>
                <p className="font-mono font-bold text-[#F2F0EB] text-lg tracking-[0.2em]">
                  {playerName.toUpperCase()}
                </p>
                {topName && topName.toUpperCase() !== playerName.toUpperCase() && (
                  <>
                    <p className="font-mono text-[#F2F0EB]/50 text-[10px] tracking-[0.25em] mt-2 mb-1">
                      TOP NAME
                    </p>
                    <p
                      className="font-mono font-bold text-base tracking-[0.25em]"
                      style={{ color: tc.hex }}
                    >
                      {topName.toUpperCase()}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Phase 5+: Priority copy */}
        <div
          className="flex flex-col gap-1"
          style={{
            opacity: phase >= 5 ? 1 : 0,
            transform: `translateY(${phase >= 5 ? 0 : 10}px)`,
            transition: "opacity 0.8s ease, transform 0.8s ease",
          }}
        >
          <p className="font-mono text-[#F2F0EB] text-sm tracking-[0.2em]">
            YOUR TEAM IS LIVE.
          </p>
          <p className="font-mono text-[#F2F0EB]/50 text-xs tracking-[0.15em]">
            Welcome to Sports Day 002.
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
              <span className="font-mono text-[#F2F0EB]/60 text-[10px] tracking-[0.2em]">PRIORITY ACCESS CONFIRMED</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
              <span className="font-mono text-[#F2F0EB]/60 text-[10px] tracking-[0.2em]">FIRST INTO THE DASHBOARD</span>
            </div>
          </div>
        </div>

        {/* CTA button — appears after animation */}
        <div
          style={{
            opacity: ctaVisible ? 1 : 0,
            transform: `translateY(${ctaVisible ? 0 : 12}px)`,
            transition: "opacity 0.6s ease, transform 0.6s ease",
            pointerEvents: ctaVisible ? "auto" : "none",
          }}
        >
          <button
            onClick={handleEnterHub}
            className="font-mono font-bold text-sm tracking-[0.25em] px-8 py-3 border transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              borderColor: tc?.hex ?? "#FF5500",
              color: "#F2F0EB",
              background: tc ? `rgba(${tc.rgb},0.15)` : "rgba(255,85,0,0.15)",
              boxShadow: tc ? `0 0 20px ${tc.glow}` : "0 0 20px rgba(255,85,0,0.3)",
            }}
          >
            ENTER TEAM REVEAL →
          </button>
        </div>

        {/* Skip link — always visible after phase 2 so user is never trapped */}
        {phase >= 2 && (
          <button
            onClick={() => navigate("/reveal", { replace: true })}
            className="font-mono text-[#F2F0EB]/20 text-[10px] tracking-[0.2em] hover:text-[#F2F0EB]/50 transition-colors mt-2"
          >
            SKIP
          </button>
        )}
      </div>

      {/* ── Scan-line texture overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          opacity: 0.6,
        }}
      />
    </div>
  );
}
