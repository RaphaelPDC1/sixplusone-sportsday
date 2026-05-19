import { useState, useRef, useEffect, useCallback } from "react";

const LOGO_URL = "/manus-storage/logo-61_bea00c75.webp";

// 9 tiles: positions 0,4,8 are the "winning" date — others are decoys
// Match 3 identical = WIN
const TILE_VALUES = [
  "11 JULY\n2026",   // 0 — winner
  "4 JULY\n2026",    // 1 — decoy
  "18 JULY\n2026",   // 2 — decoy
  "25 JULY\n2026",   // 3 — decoy
  "11 JULY\n2026",   // 4 — winner
  "4 AUG\n2026",     // 5 — decoy
  "28 JUNE\n2026",   // 6 — decoy
  "18 JULY\n2026",   // 7 — decoy
  "11 JULY\n2026",   // 8 — winner
];

const WINNING_VALUE = "11 JULY\n2026";

// ─── Single scratch tile ──────────────────────────────────────────────────────
interface ScratchTileProps {
  index: number;
  value: string;
  isWinner: boolean;
  onRevealed: (index: number) => void;
  forceReveal?: boolean;
}

function ScratchTile({ index, value, isWinner, onRevealed, forceReveal }: ScratchTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const hasTriggered = useRef(false);
  const [revealed, setRevealed] = useState(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.offsetWidth || 80;
    const h = canvas.offsetHeight || 80;
    canvas.width = w;
    canvas.height = h;

    // Silver gradient — matches real scratch card surface
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, "#b8b8b8");
    g.addColorStop(0.3, "#e0e0e0");
    g.addColorStop(0.5, "#d0d0d0");
    g.addColorStop(0.7, "#c8c8c8");
    g.addColorStop(1, "#b0b0b0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Wavy texture lines (like real scratch card)
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 0.8;
    for (let y = 0; y < h; y += 6) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 4) {
        const wy = y + Math.sin(x * 0.15 + y * 0.1) * 1.5;
        x === 0 ? ctx.moveTo(x, wy) : ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    // Subtle dark lines
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 0.5;
    for (let y = 0; y < h; y += 6) {
      ctx.beginPath();
      ctx.moveTo(0, y + 3);
      ctx.lineTo(w, y + 3);
      ctx.stroke();
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(initCanvas, index * 60);
    return () => clearTimeout(t);
  }, [initCanvas, index]);

  // Force reveal (for replay/animation)
  useEffect(() => {
    if (forceReveal && !revealed) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.transition = "opacity 0.3s";
        canvas.style.opacity = "0";
        setTimeout(() => {
          canvas.style.display = "none";
          setRevealed(true);
          if (!hasTriggered.current) {
            hasTriggered.current = true;
            onRevealed(index);
          }
        }, 300);
      }
    }
  }, [forceReveal, revealed, index, onRevealed]);

  const doScratch = useCallback((x: number, y: number) => {
    if (revealed || hasTriggered.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Check coverage
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 128) transparent++;
    }
    const pct = transparent / (canvas.width * canvas.height);
    if (pct > 0.5 && !hasTriggered.current) {
      hasTriggered.current = true;
      canvas.style.transition = "opacity 0.3s";
      canvas.style.opacity = "0";
      setTimeout(() => {
        canvas.style.display = "none";
        setRevealed(true);
        onRevealed(index);
      }, 300);
    }
  }, [revealed, index, onRevealed]);

  const getXY = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect();
    if ("touches" in e) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: (e as React.MouseEvent).clientX - r.left, y: (e as React.MouseEvent).clientY - r.top };
  };

  const lines = value.split("\n");

  return (
    <div
      className="relative select-none"
      style={{ touchAction: "none", aspectRatio: "1" }}
    >
      {/* Revealed content */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center rounded-sm"
        style={{
          background: isWinner
            ? "linear-gradient(135deg, #1a0800 0%, #2d1200 100%)"
            : "linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)",
          border: isWinner ? "1px solid rgba(255,180,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {lines.map((line, i) => (
          <span
            key={i}
            className="font-display leading-none text-center"
            style={{
              fontSize: "clamp(0.5rem, 2.5vw, 0.75rem)",
              color: isWinner ? "#FFB800" : "#666",
              textShadow: isWinner ? "0 0 6px rgba(255,184,0,0.5)" : "none",
              letterSpacing: "0.05em",
            }}
          >
            {line}
          </span>
        ))}
      </div>

      {/* Scratch surface */}
      {!revealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-sm"
          style={{ cursor: "crosshair", touchAction: "none" }}
          onMouseDown={(e) => { isDrawing.current = true; doScratch(...Object.values(getXY(e, e.currentTarget)) as [number, number]); }}
          onMouseMove={(e) => { if (isDrawing.current) doScratch(...Object.values(getXY(e, e.currentTarget)) as [number, number]); }}
          onMouseUp={() => { isDrawing.current = false; }}
          onMouseLeave={() => { isDrawing.current = false; }}
          onTouchStart={(e) => { e.preventDefault(); isDrawing.current = true; doScratch(...Object.values(getXY(e, e.currentTarget)) as [number, number]); }}
          onTouchMove={(e) => { e.preventDefault(); if (isDrawing.current) doScratch(...Object.values(getXY(e, e.currentTarget)) as [number, number]); }}
          onTouchEnd={() => { isDrawing.current = false; }}
        />
      )}
    </div>
  );
}

