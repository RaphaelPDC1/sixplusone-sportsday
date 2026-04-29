import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { BackNav } from "@/components/ui/back-nav";
import { EntrySplash } from "@/components/ui/entry-splash";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const TEAM_CONFIG = {
  red: { color: "#E8232A", name: "TEAM RED", confettiColors: ["#E8232A", "#FFFFFF", "#FF6666", "#CC0000"] },
  blue: { color: "#1A4FE8", name: "TEAM BLUE", confettiColors: ["#1A4FE8", "#C0C0C0", "#6699FF", "#0033CC"] },
  pink: { color: "#F72B8C", name: "TEAM PINK", confettiColors: ["#F72B8C", "#FFD700", "#FF99CC", "#CC0066"] },
  orange: { color: "#FF6B00", name: "TEAM ORANGE", confettiColors: ["#FF6B00", "#0A0A0A", "#FFAA44", "#CC5500"] },
};
type Team = keyof typeof TEAM_CONFIG;

// ─── Animated dark grid background ───────────────────────────────────────────
function RevealBackground({ teamColor }: { teamColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    let t = 0;
    const draw = () => {
      t += 0.008;
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
      glow.addColorStop(0, `${teamColor}18`);
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
      const gridSize = 60;
      ctx.strokeStyle = `${teamColor}14`;
      ctx.lineWidth = 1;
      for (let x = (t * 20) % gridSize; x < w; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = (t * 20) % gridSize; y < h; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        const px = (Math.sin(t * 0.7 + i * 1.3) * 0.4 + 0.5) * w;
        const py = (Math.cos(t * 0.5 + i * 0.9) * 0.4 + 0.5) * h;
        const alpha = 0.04 + Math.sin(t + i) * 0.02;
        const hexA = Math.round(alpha * 255).toString(16).padStart(2, "0");
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 80);
        grad.addColorStop(0, `${teamColor}${hexA}`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(px, py, 80, 0, Math.PI * 2); ctx.fill();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", resize); };
  }, [teamColor]);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />;
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function useConfetti(active: boolean, colors: string[], colliderRef?: React.RefObject<HTMLElement | null>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Fresh particle factory — always starts with safe initial velocity
    const makeParticle = (startY?: number) => ({
      x: Math.random() * canvas.width,
      y: startY ?? Math.random() * -canvas.height * 0.5,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 4 + 1.5,   // initial downward speed, capped
      color: colors[Math.floor(Math.random() * colors.length)],
      w: Math.random() * 12 + 5,
      h: Math.random() * 6 + 3,
      rot: Math.random() * 360,
      rotV: (Math.random() - 0.5) * 10,
    });

    const particles = Array.from({ length: 200 }, () => makeParticle());

    const GRAVITY = 0.05;       // gentle, constant gravity
    const MAX_VY = 9;           // terminal velocity cap
    const BOUNCE_DAMP = 0.45;   // energy lost on collision

    let frame: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Get collider rect once per frame (cheap — just a getBoundingClientRect)
      let cRect: DOMRect | null = null;
      if (colliderRef?.current) {
        cRect = colliderRef.current.getBoundingClientRect();
      }

      for (const p of particles) {
        // Apply gravity with terminal velocity cap
        p.vy = Math.min(p.vy + GRAVITY, MAX_VY);
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotV;

        // AABB collision with team name text box
        if (cRect) {
          const px = p.x, py = p.y;
          const hw = p.w / 2, hh = p.h / 2;
          // Check if particle overlaps the collider rect
          if (
            px + hw > cRect.left &&
            px - hw < cRect.right &&
            py + hh > cRect.top &&
            py - hh < cRect.bottom
          ) {
            // Determine which edge was hit — bounce off top or sides
            const overlapTop = (py + hh) - cRect.top;
            const overlapLeft = (px + hw) - cRect.left;
            const overlapRight = cRect.right - (px - hw);

            if (overlapTop < overlapLeft && overlapTop < overlapRight && p.vy > 0) {
              // Hit from top — bounce vertically
              p.y = cRect.top - hh - 1;
              p.vy = -Math.abs(p.vy) * BOUNCE_DAMP;
              p.vx += (Math.random() - 0.5) * 2; // slight horizontal scatter
            } else if (overlapLeft < overlapRight) {
              // Hit left wall — push left
              p.x = cRect.left - hw - 1;
              p.vx = -Math.abs(p.vx) * BOUNCE_DAMP;
            } else {
              // Hit right wall — push right
              p.x = cRect.right + hw + 1;
              p.vx = Math.abs(p.vx) * BOUNCE_DAMP;
            }
          }
        }

        // Recycle off-screen particles with FRESH velocity (key fix for acceleration bug)
        if (p.y > canvas.height + 30) {
          const fresh = makeParticle(-20);
          p.x = fresh.x; p.y = fresh.y;
          p.vx = fresh.vx; p.vy = fresh.vy;   // ← reset velocity, not just position
          p.rot = fresh.rot; p.rotV = fresh.rotV;
        }
        // Wrap horizontally
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
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [active, colors]); // eslint-disable-line react-hooks/exhaustive-deps

  return canvasRef;
}

// ─── Tension builder ──────────────────────────────────────────────────────────
function TensionBuilder({ teamColor, onReady }: { teamColor: string; onReady: () => void }) {
  const [count, setCount] = useState(3);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const tick = () => { setPulse(true); setTimeout(() => setPulse(false), 300); };
    tick();
    const interval = setInterval(() => {
      setCount((c) => {
        if (c <= 1) { clearInterval(interval); setTimeout(onReady, 400); return 0; }
        tick();
        return c - 1;
      });
    }, 900);
    return () => clearInterval(interval);
  }, [onReady]);
  return (
    <div className="flex flex-col items-center justify-center min-h-[320px]">
      <p className="font-mono text-white/30 text-xs tracking-[0.4em] mb-8">TEAM ASSIGNMENT LOADING</p>
      <div
        className="font-display text-white leading-none transition-all duration-200"
        style={{
          fontSize: "clamp(6rem, 30vw, 12rem)",
          color: count === 0 ? teamColor : "white",
          textShadow: pulse ? `0 0 60px ${teamColor}, 0 0 120px ${teamColor}80` : "none",
          transform: pulse ? "scale(1.08)" : "scale(1)",
        }}
      >
        {count === 0 ? "GO" : count}
      </div>
      <div className="flex gap-2 mt-8">
        {[3, 2, 1].map((n) => (
          <div key={n} className="w-2 h-2 rounded-full transition-colors duration-300"
            style={{ backgroundColor: n >= count ? teamColor : "rgba(255,255,255,0.15)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Casino Roulette (Red) ────────────────────────────────────────────────────
function RouletteAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const SIZE = 320;
    canvas.width = SIZE; canvas.height = SIZE;
    const cx = SIZE / 2, cy = SIZE / 2;
    const outerR = 148, innerR = 88, pocketR = 68;
    const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    const redNums = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
    const segAngle = (Math.PI * 2) / numbers.length;
    const targetIndex = 23; // number 1 = red
    const targetWheelAngle = 5 * Math.PI * 2 + targetIndex * segAngle;
    const totalBallRot = 14;
    const duration = 5200;
    let startTime: number | null = null;
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
    const drawWheel = (wheelAngle: number) => {
      ctx.beginPath(); ctx.arc(cx, cy, outerR + 10, 0, Math.PI * 2);
      ctx.fillStyle = "#1a0800"; ctx.fill();
      ctx.strokeStyle = "#7B3F00"; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, outerR + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "#3a1800"; ctx.lineWidth = 8; ctx.stroke();
      numbers.forEach((num, i) => {
        const startA = wheelAngle + i * segAngle - Math.PI / 2;
        const endA = startA + segAngle;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, outerR, startA, endA); ctx.closePath();
        ctx.fillStyle = num === 0 ? "#006400" : redNums.has(num) ? "#B80000" : "#111111";
        ctx.fill(); ctx.strokeStyle = "#7B3F00"; ctx.lineWidth = 0.8; ctx.stroke();
        const labelAngle = wheelAngle + i * segAngle + segAngle / 2 - Math.PI / 2;
        const labelR = (outerR + innerR) / 2;
        ctx.save();
        ctx.translate(cx + Math.cos(labelAngle) * labelR, cy + Math.sin(labelAngle) * labelR);
        ctx.rotate(labelAngle + Math.PI / 2);
        ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 7px sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(num), 0, 0); ctx.restore();
      });
      for (let d = 0; d < 8; d++) {
        const dAngle = (d / 8) * Math.PI * 2;
        const dx = cx + Math.cos(dAngle) * (outerR + 2);
        const dy = cy + Math.sin(dAngle) * (outerR + 2);
        ctx.beginPath(); ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700"; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      ctx.fillStyle = "#0a0400"; ctx.fill();
      ctx.strokeStyle = "#7B3F00"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
      hubGrad.addColorStop(0, "#FFD700"); hubGrad.addColorStop(1, "#7B3F00");
      ctx.fillStyle = hubGrad; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy - outerR - 2);
      ctx.lineTo(cx - 9, cy - outerR + 16); ctx.lineTo(cx + 9, cy - outerR + 16);
      ctx.closePath(); ctx.fillStyle = "#FFD700"; ctx.fill();
      ctx.strokeStyle = "#0A0A0A"; ctx.lineWidth = 1; ctx.stroke();
    };
    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const wheelAngle = easeOutCubic(progress) * targetWheelAngle;
      const ballAngle = -(totalBallRot * Math.PI * 2 * (1 - easeOutQuint(Math.min(progress * 1.1, 1))));
      const ballRadius = outerR + 4 - (outerR + 4 - pocketR) * Math.pow(Math.min(progress * 1.2, 1), 2.8);
      const ballX = cx + Math.cos(ballAngle) * ballRadius;
      const ballY = cy + Math.sin(ballAngle) * ballRadius;
      ctx.clearRect(0, 0, SIZE, SIZE);
      drawWheel(wheelAngle);
      ctx.save();
      ctx.shadowColor = "rgba(255,255,255,0.9)"; ctx.shadowBlur = progress > 0.8 ? 16 : 8;
      ctx.beginPath(); ctx.arc(ballX, ballY, 7, 0, Math.PI * 2);
      const ballGrad = ctx.createRadialGradient(ballX - 2, ballY - 2, 1, ballX, ballY, 7);
      ballGrad.addColorStop(0, "#FFFFFF"); ballGrad.addColorStop(1, "#CCCCCC");
      ctx.fillStyle = ballGrad; ctx.fill(); ctx.restore();
      if (progress < 1) frameRef.current = requestAnimationFrame(draw);
      else setTimeout(onComplete, 900);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [onComplete]);
  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-white/40 text-xs tracking-[0.3em] mb-4">THE WHEEL IS SPINNING...</p>
      <div className="relative">
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 60px #E8232A40, 0 0 120px #E8232A20" }} />
        <canvas ref={canvasRef} style={{ width: 300, height: 300 }} />
      </div>
    </div>
  );
}

// ─── Claw Machine (Blue) ──────────────────────────────────────────────────────
function ClawAnimation({ onComplete }: { onComplete: () => void }) {
  const [clawPhase, setClawPhase] = useState<"descend" | "grab" | "ascend" | "done">("descend");
  const [clawY, setClawY] = useState(0);
  const [glowActive, setGlowActive] = useState(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (clawPhase === "descend") {
      setTimeout(() => setClawY(155), 50);
      t = setTimeout(() => setClawPhase("grab"), 1800);
    } else if (clawPhase === "grab") {
      setGlowActive(true);
      t = setTimeout(() => setClawPhase("ascend"), 900);
    } else if (clawPhase === "ascend") {
      setClawY(0);
      t = setTimeout(() => setClawPhase("done"), 1600);
    } else {
      t = setTimeout(onComplete, 700);
    }
    return () => clearTimeout(t);
  }, [clawPhase, onComplete]);
  const clawOpen = clawPhase === "descend";
  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-white/40 text-xs tracking-[0.3em] mb-4">CLAW MACHINE ACTIVATED...</p>
      <div className="relative w-72 h-80 border border-[#1A4FE8]/30 overflow-hidden"
        style={{ background: "linear-gradient(180deg, #020818 0%, #050520 100%)", boxShadow: "0 0 40px #1A4FE820 inset" }}>
        <div className="absolute top-0 left-0 right-0 h-5 bg-gradient-to-b from-[#1A1A3E] to-[#0D0D2E] border-b border-[#1A4FE8]/40 flex items-center justify-center">
          <div className="w-8 h-2 bg-[#1A4FE8]/60 rounded" />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 w-[2px] bg-gradient-to-b from-[#1A4FE8]/80 to-[#1A4FE8]/30 transition-all duration-[1600ms] ease-in-out"
          style={{ top: 20, height: clawY + 40 }} />
        <div className="absolute left-1/2 -translate-x-1/2 transition-all duration-[1600ms] ease-in-out" style={{ top: 20 + clawY }}>
          <div className="relative w-14 h-10 flex items-start justify-center">
            <div className="absolute left-0 top-0 w-[3px] h-10 bg-[#1A4FE8] rounded-b origin-top transition-transform duration-300"
              style={{ transform: `rotate(${clawOpen ? -28 : -12}deg)` }} />
            <div className="absolute right-0 top-0 w-[3px] h-10 bg-[#1A4FE8] rounded-b origin-top transition-transform duration-300"
              style={{ transform: `rotate(${clawOpen ? 28 : 12}deg)` }} />
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[3px] h-7 bg-[#1A4FE8] rounded-b" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-2 bg-[#1A4FE8]/60 rounded" />
          </div>
          {(clawPhase === "grab" || clawPhase === "ascend" || clawPhase === "done") && (
            <div className="absolute left-1/2 -translate-x-1/2 top-8 w-12 h-12 rounded-full flex items-center justify-center font-display text-white text-xs tracking-wider transition-all duration-300"
              style={{ background: "radial-gradient(circle at 35% 35%, #4477FF, #1A4FE8, #0A2080)", boxShadow: glowActive ? "0 0 30px #1A4FE8, 0 0 60px #1A4FE840" : "none" }}>
              BLUE
            </div>
          )}
        </div>
        {clawPhase === "descend" && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
            {[{ c: "#E8232A", l: "R" }, { c: "#1A4FE8", l: "B" }, { c: "#F72B8C", l: "P" }, { c: "#FF6B00", l: "O" }].map(({ c, l }) => (
              <div key={l} className="w-10 h-10 rounded-full flex items-center justify-center font-display text-white text-xs"
                style={{ background: `radial-gradient(circle at 35% 35%, ${c}CC, ${c})`, boxShadow: `0 0 12px ${c}60` }}>
                {l}
              </div>
            ))}
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%)" }} />
        {[0.2, 0.4, 0.6, 0.8].map((y) => (
          <div key={y} className="absolute left-1 w-1.5 h-1.5 rounded-full bg-[#1A4FE8]"
            style={{ top: `${y * 100}%`, opacity: 0.6, animation: `pulse 1.5s ease-in-out ${y}s infinite` }} />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((y) => (
          <div key={y} className="absolute right-1 w-1.5 h-1.5 rounded-full bg-[#1A4FE8]"
            style={{ top: `${y * 100}%`, opacity: 0.6, animation: `pulse 1.5s ease-in-out ${y + 0.3}s infinite` }} />
        ))}
      </div>
    </div>
  );
}

// ─── Slot Machine (Pink) ──────────────────────────────────────────────────────
const SLOT_SYMBOLS = ["RED", "BLUE", "PINK", "ORANGE", "RED", "PINK", "BLUE", "ORANGE", "PINK"];
const SYMBOL_COLORS: Record<string, string> = { RED: "#E8232A", BLUE: "#1A4FE8", PINK: "#F72B8C", ORANGE: "#FF6B00" };

function SlotReel({ spinning, locked }: { spinning: boolean; locked: boolean }) {
  const [offset, setOffset] = useState(0);
  const frameRef = useRef<number>(0);
  const stoppedRef = useRef(false);
  useEffect(() => {
    if (!spinning) return;
    stoppedRef.current = false;
    const speed = 8;
    const totalH = SLOT_SYMBOLS.length * 64;
    const animate = () => {
      if (!stoppedRef.current) {
        setOffset((o) => (o + speed) % totalH);
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(frameRef.current); stoppedRef.current = true; };
  }, [spinning]);
  useEffect(() => {
    if (locked) { cancelAnimationFrame(frameRef.current); stoppedRef.current = true; setOffset(0); }
  }, [locked]);
  const symbols = locked ? ["PINK", "PINK", "PINK"] : SLOT_SYMBOLS;
  return (
    <div className="relative w-20 h-16 overflow-hidden border border-[#F72B8C]/30"
      style={{ background: "linear-gradient(180deg, #0D0008 0%, #050005 100%)", boxShadow: locked ? "0 0 20px #F72B8C60" : "none", transition: "box-shadow 0.4s ease" }}>
      <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)" }} />
      <div className="absolute left-0 right-0 flex flex-col" style={{ top: locked ? 0 : -offset, transition: locked ? "top 0.3s ease" : "none" }}>
        {symbols.map((sym, i) => (
          <div key={i} className="h-16 flex items-center justify-center font-display text-xs tracking-widest shrink-0"
            style={{ color: SYMBOL_COLORS[sym] ?? "#F2F0EB" }}>
            {sym}
          </div>
        ))}
      </div>
    </div>
  );
}

function SlotAnimation({ onComplete }: { onComplete: () => void }) {
  const [spinning, setSpinning] = useState(false);
  const [locked, setLocked] = useState([false, false, false]);
  const [jackpot, setJackpot] = useState(false);
  useEffect(() => {
    const t0 = setTimeout(() => setSpinning(true), 300);
    const t1 = setTimeout(() => setLocked([true, false, false]), 1800);
    const t2 = setTimeout(() => setLocked([true, true, false]), 2800);
    const t3 = setTimeout(() => { setLocked([true, true, true]); setJackpot(true); }, 3800);
    const t4 = setTimeout(onComplete, 5000);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);
  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-white/40 text-xs tracking-[0.3em] mb-4">PULLING THE LEVER...</p>
      <div className="relative border-2 border-[#F72B8C]/40 p-6"
        style={{ background: "linear-gradient(180deg, #0D0008 0%, #050005 100%)", boxShadow: jackpot ? "0 0 60px #F72B8C40, 0 0 120px #F72B8C20" : "0 0 20px #F72B8C10", transition: "box-shadow 0.5s ease" }}>
        <div className="flex items-center justify-center mb-4">
          <div className="font-display text-[#F72B8C] text-lg tracking-widest">SPORTS DAY 002</div>
        </div>
        <div className="flex gap-3 mb-4">
          {[0, 1, 2].map((i) => (
            <SlotReel key={i} spinning={spinning} locked={locked[i]} />
          ))}
        </div>
        <div className="text-center font-display text-[#F72B8C] text-2xl tracking-widest transition-all duration-500"
          style={{ opacity: jackpot ? 1 : 0, transform: jackpot ? "scale(1)" : "scale(0.8)" }}>
          JACKPOT!
        </div>
        <div className="flex gap-1 justify-center mt-3">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "#F72B8C", opacity: jackpot ? 1 : 0.2, animation: jackpot ? `pulse 0.4s ease-in-out ${i * 0.06}s infinite` : "none" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Chaotic Wheel (Orange) ───────────────────────────────────────────────────
function ChaoticWheelAnimation({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 320; canvas.height = 320;
    const cx = 160, cy = 160, r = 140;
    const segments = [
      { color: "#FF6B00", label: "ORANGE" },
      { color: "#E8232A", label: "RED" },
      { color: "#1A4FE8", label: "BLUE" },
      { color: "#F72B8C", label: "PINK" },
    ];
    const targetAngle = 10 * Math.PI * 2;
    const duration = 4500;
    let startTime: number | null = null;
    const chaoticEase = (t: number) => {
      if (t < 0.55) return t * 1.5 + Math.sin(t * 22) * 0.025;
      const dt = (t - 0.55) / 0.45;
      return Math.min(0.825 + dt * 0.175 + Math.sin(dt * 35) * 0.004 * (1 - dt), 1);
    };
    const draw = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const angle = chaoticEase(progress) * targetAngle;
      ctx.clearRect(0, 0, 320, 320);
      const glowIntensity = progress > 0.85 ? (progress - 0.85) / 0.15 : 0;
      if (glowIntensity > 0) {
        const glow = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, r + 20);
        glow.addColorStop(0, `rgba(255,107,0,${glowIntensity * 0.4})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(cx, cy, r + 20, 0, Math.PI * 2); ctx.fill();
      }
      segments.forEach((seg, i) => {
        const startA = angle + (i * Math.PI * 2) / 4 - Math.PI / 2;
        const endA = startA + Math.PI / 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, startA, endA); ctx.closePath();
        ctx.fillStyle = seg.color; ctx.fill();
        ctx.strokeStyle = "#0A0A0A"; ctx.lineWidth = 3; ctx.stroke();
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(startA + Math.PI / 4);
        ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 13px monospace"; ctx.textAlign = "center";
        ctx.fillText(seg.label, r * 0.65, 5); ctx.restore();
      });
      ctx.beginPath(); ctx.moveTo(cx, cy - r - 3);
      ctx.lineTo(cx - 13, cy - r + 20); ctx.lineTo(cx + 13, cy - r + 20);
      ctx.closePath(); ctx.fillStyle = "#F2F0EB"; ctx.fill();
      ctx.strokeStyle = "#FF6B00"; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2);
      const hubGrad = ctx.createRadialGradient(cx, cy, 4, cx, cy, 24);
      hubGrad.addColorStop(0, "#FF8C00"); hubGrad.addColorStop(1, "#CC4400");
      ctx.fillStyle = hubGrad; ctx.fill();
      ctx.strokeStyle = "#0A0A0A"; ctx.lineWidth = 2; ctx.stroke();
      if (progress < 1) frameRef.current = requestAnimationFrame(draw);
      else setTimeout(onComplete, 700);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [onComplete]);
  return (
    <div className="flex flex-col items-center">
      <p className="font-mono text-white/40 text-xs tracking-[0.3em] mb-4">CHAOS INCOMING...</p>
      <div className="relative">
        <div className="absolute inset-0 rounded-full" style={{ boxShadow: "0 0 60px #FF6B0040, 0 0 120px #FF6B0020" }} />
        <canvas ref={canvasRef} style={{ width: 300, height: 300 }} />
      </div>
    </div>
  );
}

// ─── Main Reveal Page ─────────────────────────────────────────────────────────
export default function Reveal() {
  const [, navigate] = useLocation();
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem("reveal_splash_seen") !== "true"
  );
  const [userId] = useState(() => localStorage.getItem("sd_user_id"));
  const [phase, setPhase] = useState<"tension" | "animation" | "reveal">("tension");
  const [aiIdentity, setAiIdentity] = useState<{ title: string; message: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const shareCanvasRef = useRef<HTMLCanvasElement>(null);
  const teamNameRef = useRef<HTMLHeadingElement>(null);

  const { data: user } = trpc.sportsday.getUserStatus.useQuery(
    { id: userId! },
    { enabled: !!userId }
  );

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Guard: redirect to holding if not unlocked — MUST be in useEffect, not render
  useEffect(() => {
    if (user && user.revealStatus !== "unlocked") {
      navigateRef.current("/holding");
    }
  }, [user?.revealStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const markRevealSeenMutation = trpc.sportsday.markRevealSeen.useMutation();
  const generateIdentityMutation = trpc.sportsday.generateTeamIdentity.useMutation({
    onSuccess: (data) => {
      const lines = data.aiTeamIdentity.split("\n").filter(Boolean);
      setAiIdentity({ title: lines[0] ?? "", message: lines[1] ?? "" });
      setAiLoading(false);
    },
    onError: () => setAiLoading(false),
  });

  const team = (user?.team ?? "red") as Team;
  const config = TEAM_CONFIG[team];
  const confettiRef = useConfetti(phase === "reveal", config.confettiColors, teamNameRef as React.RefObject<HTMLElement | null>);

  const handleAnimationComplete = useCallback(() => {
    setPhase("reveal");
    if (userId) {
      markRevealSeenMutation.mutate({ id: userId });
      setAiLoading(true);
      generateIdentityMutation.mutate({ id: userId });
    }
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate share card — loads Bebas Neue via FontFace API before drawing
  useEffect(() => {
    if (phase !== "reveal") return;
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawCard = (headingFont: string) => {
      canvas.width = 1080; canvas.height = 1920;
      // Background
      ctx.fillStyle = config.color;
      ctx.fillRect(0, 0, 1080, 1920);
      // Subtle grid
      ctx.strokeStyle = "rgba(0,0,0,0.10)"; ctx.lineWidth = 1;
      for (let i = 0; i < 1080; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1920); ctx.stroke(); }
      for (let i = 0; i < 1920; i += 60) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1080, i); ctx.stroke(); }
      // Header band
      ctx.fillStyle = "rgba(0,0,0,0.35)"; ctx.fillRect(0, 0, 1080, 280);
      // Bottom band
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(0, 1780, 1080, 140);
      // Main copy — exact spec: "I'M TEAM [COLOUR]"
      ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center";
      ctx.font = `180px ${headingFont}`;
      ctx.fillText("I'M TEAM", 540, 1020);
      ctx.font = `260px ${headingFont}`;
      ctx.fillText(team.toUpperCase(), 540, 1320);
      // Tagline
      ctx.font = "bold 68px monospace"; ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillText("SPORTS DAY 002", 540, 1480);
      // Handle
      ctx.font = "bold 52px monospace"; ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("@6plus1", 540, 1860);
    };

    const drawWithLogo = (headingFont: string) => {
      drawCard(headingFont);
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";
      logoImg.onload = () => {
        ctx.save(); ctx.filter = "brightness(0) invert(1)";
        const logoH = 150, logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(logoImg, (1080 - logoW) / 2, 65, logoW, logoH);
        ctx.restore();
      };
      logoImg.src = LOGO_URL;
    };

    // Load Bebas Neue via FontFace API for crisp canvas text
    const font = new FontFace(
      "Bebas Neue",
      "url(https://fonts.gstatic.com/s/bebasneuepro/v1/CNz9x_HTkHBMRBBqBBbMgMBBFBBnAA.woff2)"
    );
    font.load()
      .then((loaded) => { document.fonts.add(loaded); drawWithLogo("'Bebas Neue'"); })
      .catch(() => { drawWithLogo("'Arial Narrow', Arial, sans-serif"); });
  }, [phase, config.color, team]);

  const handleShare = () => {
    const canvas = shareCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], `team-${team}-sports-day-002.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: `I'm Team ${team.toUpperCase()} — Sports Day 002`, text: "Just found out my team. @6plus1 #SportsDay002" });
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

  // Redirect handled in useEffect above — show a brief redirecting state
  if (user.revealStatus !== "unlocked") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FF5500] font-display text-3xl tracking-widest animate-pulse">REDIRECTING...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden transition-colors duration-1000"
      style={{ backgroundColor: phase === "reveal" ? config.color : "#0A0A0A" }}>
      {showSplash && <EntrySplash onComplete={() => { sessionStorage.setItem("reveal_splash_seen", "true"); setShowSplash(false); }} />}
      {phase !== "reveal" && <RevealBackground teamColor={config.color} />}
      <canvas ref={confettiRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 10 }} />
      <canvas ref={shareCanvasRef} className="hidden" />

      {/* Tension phase — TensionBuilder only mounts after splash so countdown always starts at 3 */}
      {phase === "tension" && (
        <div className="relative z-20 flex flex-col items-center px-5 w-full max-w-sm">
          <div className="w-full flex items-center justify-between mb-10">
            <BackNav to="/holding" inline />
            <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
            <div className="w-16" />
          </div>
          {!showSplash && <TensionBuilder teamColor={config.color} onReady={() => setPhase("animation")} />}
        </div>
      )}

      {/* Animation phase */}
      {phase === "animation" && (
        <div className="relative z-20 flex flex-col items-center px-5 w-full max-w-sm">
          <div className="w-full flex items-center justify-between mb-8">
            <BackNav to="/holding" inline />
            <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
            <div className="w-16" />
          </div>
          {team === "red" && <RouletteAnimation onComplete={handleAnimationComplete} />}
          {team === "blue" && <ClawAnimation onComplete={handleAnimationComplete} />}
          {team === "pink" && <SlotAnimation onComplete={handleAnimationComplete} />}
          {team === "orange" && <ChaoticWheelAnimation onComplete={handleAnimationComplete} />}
        </div>
      )}

      {/* Reveal phase */}
      {phase === "reveal" && (
        <div className="relative z-20 flex flex-col items-center px-5 text-center w-full max-w-sm py-12">
          <div className="w-full flex items-center justify-between mb-6">
            <BackNav to="/holding" inline />
            <img src={LOGO_URL} alt="6+1" className="h-10 w-auto" style={{ filter: "brightness(0) invert(1)" }} />
            <div className="w-16" />
          </div>
          <div className="h-[1px] bg-white/30 w-full mb-6" />
          <p className="font-display text-white/80 tracking-widest mb-1" style={{ fontSize: "clamp(0.9rem, 3.5vw, 1.3rem)" }}>
            YOU ARE
          </p>
          <h1 ref={teamNameRef} className="font-display text-white leading-none mb-2"
            style={{ fontSize: "clamp(3.5rem, 16vw, 8rem)", textShadow: "0 0 80px rgba(0,0,0,0.5)" }}>
            {config.name}
          </h1>
          <div className="h-[1px] bg-white/30 w-full mb-8" />
          <div className="w-full mb-8 min-h-[100px] flex flex-col items-center justify-center">
            {aiLoading ? (
              <div className="space-y-2 w-full">
                <div className="h-5 bg-white/20 animate-pulse rounded w-3/4 mx-auto" />
                <div className="h-4 bg-white/10 animate-pulse rounded w-full mx-auto" />
                <div className="h-4 bg-white/10 animate-pulse rounded w-5/6 mx-auto" />
              </div>
            ) : aiIdentity ? (
              <div className="space-y-3">
                <p className="font-display text-white tracking-widest"
                  style={{ fontSize: "clamp(1.1rem, 4.5vw, 1.8rem)", textShadow: "0 0 30px rgba(0,0,0,0.5)" }}>
                  {aiIdentity.title}
                </p>
                <p className="font-mono text-white/80 leading-relaxed" style={{ fontSize: "clamp(0.75rem, 2.8vw, 1rem)" }}>
                  {aiIdentity.message}
                </p>
              </div>
            ) : (
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
          <div className="flex flex-col gap-3 w-full">
            <button onClick={handleShare}
              className="w-full bg-white text-black font-display text-xl tracking-widest py-5 hover:bg-black hover:text-white transition-colors active:scale-[0.98]">
              SHARE YOUR TEAM →
            </button>
            <button onClick={() => navigate("/team-hub")}
              className="w-full border-2 border-white text-white font-display text-xl tracking-widest py-5 hover:bg-white/10 transition-colors active:scale-[0.98]">
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
