import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  hasSeenUnlockReveal,
  markUnlockRevealSeen,
  getNextRevealRoute,
} from "@/lib/revealJourney";

// ── Team colour palette (mirrors TeamHub) ──────────────────────────────────
const TEAM_COLORS: Record<string, { hex: string; name: string; glow: string; rgb: string; confettiColors: string[] }> = {
  red:    { hex: "#B80000", name: "TEAM RED",    glow: "rgba(184,0,0,0.6)",    rgb: "184,0,0",     confettiColors: ["#E8232A", "#FFFFFF", "#FF6666", "#CC0000"] },
  blue:   { hex: "#1A4FE8", name: "TEAM BLUE",   glow: "rgba(26,79,232,0.6)",  rgb: "26,79,232",   confettiColors: ["#1A4FE8", "#C0C0C0", "#6699FF", "#0033CC"] },
  pink:   { hex: "#F72B8C", name: "TEAM PINK",   glow: "rgba(247,43,140,0.6)", rgb: "247,43,140",  confettiColors: ["#F72B8C", "#FFD700", "#FF99CC", "#CC0066"] },
  orange: { hex: "#FF6B00", name: "TEAM ORANGE", glow: "rgba(255,107,0,0.6)",  rgb: "255,107,0",   confettiColors: ["#FF6B00", "#0A0A0A", "#FFAA44", "#CC5500"] },
};

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

// ── Team shirt images ─────────────────────────────────────────────────────
const TEAM_SHIRT_URLS: Record<string, string> = {
  red:    "/manus-storage/sportsday002-red-front-transparent_e8d4b455.png",
  blue:   "/manus-storage/sportsday002-blue-front-transparent_25cf7b1a.png",
  pink:   "/manus-storage/sportsday002-pink-front-transparent_1062bfd0.png",
  orange: "/manus-storage/sportsday002-orange-front-transparent_44d55917.png",
};

// ── Animation phases ───────────────────────────────────────────────────────
// 0: black screen
// 1: team colour flash
// 2: "YOUR TEAM IS UNLOCKED" text
// 3: blurred card becomes visible + team name
// 4: player name
// 5: team shirt reveal + "Your colour is locked in"
// 6: priority copy + CTA
type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// ── Confetti hook (matches Reveal.tsx pattern) ─────────────────────────────
function useConfetti(active: boolean, colors: string[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const makeParticle = (startY?: number) => ({
      x: Math.random() * canvas.width,
      y: startY ?? Math.random() * -canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 4 + 1.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 12 + 5,
      h: Math.random() * 6 + 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 10,
    });
    const particles = Array.from({ length: 200 }, () => makeParticle());
    const GRAVITY = 0.05;
    const MAX_VY = 9;
    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.vy = Math.min(p.vy + GRAVITY, MAX_VY);
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        if (p.y > canvas.height + 30) {
          const fresh = makeParticle(-20);
          p.x = fresh.x; p.y = fresh.y;
          p.vx = fresh.vx; p.vy = fresh.vy;
          p.rot = fresh.rot; p.rotV = fresh.rotV;
        }
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("resize", resize); };
  }, [active, colors]); // eslint-disable-line react-hooks/exhaustive-deps
  return canvasRef;
}

