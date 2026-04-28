import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const TEAM_CONFIG = {
  red: {
    color: "#E8232A",
    name: "TEAM RED",
    confettiColors: ["#E8232A", "#FFFFFF", "#FF6666", "#CC0000"],
  },
  blue: {
    color: "#1A4FE8",
    name: "TEAM BLUE",
    confettiColors: ["#1A4FE8", "#C0C0C0", "#6699FF", "#0033CC"],
  },
  pink: {
    color: "#F72B8C",
    name: "TEAM PINK",
    confettiColors: ["#F72B8C", "#FFD700", "#FF99CC", "#CC0066"],
  },
  orange: {
    color: "#FF6B00",
    name: "TEAM ORANGE",
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

// ─── Roulette Wheel (Red) ─────────────────────────────────────────────────────

// ─── Casino Roulette (Red) ────────────────────────────────────────────────────
// 37-segment casino wheel (0-36), white ball orbits then spirals to land on RED
function RouletteAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SIZE = 320;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const cx = SIZE / 2, cy = SIZE / 2;
    const outerR = 148, innerR = 88, pocketR = 68;
    const NUM_SEG = 37;
    const segAngle = (Math.PI * 2) / NUM_SEG;
    // Classic roulette number order
    const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    const redNums = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
    // Target: number 1 (RED) is at index 23
    const targetIndex = 23;
    const totalWheelRot = 5;
    const targetWheelAngle = totalWheelRot * Math.PI * 2 + targetIndex * segAngle;
    const totalBallRot = 14;
    const duration = 5200;
    let frame: number;
    let startTime: number | null = null;

    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

    const drawWheel = (wheelAngle: number) => {
      // Outer rim
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 10, 0, Math.PI * 2);
      ctx.fillStyle = "#1a0800";
      ctx.fill();
      ctx.strokeStyle = "#7B3F00";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Ball track groove
      ctx.beginPath();
      ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#3a1800";
      ctx.lineWidth = 8;
      ctx.stroke();

      // Segments
      numbers.forEach((num, i) => {
        const startA = wheelAngle + i * segAngle - Math.PI / 2;
        const endA = startA + segAngle;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, startA, endA);
        ctx.closePath();
        if (num === 0) ctx.fillStyle = "#006400";
        else if (redNums.has(num)) ctx.fillStyle = "#B80000";
        else ctx.fillStyle = "#111111";
        ctx.fill();
        ctx.strokeStyle = "#7B3F00";
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Number
        const labelAngle = wheelAngle + i * segAngle + segAngle / 2 - Math.PI / 2;
        const labelR = (outerR + innerR) / 2;
        ctx.save();
        ctx.translate(cx + Math.cos(labelAngle) * labelR, cy + Math.sin(labelAngle) * labelR);
        ctx.rotate(labelAngle + Math.PI / 2);
        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(num), 0, 0);
        ctx.restore();
      });

      // Diamond separators on rim
      for (let d = 0; d < 8; d++) {
        const dAngle = (d / 8) * Math.PI * 2;
        const dx = cx + Math.cos(dAngle) * (outerR + 2);
        const dy = cy + Math.sin(dAngle) * (outerR + 2);
        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700";
        ctx.fill();
      }

      // Inner bowl
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0400";
      ctx.fill();
      ctx.strokeStyle = "#7B3F00";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Center hub
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
      hubGrad.addColorStop(0, "#FFD700");
      hubGrad.addColorStop(1, "#7B3F00");
      ctx.fillStyle = hubGrad;
      ctx.fill();

      // Fixed pointer at top
      ctx.beginPath();
      ctx.moveTo(cx, cy - outerR - 2);
      ctx.lineTo(cx - 9, cy - outerR + 16);
      ctx.lineTo(cx + 9, cy - outerR + 16);
      ctx.closePath();
      ctx.fillStyle = "#FFD700";
      ctx.fill();
      ctx.strokeStyle = "#0A0A0A";
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const wheelAngle = easeOutCubic(progress) * targetWheelAngle;

      // Ball: counter-rotates fast, then slows and spirals inward
      const ballAngle = -(totalBallRot * Math.PI * 2 * (1 - easeOutQuint(Math.min(progress * 1.1, 1))));
      const ballRadius = outerR + 4 - (outerR + 4 - pocketR) * Math.pow(Math.min(progress * 1.2, 1), 2.8);

      const ballX = cx + Math.cos(ballAngle) * ballRadius;
      const ballY = cy + Math.sin(ballAngle) * ballRadius;

      ctx.clearRect(0, 0, SIZE, SIZE);
      drawWheel(wheelAngle);

      // Ball with glow
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.9)";
      ctx.shadowBlur = progress > 0.8 ? 12 : 8;
      ctx.beginPath();
      ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
      const ballGrad = ctx.createRadialGradient(ballX - 2, ballY - 2, 1, ballX, ballY, 7);
      ballGrad.addColorStop(0, "#FFFFFF");
      ballGrad.addColorStop(1, "#CCCCCC");
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.restore();

      if (progress < 1) frame = requestAnimationFrame(draw);
      else setTimeout(onComplete, 900);
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-6">THE WHEEL IS SPINNING...</p>
      <canvas ref={canvasRef} style={{ width: 300, height: 300 }} />
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