// ─── Confetti burst ───────────────────────────────────────────────────────────
function WinConfetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles: { x: number; y: number; vx: number; vy: number; color: string; size: number; rot: number; vrot: number }[] = [];
    const colors = ["#FFB800", "#FF5500", "#ffffff", "#FF8C00", "#FFD700"];

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 60,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: -(Math.random() * 10 + 4),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 6 + 3,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
      });
    }

    let frame = 0;
    const animate = () => {
      if (frame > 90) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.rot += p.vrot;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, 1 - frame / 90);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        ctx.restore();
      });
      frame++;
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 10 }}
    />
  );
}

// ─── Main scratch card ────────────────────────────────────────────────────────
interface ScratchCardGridProps {
  onComplete: () => void;
  autoReveal?: boolean;
}

export function ScratchCardGrid({ onComplete, autoReveal = false }: ScratchCardGridProps) {
  const [revealedCount, setRevealedCount] = useState(0);
  const [winnerCount, setWinnerCount] = useState(0);
  const [won, setWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const wonRef = useRef(false);
  const completedRef = useRef(false);

  const handleTileRevealed = useCallback((index: number) => {
    const isWinner = TILE_VALUES[index] === WINNING_VALUE;
    setRevealedCount((c) => c + 1);
    if (isWinner) {
      setWinnerCount((prev) => {
        const next = prev + 1;
        if (next >= 3 && !wonRef.current) {
          wonRef.current = true;
          setWon(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(onComplete, 800);
          }
        }
        return next;
      });
    }
  }, [onComplete]);

  return (
    <div className="w-full max-w-sm mx-auto relative">
      {showConfetti && <WinConfetti />}

      {/* ── Outer card frame (on-brand orange/dark) ── */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #FF5500 0%, #FF7A00 40%, #FF5500 100%)",
          boxShadow: "0 8px 32px rgba(255,85,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
          padding: "3px",
        }}
      >
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: "linear-gradient(160deg, #1a0a00 0%, #2d1400 50%, #0A0A0A 100%)" }}
        >
          {/* ── Top row: branding left + title right ── */}
          <div className="flex items-stretch" style={{ minHeight: "90px" }}>
            {/* Left branding panel */}
            <div
              className="flex flex-col items-center justify-center px-3 py-3 gap-1"
              style={{
                width: "38%",
                background: "linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)",
                borderRight: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <img src={LOGO_URL} alt="6+1" className="w-10 h-10 object-contain" style={{ filter: "brightness(0) invert(1)" }} />
              <span
                className="font-display text-center leading-none"
                style={{ color: "#FFB800", fontSize: "0.6rem", letterSpacing: "0.15em" }}
              >
                SPORTS DAY
              </span>
              <span
                className="font-mono text-center"
                style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.45rem", letterSpacing: "0.2em" }}
              >
                002
              </span>
            </div>

            {/* Right title panel */}
            <div className="flex flex-col items-center justify-center flex-1 px-3 py-3 relative overflow-hidden">
              {/* Starburst rays */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  background: "repeating-conic-gradient(rgba(255,255,255,0.15) 0deg, transparent 10deg, transparent 20deg)",
                }}
              />
              <p className="font-display text-white relative z-10" style={{ fontSize: "1.1rem", letterSpacing: "0.05em", lineHeight: 1 }}>
                MATCH 3
              </p>
              <p className="font-display relative z-10" style={{ color: "#FFB800", fontSize: "1.8rem", letterSpacing: "0.02em", lineHeight: 1 }}>
                TO WIN
              </p>
              <p className="font-mono text-white/60 relative z-10 mt-1" style={{ fontSize: "0.5rem", letterSpacing: "0.2em" }}>
                SCRATCH TO REVEAL
              </p>
            </div>
          </div>

          {/* ── Scratch grid ── */}
          <div className="px-3 pb-2">
            <div
              className="rounded-sm p-2"
              style={{
                background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div className="grid grid-cols-3 gap-1.5">
                {TILE_VALUES.map((value, i) => (
                  <ScratchTile
                    key={i}
                    index={i}
                    value={value}
                    isWinner={value === WINNING_VALUE}
                    onRevealed={handleTileRevealed}
                    forceReveal={autoReveal}
                  />
                ))}
              </div>

              {/* Win state */}
              {won && (
                <div className="text-center mt-2 py-1">
                  <p
                    className="font-display"
                    style={{ color: "#FFB800", fontSize: "1rem", letterSpacing: "0.15em", textShadow: "0 0 12px rgba(255,184,0,0.8)" }}
                  >
                    IT'S HAPPENING
                  </p>
                  <p className="font-mono text-white/40 mt-0.5" style={{ fontSize: "0.5rem", letterSpacing: "0.2em" }}>
                    11 JULY 2026 · SATURDAY · LOCKED IN
                  </p>
                </div>
              )}

              {/* Progress hint */}
              {!won && (
                <p className="font-mono text-white/20 text-center mt-1.5" style={{ fontSize: "0.45rem", letterSpacing: "0.15em" }}>
                  {winnerCount}/3 — KEEP SCRATCHING
                </p>
              )}
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{ background: "rgba(0,0,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span className="font-display text-white" style={{ fontSize: "0.55rem", letterSpacing: "0.2em" }}>
              MATCH 3 TO WIN
            </span>
            <span className="font-mono text-white/30" style={{ fontSize: "0.45rem", letterSpacing: "0.1em" }}>
              SD002-{Math.floor(Math.random() * 900000 + 100000)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
