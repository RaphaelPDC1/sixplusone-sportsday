import { useEffect, useRef, useState } from "react";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

/**
 * EntrySplash
 * Full-screen logo flash + orange particle burst played when entering a page.
 * Calls onComplete when the animation finishes so the page can reveal itself.
 *
 * Usage:
 *   const [splashDone, setSplashDone] = useState(false);
 *   if (!splashDone) return <EntrySplash onComplete={() => setSplashDone(true)} />;
 */
export function EntrySplash({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<"flash" | "explode" | "done">("flash");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("explode"), 600);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== "explode") return;
    const canvas = canvasRef.current;
    if (!canvas) { onComplete(); return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { onComplete(); return; }
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    type Particle = { x: number; y: number; vx: number; vy: number; size: number; alpha: number; color: string };
    const colors = ["#FF5500", "#FF7A2E", "#F2F0EB", "#FF5500", "#FF3300"];
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const particles: Particle[] = Array.from({ length: 80 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 8;
      return {
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 5,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    let frame: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.alpha -= 0.022;
        if (p.alpha > 0) {
          alive = true;
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, p.size, p.size);
        }
      }
      ctx.globalAlpha = 1;
      if (alive) {
        frame = requestAnimationFrame(animate);
      } else {
        setPhase("done");
        onComplete();
      }
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === "done") return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "#0A0A0A" }}
    >
      {phase === "flash" && (
        <img
          src={LOGO_URL}
          alt="6+1"
          className="w-40 h-auto"
          style={{
            filter: "invert(1)",
            animation: "splashLogoFlash 0.6s ease forwards",
          }}
        />
      )}
      {phase === "explode" && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      )}
      <style>{`
        @keyframes splashLogoFlash {
          0%   { opacity: 0; transform: scale(0.7); }
          40%  { opacity: 1; transform: scale(1.08); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
