import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const TEAM_CONFIG = {
  red: {
    color: "#E8232A",
    name: "TEAM RED",
    identity: "THE COMPETITORS",
    confettiColors: ["#E8232A", "#FFFFFF", "#FF6666", "#CC0000"],
  },
  blue: {
    color: "#1A4FE8",
    name: "TEAM BLUE",
    identity: "THE STRATEGISTS",
    confettiColors: ["#1A4FE8", "#C0C0C0", "#6699FF", "#0033CC"],
  },
  pink: {
    color: "#F72B8C",
    name: "TEAM PINK",
    identity: "THE ENERGY",
    confettiColors: ["#F72B8C", "#FFD700", "#FF99CC", "#CC0066"],
  },
  orange: {
    color: "#FF6B00",
    name: "TEAM ORANGE",
    identity: "THE WILDCARDS",
    confettiColors: ["#FF6B00", "#0A0A0A", "#FFAA44", "#CC5500"],
  },
};

type Team = keyof typeof TEAM_CONFIG;

// ─── Confetti ─────────────────────────────────────────────────────────────────

function useConfetti(active: boolean, colors: string[]) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 14 + 4,
      h: Math.random() * 7 + 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 10,
    }));

    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rot * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;
        if (p.y > canvas.height) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [active, colors]);

  return canvasRef;
}

// ─── Roulette Wheel (Red) — deterministically lands on RED ───────────────────

function RouletteAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 300;

    const cx = 150, cy = 150, r = 130;
    // Segments in order — RED is segment 0 (top of wheel at angle 0)
    const segments = [
      { color: "#E8232A", label: "RED" },
      { color: "#1A4FE8", label: "BLUE" },
      { color: "#F72B8C", label: "PINK" },
      { color: "#FF6B00", label: "ORANGE" },
    ];

    // We want RED at the top (pointer at top). Segment 0 starts at -π/2 (top).
    // Target: after spinning, segment 0 (RED) is at top.
    // Each segment = π/2 radians. RED at top means angle offset = 0 (or 2πN).
    // We spin 8 full rotations + land at 0 offset.
    const totalSpins = 8;
    const targetAngle = totalSpins * Math.PI * 2; // lands exactly at start = RED at top

    let angle = 0;
    let frame: number;
    let startTime: number | null = null;
    const duration = 3500; // ms

    // Ease-out cubic
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      angle = easeOut(progress) * targetAngle;

      ctx.clearRect(0, 0, 300, 300);

      segments.forEach((seg, i) => {
        const startA = angle + (i * Math.PI * 2) / 4 - Math.PI / 2;
        const endA = startA + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startA, endA);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.strokeStyle = "#0A0A0A";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startA + Math.PI / 4);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(seg.label, r * 0.65, 5);
        ctx.restore();
      });

      // Pointer at top
      ctx.beginPath();
      ctx.moveTo(cx, cy - r - 5);
      ctx.lineTo(cx - 12, cy - r + 18);
      ctx.lineTo(cx + 12, cy - r + 18);
      ctx.closePath();
      ctx.fillStyle = "#F2F0EB";
      ctx.fill();

      // Center
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#0A0A0A";
      ctx.fill();
      ctx.strokeStyle = "#FF5500";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (progress < 1) {
        frame = requestAnimationFrame(draw);
      } else {
        setTimeout(onComplete, 600);
      }
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-6">SPINNING YOUR FATE...</p>
      <canvas ref={canvasRef} style={{ width: 280, height: 280 }} />
    </div>
  );
}

// ─── Claw Machine (Blue) ──────────────────────────────────────────────────────

