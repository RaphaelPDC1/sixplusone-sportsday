import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

export default function Home() {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated dot grid background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animFrame: number;
    let t = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const spacing = 40;
      const cols = Math.ceil(canvas.width / spacing) + 1;
      const rows = Math.ceil(canvas.height / spacing) + 1;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * spacing;
          const y = j * spacing;
          const dist = Math.sqrt(
            Math.pow(x - canvas.width / 2, 2) + Math.pow(y - canvas.height / 2, 2)
          );
          const pulse = Math.sin(t * 0.02 - dist * 0.01) * 0.5 + 0.5;
          const alpha = pulse * 0.15 + 0.03;
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 85, 0, ${alpha})`;
          ctx.fill();
        }
      }
      t++;
      animFrame = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0A0A0A] overflow-hidden flex flex-col">
      {/* Animated dot grid */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
      />

      {/* Orange accent line — top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] bg-[#FF5500]"
        style={{ zIndex: 1 }}
      />

      {/* Content */}
      <div className="relative flex flex-col min-h-screen" style={{ zIndex: 2 }}>
        {/* Header */}
        <header className="flex items-center justify-between px-6 pt-8 pb-4">
          <img
            src={LOGO_URL}
            alt="6+1"
            className="h-10 w-auto"
            style={{ filter: "invert(1)" }}
          />
          <div className="text-[#FF5500] font-mono text-xs tracking-[0.2em] uppercase">
            Sports Day 002
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <div className="h-[1px] w-12 bg-[#FF5500]" />
            <span className="text-[#FF5500] font-mono text-xs tracking-[0.3em] uppercase">
              Registration Open
            </span>
            <div className="h-[1px] w-12 bg-[#FF5500]" />
          </div>

          {/* Main headline */}
          <h1
            className="font-display text-[#F2F0EB] leading-none mb-4"
            style={{
              fontSize: "clamp(3rem, 12vw, 8rem)",
              letterSpacing: "0.02em",
            }}
          >
            SPORTS DAY
            <br />
            <span className="text-[#FF5500]">002</span>
          </h1>

          {/* Subheadline */}
          <p
            className="font-display text-[#F2F0EB] opacity-70 mb-2"
            style={{
              fontSize: "clamp(1rem, 3.5vw, 1.8rem)",
              letterSpacing: "0.05em",
            }}
          >
            IS BEING BUILT WITH THE PEOPLE
          </p>
          <p
            className="font-display text-[#F2F0EB] opacity-70 mb-10"
            style={{
              fontSize: "clamp(1rem, 3.5vw, 1.8rem)",
              letterSpacing: "0.05em",
            }}
          >
            WHO ACTUALLY WANT TO BE THERE.
          </p>

          {/* Subtext */}
          <p className="font-mono text-[#F2F0EB] opacity-50 text-sm tracking-wider mb-12 max-w-sm">
            Enter the system. Get your team. Unlock your identity.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate("/enter")}
            className="group relative overflow-hidden bg-[#FF5500] text-[#0A0A0A] font-display px-10 py-5 text-2xl tracking-widest transition-all duration-300 hover:bg-[#F2F0EB] active:scale-95"
            style={{ letterSpacing: "0.1em" }}
          >
            <span className="relative z-10">ENTER THE SYSTEM →</span>
            <div className="absolute inset-0 bg-[#F2F0EB] translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
          </button>

          {/* Teaser */}
          <div className="mt-16 flex items-center gap-8 opacity-40">
            <div className="text-center">
              <div className="font-display text-[#FF5500] text-3xl">4</div>
              <div className="font-mono text-[#F2F0EB] text-xs tracking-wider mt-1">TEAMS</div>
            </div>
            <div className="h-8 w-[1px] bg-[#333]" />
            <div className="text-center">
              <div className="font-display text-[#FF5500] text-3xl">1</div>
              <div className="font-mono text-[#F2F0EB] text-xs tracking-wider mt-1">DAY</div>
            </div>
            <div className="h-8 w-[1px] bg-[#333]" />
            <div className="text-center">
              <div className="font-display text-[#FF5500] text-3xl">∞</div>
              <div className="font-mono text-[#F2F0EB] text-xs tracking-wider mt-1">ENERGY</div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-6 pb-8 flex items-center justify-between opacity-30">
          <span className="font-mono text-[#F2F0EB] text-xs tracking-wider">
            © 2026 6+1
          </span>
          <span className="font-mono text-[#F2F0EB] text-xs tracking-wider">
            YOUR IDENTITY IS WAITING.
          </span>
        </footer>
      </div>

      {/* Orange corner accent */}
      <div
        className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none"
        style={{
          zIndex: 1,
          background: "radial-gradient(circle at bottom right, rgba(255,85,0,0.15) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
