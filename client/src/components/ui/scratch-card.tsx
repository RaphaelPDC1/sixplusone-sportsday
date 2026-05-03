import { useState, useRef, useEffect, useCallback } from "react";

interface ScratchTileProps {
  revealed: boolean;
  onScratch: () => void;
  content: string;
  contentColor?: string;
  delay?: number;
}

function ScratchTile({ revealed, onScratch, content, contentColor = "#FFD700", delay = 0 }: ScratchTileProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const scratchedPixels = useRef(0);
  const totalPixels = useRef(0);
  const localRevealed = useRef(false);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    canvas.width = w;
    canvas.height = h;
    totalPixels.current = w * h;

    // Silver scratch surface
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#888");
    gradient.addColorStop(0.4, "#ccc");
    gradient.addColorStop(0.6, "#aaa");
    gradient.addColorStop(1, "#999");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    // Subtle texture lines
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, h);
      ctx.stroke();
    }

    // "SCRATCH" hint text
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.font = `bold ${Math.floor(h * 0.18)}px 'Bebas Neue', sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("SCRATCH", w / 2, h / 2);
  }, []);

  useEffect(() => {
    const timer = setTimeout(initCanvas, delay);
    return () => clearTimeout(timer);
  }, [initCanvas, delay]);

  const scratch = useCallback((x: number, y: number) => {
    if (localRevealed.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    // Check how much is scratched
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] < 128) transparent++;
    }
    scratchedPixels.current = transparent;

    if (transparent / totalPixels.current > 0.45 && !localRevealed.current) {
      localRevealed.current = true;
      // Fade out the canvas
      canvas.style.transition = "opacity 0.4s ease";
      canvas.style.opacity = "0";
      setTimeout(() => {
        canvas.style.display = "none";
        onScratch();
      }, 400);
    }
  }, [onScratch]);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    scratch(pos.x, pos.y);
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getPos(e, canvas);
    scratch(pos.x, pos.y);
  };

  const handleEnd = () => { isDrawing.current = false; };

  return (
    <div className="relative w-full aspect-square select-none" style={{ touchAction: "none" }}>
      {/* Content underneath */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded-sm"
        style={{ background: "linear-gradient(135deg, #1a1000 0%, #2a1800 100%)", border: "1px solid rgba(255,215,0,0.2)" }}
      >
        <span
          className="font-display text-center leading-none px-1"
          style={{
            color: contentColor,
            fontSize: "clamp(0.55rem, 2.8vw, 0.9rem)",
            textShadow: `0 0 8px ${contentColor}88`,
          }}
        >
          {content}
        </span>
      </div>

      {/* Scratch overlay canvas */}
      {!revealed && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full rounded-sm cursor-crosshair"
          style={{ touchAction: "none" }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
      )}
    </div>
  );
}

interface ScratchCardGridProps {
  onComplete: () => void;
}

// 3×3 grid — all tiles reveal the confirmed date
const TILES = [
  "11", "JULY", "2026",
  "SPORTS", "DAY", "002",
  "11", "JULY", "2026",
];
const TILE_COLORS = [
  "#FFD700", "#FF5500", "#FFD700",
  "#FF5500", "#FFD700", "#FF5500",
  "#FFD700", "#FF5500", "#FFD700",
];

export function ScratchCardGrid({ onComplete }: ScratchCardGridProps) {
  const [revealed, setRevealed] = useState<boolean[]>(Array(9).fill(false));
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);

  const handleTileScratched = useCallback((index: number) => {
    setRevealed((prev) => {
      const next = [...prev];
      next[index] = true;
      const count = next.filter(Boolean).length;
      if (count >= 5 && !completedRef.current) {
        completedRef.current = true;
        setTimeout(() => {
          setCompleted(true);
          onComplete();
        }, 600);
      }
      return next;
    });
  }, [onComplete]);

  return (
    <div className="w-full">
      {/* Golden ticket frame */}
      <div
        className="relative rounded-sm p-1"
        style={{
          background: "linear-gradient(135deg, #FFD700, #FF8C00, #FFD700, #FF5500)",
          padding: "2px",
        }}
      >
        <div
          className="rounded-sm p-3"
          style={{ background: "linear-gradient(135deg, #0d0800 0%, #1a1000 100%)" }}
        >
          {/* Header */}
          <div className="text-center mb-3">
            <p className="font-mono text-[#FFD700]/60 text-[10px] tracking-[0.3em] mb-1">GOLDEN TICKET</p>
            <p className="font-display text-[#FFD700] text-sm tracking-widest">SCRATCH TO REVEAL</p>
          </div>

          {/* 3×3 grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {TILES.map((content, i) => (
              <ScratchTile
                key={i}
                revealed={revealed[i]}
                onScratch={() => handleTileScratched(i)}
                content={content}
                contentColor={TILE_COLORS[i]}
                delay={i * 80}
              />
            ))}
          </div>

          {/* Footer hint */}
          {!completed && (
            <p className="font-mono text-white/20 text-[10px] tracking-wider text-center mt-3">
              Scratch at least 5 tiles to reveal your date
            </p>
          )}
          {completed && (
            <div className="text-center mt-3">
              <p className="font-mono text-[#FFD700] text-xs tracking-widest animate-pulse">
                ✦ DATE CONFIRMED ✦
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