function ClawAnimation({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"descend" | "grab" | "ascend" | "done">("descend");
  const [clawY, setClawY] = useState(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (phase === "descend") {
      setTimeout(() => setClawY(160), 50);
      t = setTimeout(() => setPhase("grab"), 1800);
    } else if (phase === "grab") {
      t = setTimeout(() => setPhase("ascend"), 800);
    } else if (phase === "ascend") {
      setClawY(0);
      t = setTimeout(() => setPhase("done"), 1500);
    } else {
      t = setTimeout(onComplete, 600);
    }
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-6">CLAW MACHINE ACTIVATED...</p>
      <div className="relative w-64 h-72 border border-[#1A4FE8]/30 bg-[#050520] overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#1A1A2E] border-b border-[#1A4FE8]/30" />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-1 bg-[#1A4FE8]/60 transition-all duration-[1500ms] ease-in-out"
          style={{ top: 16, height: clawY + 40 }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 transition-all duration-[1500ms] ease-in-out"
          style={{ top: 16 + clawY }}
        >
          <div className="relative w-12 h-8">
            <div className="absolute left-0 top-0 w-1 h-8 bg-[#1A4FE8] rotate-[-20deg] origin-top" />
            <div className="absolute right-0 top-0 w-1 h-8 bg-[#1A4FE8] rotate-[20deg] origin-top" />
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-1 h-6 bg-[#1A4FE8]" />
          </div>
          {(phase === "grab" || phase === "ascend" || phase === "done") && (
            <div className="absolute left-1/2 -translate-x-1/2 top-6 w-10 h-10 rounded-full bg-[#1A4FE8] flex items-center justify-center shadow-[0_0_20px_#1A4FE8]">
              <span className="font-display text-white text-xs tracking-wider">BLUE</span>
            </div>
          )}
        </div>
        {phase === "descend" && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
            {["#E8232A", "#1A4FE8", "#F72B8C", "#FF6B00"].map((c, i) => (
              <div key={i} className="w-8 h-8 rounded-full" style={{ backgroundColor: c, boxShadow: `0 0 10px ${c}` }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Slot Machine (Pink) — lands on 🩷🩷🩷 ─────────────────────────────────────

function SlotAnimation({ onComplete }: { onComplete: () => void }) {
  const [reels, setReels] = useState(["?", "?", "?"]);
  const [locked, setLocked] = useState([false, false, false]);

  useEffect(() => {
    const colors = ["🔴", "🔵", "🩷", "🟠"];
    let interval: ReturnType<typeof setInterval>;

    interval = setInterval(() => {
      setReels((prev) =>
        prev.map((v, i) => (locked[i] ? v : colors[Math.floor(Math.random() * colors.length)]))
      );
    }, 80);

    const t1 = setTimeout(() => {
      setLocked([true, false, false]);
      setReels(["🩷", "?", "?"]);
    }, 1500);
    const t2 = setTimeout(() => {
      setLocked([true, true, false]);
      setReels(["🩷", "🩷", "?"]);
    }, 2500);
    const t3 = setTimeout(() => {
      clearInterval(interval);
      setLocked([true, true, true]);
      setReels(["🩷", "🩷", "🩷"]);
    }, 3500);
    const t4 = setTimeout(onComplete, 4500);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-6">PULLING THE LEVER...</p>
      <div className="border-2 border-[#F72B8C]/40 bg-[#0D0008] p-6">
        <div className="flex gap-4">
          {reels.map((reel, i) => (
            <div
              key={i}
              className="w-20 h-24 border border-[#F72B8C]/30 bg-[#050005] flex items-center justify-center text-4xl"
              style={{ boxShadow: locked[i] ? "0 0 20px #F72B8C" : "none", transition: "box-shadow 0.3s" }}
            >
              {reel}
            </div>
          ))}
        </div>
        {locked[2] && (
          <div className="mt-4 text-center font-display text-[#F72B8C] text-2xl tracking-widest animate-pulse">
            JACKPOT!
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Chaotic Wheel (Orange) — deterministically lands on ORANGE ───────────────

function ChaoticWheelAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 300;

    const cx = 150, cy = 150, r = 130;
    // ORANGE is segment 0 — same deterministic logic as red wheel
    const segments = [
      { color: "#FF6B00", label: "ORANGE" },
      { color: "#E8232A", label: "RED" },
      { color: "#1A4FE8", label: "BLUE" },
      { color: "#F72B8C", label: "PINK" },
    ];

    // Spin 10 rotations + land at 0 (ORANGE at top)
    const totalSpins = 10;
    const targetAngle = totalSpins * Math.PI * 2;

    let angle = 0;
    let frame: number;
    let startTime: number | null = null;
    const duration = 4000;

    // Chaotic ease: fast start, multiple speed bursts, then settle
    const chaoticEase = (t: number) => {
      if (t < 0.6) {
        // Fast phase with slight wobble
        return t * 1.4 + Math.sin(t * 20) * 0.02;
      }
      // Decelerate with judder
      const decelT = (t - 0.6) / 0.4;
      const base = 0.84 + decelT * 0.16;
      const judder = Math.sin(decelT * 30) * 0.005 * (1 - decelT);
      return Math.min(base + judder, 1);
    };

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      angle = chaoticEase(progress) * targetAngle;

      ctx.clearRect(0, 0, 300, 300);

      segments.forEach((seg, i) => {
        const startA = angle + (i * Math.PI * 2) / 4 - Math.PI / 2;
        const endA = startA + Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, startA, endA);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.strokeStyle = "#0A0A0A";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startA + Math.PI / 4);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(seg.label, r * 0.65, 5);
        ctx.restore();
      });

      // Pointer at top
      ctx.beginPath();
      ctx.moveTo(cx, cy - r - 5);
      ctx.lineTo(cx - 12, cy - r + 18);
      ctx.lineTo(cx + 12, cy - r + 18);
      ctx.closePath();
      ctx.fillStyle = "#F2F0EB";
      ctx.fill();

      // Center
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#0A0A0A";
      ctx.fill();
      ctx.strokeStyle = "#FF6B00";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (progress < 1) {
        frame = requestAnimationFrame(draw);
      } else {
        setTimeout(onComplete, 600);
      }
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-6">CHAOS INCOMING...</p>
      <canvas ref={canvasRef} style={{ width: 280, height: 280 }} />
    </div>
  );
}

// ─── Main Reveal Page ─────────────────────────────────────────────────────────

export default function Reveal() {
  const [, navigate] = useLocation();
  const [userId] = useState(() => localStorage.getItem("sd_user_id"));
  const [phase, setPhase] = useState<"animation" | "reveal">("animation");
  const shareCanvasRef = useRef<HTMLCanvasElement>(null);

  const { data: user } = trpc.sportsday.getUserStatus.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  const team = (user?.team ?? "red") as Team;
  const config = TEAM_CONFIG[team];
  const confettiRef = useConfetti(phase === "reveal", config.confettiColors);

  const handleAnimationComplete = useCallback(() => {
    setPhase("reveal");
  }, []);

  // Generate share card on canvas when reveal phase starts
  useEffect(() => {
    if (phase !== "reveal") return;
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1920;

    // Background — team colour
    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, 1080, 1920);

    // Subtle vertical stripe texture
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let i = 0; i < 1080; i += 40) {
      ctx.fillRect(i, 0, 1, 1920);
    }

    // Dark top bar
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, 1080, 220);

    // Load and draw the real logo
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.onload = () => {
      // Draw logo (white version) in top bar
      ctx.save();
      ctx.filter = "brightness(0) invert(1)";
      const logoH = 120;
      const logoW = (logoImg.width / logoImg.height) * logoH;
      ctx.drawImage(logoImg, (1080 - logoW) / 2, 50, logoW, logoH);
      ctx.restore();

      // Main text
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 160px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("I'M TEAM", 540, 900);

      ctx.font = "bold 220px sans-serif";
      ctx.fillText(team.toUpperCase() + ".", 540, 1140);

      // Subtext
      ctx.font = "bold 70px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("SPORTS DAY 002", 540, 1320);

      // Bottom handle
      ctx.font = "bold 45px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("@6plus1", 540, 1820);
    };
    logoImg.onerror = () => {
      // Fallback text logo
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 140px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("6+1", 540, 160);

      ctx.font = "bold 160px sans-serif";
      ctx.fillText("I'M TEAM", 540, 900);
      ctx.font = "bold 220px sans-serif";
      ctx.fillText(team.toUpperCase() + ".", 540, 1140);
      ctx.font = "bold 70px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("SPORTS DAY 002", 540, 1320);
    };
    logoImg.src = LOGO_URL;
  }, [phase, team, config]);

  const handleShare = async () => {
    const canvas = shareCanvasRef.current;
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const teamLabel = team.charAt(0).toUpperCase() + team.slice(1);
      const file = new File([blob], `team-${team}-sports-day-002.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `I'm Team ${teamLabel} — Sports Day 002`,
            text: "Share to your Instagram Story and tag @6plus1",
            files: [file],
          });
          return;
        } catch {
          // fall through to download
        }
      }
      // Download fallback
      const link = document.createElement("a");
      link.download = `team-${team}-sports-day-002.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    }, "image/png");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FF5500] font-display text-3xl tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (user.revealStatus !== "unlocked") {
    navigate("/holding");
    return null;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-1000"
      style={{ backgroundColor: phase === "reveal" ? config.color : "#0A0A0A" }}
    >
      {/* Confetti */}
      <canvas ref={confettiRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 10 }} />

      {/* Hidden share canvas */}
      <canvas ref={shareCanvasRef} className="hidden" />

      {/* Animation phase */}
      {phase === "animation" && (
        <div className="relative z-20 flex flex-col items-center px-5 w-full max-w-sm">
          <img src={LOGO_URL} alt="6+1" className="h-8 w-auto mb-12" style={{ filter: "invert(1)" }} />
          {team === "red" && <RouletteAnimation onComplete={handleAnimationComplete} />}
          {team === "blue" && <ClawAnimation onComplete={handleAnimationComplete} />}
          {team === "pink" && <SlotAnimation onComplete={handleAnimationComplete} />}
          {team === "orange" && <ChaoticWheelAnimation onComplete={handleAnimationComplete} />}
        </div>
      )}

      {/* Reveal phase */}
      {phase === "reveal" && (
        <div className="relative z-20 flex flex-col items-center px-5 text-center w-full max-w-sm">
          <img
            src={LOGO_URL}
            alt="6+1"
            className="h-10 w-auto mb-8"
            style={{ filter: "brightness(0) invert(1)" }}
          />

          <div className="mb-4 w-full">
            <div className="h-[1px] bg-white/30 mb-6" />
            <p
              className="font-display text-white/80 tracking-widest mb-2"
              style={{ fontSize: "clamp(1rem, 4vw, 1.5rem)" }}
            >
              YOU ARE
            </p>
            <h1
              className="font-display text-white leading-none"
              style={{ fontSize: "clamp(3.5rem, 16vw, 8rem)", textShadow: "0 0 60px rgba(0,0,0,0.4)" }}
            >
              {config.name}
            </h1>
            <p
              className="font-display text-white/70 tracking-[0.2em] mt-2"
              style={{ fontSize: "clamp(1rem, 4vw, 1.8rem)" }}
            >
              {config.identity}
            </p>
            <div className="h-[1px] bg-white/30 mt-6" />
          </div>

          <div className="flex flex-col gap-3 mt-8 w-full">
            <button
              onClick={handleShare}
              className="w-full bg-white text-black font-display text-xl tracking-widest py-5 hover:bg-black hover:text-white transition-colors active:scale-95"
            >
              SHARE YOUR TEAM →
            </button>
            <button
              onClick={() => navigate("/holding")}
              className="w-full border-2 border-white text-white font-display text-xl tracking-widest py-5 hover:bg-white/10 transition-colors active:scale-95"
            >
              SEE WHAT'S NEXT →
            </button>
          </div>

          <p className="font-mono text-white/50 text-xs tracking-wider mt-4">
            Share to your Instagram Story and tag @6plus1
          </p>
        </div>
      )}
    </div>
  );
}