// ── Red: scanline + static noise ──────────────────────────────────────────
function RedBackground({ phase }: { phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (phase < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    let scanOffset = 0;
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) {
        const nx = Math.random() * w;
        const ny = Math.random() * h;
        const alpha = Math.random() * 0.18;
        ctx.fillStyle = `rgba(232,35,42,${alpha})`;
        ctx.fillRect(nx, ny, 1, Math.random() > 0.7 ? 2 : 1);
      }
      scanOffset = (scanOffset + 0.8) % 4;
      ctx.strokeStyle = "rgba(232,35,42,0.06)";
      ctx.lineWidth = 1;
      for (let y = scanOffset; y < h; y += 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [phase]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

// ── Blue: grid pulse + data stream ────────────────────────────────────────
function BlueBackground({ phase }: { phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (phase < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const GRID = 40;
    let gridOffset = 0;
    let frameCount = 0;
    let flashRow = -1;
    let flashTimer = 0;
    const streams = Array.from({ length: 20 }, () => ({
      x: Math.floor(Math.random() * 20) * (canvas.width / 20),
      y: Math.random() * canvas.height,
      speed: 2 + Math.random() * 2,
    }));
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      frameCount++;
      gridOffset = (gridOffset + 0.4) % GRID;
      ctx.strokeStyle = "rgba(26,79,232,0.12)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += GRID) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = gridOffset; y < h; y += GRID) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
      if (frameCount % 90 === 0) { flashRow = Math.floor(Math.random() * Math.ceil(h / GRID)) * GRID; flashTimer = 3; }
      if (flashTimer > 0) {
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(0, flashRow, w, 1);
        flashTimer--;
      }
      for (const s of streams) {
        s.y += s.speed;
        if (s.y > h + 20) { s.y = -20; s.x = Math.floor(Math.random() * 20) * (w / 20); }
        ctx.fillStyle = "rgba(26,79,232,0.7)";
        ctx.fillRect(s.x, s.y, 2, 6);
        ctx.fillStyle = "rgba(26,79,232,0.2)";
        ctx.fillRect(s.x, s.y - 8, 2, 8);
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [phase]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

// ── Pink: floating hearts + sparkles ─────────────────────────────────────
function PinkBackground({ phase }: { phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (phase < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const hearts = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas.width,
      y: canvas.height + Math.random() * canvas.height,
      speed: 1 + Math.random() * 2,
      size: 14 + Math.random() * 10,
      alpha: 0.3 + Math.random() * 0.4,
    }));
    const sparkles = Array.from({ length: 30 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 1.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    }));
    let t = 0;
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      t += 0.04;
      for (const heart of hearts) {
        heart.y -= heart.speed;
        if (heart.y < -heart.size) { heart.y = h + heart.size; heart.x = Math.random() * w; }
        ctx.save();
        ctx.globalAlpha = heart.alpha;
        ctx.fillStyle = "#F72B8C";
        ctx.font = `${heart.size}px serif`;
        ctx.textAlign = "center";
        ctx.fillText("♥", heart.x, heart.y);
        ctx.restore();
      }
      for (const sp of sparkles) {
        const alpha = 0.15 + Math.abs(Math.sin(t + sp.phase)) * 0.3;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = Math.sin(t + sp.phase) > 0 ? "#F72B8C" : "#FFFFFF";
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [phase]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

// ── Orange: chaotic particle burst ───────────────────────────────────────
function OrangeBackground({ phase }: { phase: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    if (phase < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const ORANGE_COLORS = ["#FF6B00", "#FFAA44", "#CC5500", "#FF8C00"];
    const makeParticle = () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      const life = Math.floor(60 + Math.random() * 80);
      return {
        x: canvas.width / 2, y: canvas.height / 2,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: ORANGE_COLORS[Math.floor(Math.random() * ORANGE_COLORS.length)],
        life,
        maxLife: life,
      };
    };
    const particles = Array.from({ length: 60 }, makeParticle);
    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.life--;
        if (p.life <= 0) { Object.assign(p, makeParticle()); }
        p.vx += (Math.random() - 0.5) * 0.3;
        p.vy += (Math.random() - 0.5) * 0.3;
        p.x += p.vx; p.y += p.vy;
        const alpha = (p.life / p.maxLife) * 0.6;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [phase]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

export default function UnlockReveal() {
  const [, navigate] = useLocation();
  const [userIdFromStorage] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("sd_user_id") : null)
  );

  const { data: dashboard, isLoading } = trpc.sportsday.getSportsDayDashboard.useQuery(
    { registrationId: userIdFromStorage! },
    { enabled: !!userIdFromStorage, retry: false }
  );

  // Use the dashboard's registration ID (source of truth) instead of localStorage
  const userId = dashboard?.registrationId ?? userIdFromStorage;

  // Derive team/tc early so hooks below can use them
  const team = dashboard?.team ?? null;
  const tc = team ? (TEAM_COLORS[team] ?? TEAM_COLORS.orange) : null;

  const [phase, setPhase] = useState<Phase>(0);
  const [ctaVisible, setCtaVisible] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const hasStarted = useRef(false);

  const confettiRef = useConfetti(confettiActive, tc?.confettiColors ?? []);

  // ── Guard: if not unlocked, redirect appropriately ─────────────────────
  useEffect(() => {
    if (isLoading) return;
    if (!dashboard) return;
    // Once animation has started, do not re-evaluate guards — prevents infinite loops
    if (hasStarted.current) return;
    const regId = userId ?? "";

    // PAID-ONLY PAGE: Free users (PUBLIC_REVEAL) should never see the unlock animation
    // Redirect free users to team-hub directly
    if (dashboard.state === "PUBLIC_REVEAL" || dashboard.accessType !== "priority") {
      // Only allow if user is UNLOCKED_PRIORITY (paid)
      if (dashboard.state !== "UNLOCKED_PRIORITY") {
        navigate("/holding", { replace: true });
        return;
      }
    }

    // If already seen unlock reveal, go straight to team-hub
    const dashboardRegId = dashboard?.registrationId ?? regId;
    if (hasSeenUnlockReveal(dashboardRegId)) {
      navigate("/team-hub", { replace: true });
      return;
    }

    // If not paid/priority, redirect to team-hub (free users who somehow landed here)
    if (dashboard.accessType !== "priority") {
      navigate("/team-hub", { replace: true });
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
    // Phase 2 → 3: card reveal + confetti (2000ms)
    setTimeout(() => { setPhase(3); setConfettiActive(true); }, 2000);
    // Phase 3 → 4: player name (2800ms)
    setTimeout(() => setPhase(4), 2800);
    // Phase 4 → 5: team shirt reveal (3800ms)
    setTimeout(() => setPhase(5), 3800);
    // Phase 5 → 6: priority copy (5000ms)
    setTimeout(() => setPhase(6), 5000);
    // CTA appears (5400ms)
    setTimeout(() => setCtaVisible(true), 5400);
  }

  function handleEnterHub() {
    // Use dashboard registration ID as source of truth
    const regId = dashboard?.registrationId ?? userId ?? "";
    // Mark unlock reveal as seen, then go straight to team hub
    markUnlockRevealSeen(regId);
    navigate("/team-hub", { replace: true });
  }

  const playerName = dashboard?.playerName ?? "";
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
      {/* ── Team-specific animated background canvas ── */}
      {team === "red"    && <RedBackground phase={phase} />}
      {team === "blue"   && <BlueBackground phase={phase} />}
      {team === "pink"   && <PinkBackground phase={phase} />}
      {team === "orange" && <OrangeBackground phase={phase} />}

      {/* ── Team-coloured confetti — fires at phase 3 (card reveal) ── */}
      <canvas ref={confettiRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }} />

      {/* ── Full-screen team colour flash overlay ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: tc ? tc.hex : "transparent",
          opacity: phase === 1 ? 0.18 : 0,
          transition: "opacity 0.6s ease",
          zIndex: 1,
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
            zIndex: 1,
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
          zIndex: 10,
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
            YOUR TEAM<br />IS UNLOCKED.
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

              </div>
            </div>
          </div>
        )}

        {/* Phase 5+: Team shirt reveal */}
        {tc && team && TEAM_SHIRT_URLS[team] && (
          <div
            style={{
              opacity: phase >= 5 ? 1 : 0,
              transform: `translateY(${phase >= 5 ? 0 : 20}px) scale(${phase >= 5 ? 1 : 0.92})`,
              transition: "opacity 0.9s ease, transform 0.9s ease",
            }}
            className="flex flex-col items-center gap-3 w-full"
          >
            <p className="font-mono text-[#F2F0EB]/50 text-[10px] tracking-[0.3em]">
              YOUR TEAM-COLOUR KIT
            </p>
            <div
              className="relative w-48 h-48 rounded-sm overflow-hidden"
              style={{
                boxShadow: `0 0 30px ${tc.glow}, 0 0 60px ${tc.glow}`,
                border: `1px solid ${tc.hex}`,
              }}
            >
              <img
                src={TEAM_SHIRT_URLS[team]}
                alt={`${tc.name} team shirt`}
                className="w-full h-full object-contain bg-black"
              />
            </div>
            <p
              className="font-mono font-bold text-sm tracking-[0.2em]"
              style={{ color: tc.hex }}
            >
              YOUR COLOUR IS LOCKED IN.
            </p>
            <p className="font-mono text-[#F2F0EB]/40 text-[10px] tracking-[0.15em] text-center">
              Pre-made team kit · Ready for Sports Day.
            </p>
          </div>
        )}

        {/* Phase 6+: Priority copy */}
        <div
          className="flex flex-col gap-1"
          style={{
            opacity: phase >= 6 ? 1 : 0,
            transform: `translateY(${phase >= 6 ? 0 : 10}px)`,
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
            onClick={() => {
              const regId = userId ?? "";
              markUnlockRevealSeen(regId);
              navigate("/team-hub", { replace: true });
            }}
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
          zIndex: 2,
        }}
      />
    </div>
  );
}