// ─── Slot Machine (Pink) ──────────────────────────────────────────────────────

function SlotAnimation({ onComplete }: { onComplete: () => void }) {
  const [reels, setReels] = useState(["?", "?", "?"]);
  const [locked, setLocked] = useState([false, false, false]);

  useEffect(() => {
    const colors = ["🔴", "🔵", "🩷", "🟠"];
    let interval: ReturnType<typeof setInterval>;
    interval = setInterval(() => {
      setReels((prev) => prev.map((v, i) => (locked[i] ? v : colors[Math.floor(Math.random() * colors.length)])));
    }, 80);
    const t1 = setTimeout(() => { setLocked([true, false, false]); setReels(["🩷", "?", "?"]); }, 1500);
    const t2 = setTimeout(() => { setLocked([true, true, false]); setReels(["🩷", "🩷", "?"]); }, 2500);
    const t3 = setTimeout(() => { clearInterval(interval); setLocked([true, true, true]); setReels(["🩷", "🩷", "🩷"]); }, 3500);
    const t4 = setTimeout(onComplete, 4500);
    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-6">PULLING THE LEVER...</p>
      <div className="border-2 border-[#F72B8C]/40 bg-[#0D0008] p-6">
        <div className="flex gap-4">
          {reels.map((reel, i) => (
            <div key={i} className="w-20 h-24 border border-[#F72B8C]/30 bg-[#050005] flex items-center justify-center text-4xl"
              style={{ boxShadow: locked[i] ? "0 0 20px #F72B8C" : "none", transition: "box-shadow 0.3s" }}>
              {reel}
            </div>
          ))}
        </div>
        {locked[2] && <div className="mt-4 text-center font-display text-[#F72B8C] text-2xl tracking-widest animate-pulse">JACKPOT!</div>}
      </div>
    </div>
  );
}

// ─── Chaotic Wheel (Orange) ───────────────────────────────────────────────────

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
    const segments = [
      { color: "#FF6B00", label: "ORANGE" },
      { color: "#E8232A", label: "RED" },
      { color: "#1A4FE8", label: "BLUE" },
      { color: "#F72B8C", label: "PINK" },
    ];
    const targetAngle = 10 * Math.PI * 2;
    let frame: number;
    let startTime: number | null = null;
    const duration = 4000;
    const chaoticEase = (t: number) => {
      if (t < 0.6) return t * 1.4 + Math.sin(t * 20) * 0.02;
      const dt = (t - 0.6) / 0.4;
      return Math.min(0.84 + dt * 0.16 + Math.sin(dt * 30) * 0.005 * (1 - dt), 1);
    };

    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const angle = chaoticEase(progress) * targetAngle;
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
      ctx.beginPath();
      ctx.moveTo(cx, cy - r - 5);
      ctx.lineTo(cx - 12, cy - r + 18);
      ctx.lineTo(cx + 12, cy - r + 18);
      ctx.closePath();
      ctx.fillStyle = "#F2F0EB";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fillStyle = "#0A0A0A";
      ctx.fill();
      ctx.strokeStyle = "#FF6B00";
      ctx.lineWidth = 2;
      ctx.stroke();
      if (progress < 1) frame = requestAnimationFrame(draw);
      else setTimeout(onComplete, 600);
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
  const [aiIdentity, setAiIdentity] = useState<{ title: string; message: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const shareCanvasRef = useRef<HTMLCanvasElement>(null);

  const { data: user } = trpc.sportsday.getUserStatus.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  const markRevealSeenMutation = trpc.sportsday.markRevealSeen.useMutation();

  const generateIdentityMutation = trpc.sportsday.generateTeamIdentity.useMutation({
    onSuccess: (data) => {
      const lines = data.aiTeamIdentity.split("\n").filter(Boolean);
      setAiIdentity({
        title: lines[0] ?? "",
        message: lines[1] ?? "",
      });
      setAiLoading(false);
    },
    onError: () => setAiLoading(false),
  });

  const team = (user?.team ?? "red") as Team;
  const config = TEAM_CONFIG[team];
  const confettiRef = useConfetti(phase === "reveal", config.confettiColors);

  const handleAnimationComplete = useCallback(() => {
    setPhase("reveal");
    if (userId) {
      // Mark reveal as seen so future visits skip straight to team hub
      markRevealSeenMutation.mutate({ id: userId });
      // Trigger AI identity generation
      setAiLoading(true);
      generateIdentityMutation.mutate({ id: userId });
    }
  }, [userId, generateIdentityMutation, markRevealSeenMutation]);

  // Generate share card
  useEffect(() => {
    if (phase !== "reveal") return;
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1080;
    canvas.height = 1920;

    ctx.fillStyle = config.color;
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "rgba(0,0,0,0.08)";
    for (let i = 0; i < 1080; i += 40) ctx.fillRect(i, 0, 1, 1920);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(0, 0, 1080, 220);

    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    logoImg.onload = () => {
      ctx.save();
      ctx.filter = "brightness(0) invert(1)";
      const logoH = 120;
      const logoW = (logoImg.width / logoImg.height) * logoH;
      ctx.drawImage(logoImg, (1080 - logoW) / 2, 50, logoW, logoH);
      ctx.restore();

      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 160px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("I'M TEAM", 540, 900);
      ctx.font = "bold 220px sans-serif";
      ctx.fillText(team.toUpperCase() + ".", 540, 1140);
      ctx.font = "bold 70px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("SPORTS DAY 002", 540, 1320);
      ctx.font = "bold 45px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("@6plus1", 540, 1820);
    };
    logoImg.onerror = () => {
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 160px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("I'M TEAM", 540, 900);
      ctx.font = "bold 220px sans-serif";
      ctx.fillText(team.toUpperCase() + ".", 540, 1140);
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
          await navigator.share({ title: `I'm Team ${teamLabel} — Sports Day 002`, text: "Share to your Instagram Story and tag @6plus1", files: [file] });
          return;
        } catch { /* fall through */ }
      }
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
      <canvas ref={confettiRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 10 }} />
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
        <div className="relative z-20 flex flex-col items-center px-5 text-center w-full max-w-sm py-12">
          <img src={LOGO_URL} alt="6+1" className="h-10 w-auto mb-8" style={{ filter: "brightness(0) invert(1)" }} />

          <div className="h-[1px] bg-white/30 w-full mb-6" />

          <p className="font-display text-white/80 tracking-widest mb-1" style={{ fontSize: "clamp(0.9rem, 3.5vw, 1.3rem)" }}>
            YOU ARE
          </p>
          <h1
            className="font-display text-white leading-none mb-2"
            style={{ fontSize: "clamp(3.5rem, 16vw, 8rem)", textShadow: "0 0 60px rgba(0,0,0,0.4)" }}
          >
            {config.name}
          </h1>

          <div className="h-[1px] bg-white/30 w-full mb-8" />

          {/* AI Identity Block */}
          <div className="w-full mb-8 min-h-[100px] flex flex-col items-center justify-center">
            {aiLoading ? (
              <div className="space-y-2 w-full">
                <div className="h-5 bg-white/20 animate-pulse rounded w-3/4 mx-auto" />
                <div className="h-4 bg-white/10 animate-pulse rounded w-full mx-auto" />
                <div className="h-4 bg-white/10 animate-pulse rounded w-5/6 mx-auto" />
              </div>
            ) : aiIdentity ? (
              <div className="space-y-3">
                <p
                  className="font-display text-white tracking-widest"
                  style={{ fontSize: "clamp(1.1rem, 4.5vw, 1.8rem)", textShadow: "0 0 30px rgba(0,0,0,0.5)" }}
                >
                  {aiIdentity.title}
                </p>
                <p
                  className="font-mono text-white/80 leading-relaxed"
                  style={{ fontSize: "clamp(0.75rem, 2.8vw, 1rem)" }}
                >
                  {aiIdentity.message}
                </p>
              </div>
            ) : (
              // Fallback to static profile
              <div className="space-y-2">
                <p className="font-display text-white tracking-widest" style={{ fontSize: "clamp(1.1rem, 4.5vw, 1.8rem)" }}>
                  {user.sportsDayProfile ?? "THE COMPETITOR"}
                </p>
                <p className="font-mono text-white/70 text-sm leading-relaxed">
                  {user.profileTagline ?? "You were built for this."}
                </p>
              </div>
            )}
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleShare}
              className="w-full bg-white text-black font-display text-xl tracking-widest py-5 hover:bg-black hover:text-white transition-colors active:scale-95"
            >
              SHARE YOUR TEAM →
            </button>
            <button
              onClick={() => navigate("/team-hub")}
              className="w-full border-2 border-white text-white font-display text-xl tracking-widest py-5 hover:bg-white/10 transition-colors active:scale-95"
            >
              ENTER TEAM HUB →
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
