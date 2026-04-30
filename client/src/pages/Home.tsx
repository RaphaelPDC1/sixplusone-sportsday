import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import AnimatedShaderHero from "@/components/ui/animated-shader-hero";
import { ShootingStarCanvas } from "@/components/ui/shooting-star-canvas";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

function InfoBlock({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div>
      <div className="font-bebas text-4xl text-[#FF5500] mb-2">{number}</div>
      <h3 className="font-bebas text-xl text-white mb-3 tracking-wide">{title}</h3>
      <p className="font-mono text-sm text-[#999] leading-relaxed">{body}</p>
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();

  // Shooting star easter egg state
  const logoRef = useRef<HTMLImageElement>(null);
  const [starActive, setStarActive] = useState<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleNext = useCallback(() => {
    const delay = 55000 + Math.random() * 15000;
    timerRef.current = setTimeout(() => {
      const logo = logoRef.current;
      if (!logo) return;
      const rect = logo.getBoundingClientRect();
      setStarActive({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }, delay);
  }, []);

  useEffect(() => {
    // First trigger: 10–20s after load
    const initialDelay = 10000 + Math.random() * 10000;
    timerRef.current = setTimeout(() => {
      const logo = logoRef.current;
      if (!logo) return;
      const rect = logo.getBoundingClientRect();
      setStarActive({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }, initialDelay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleStarComplete = useCallback(() => {
    setStarActive(null);
    scheduleNext();
  }, [scheduleNext]);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Shooting star canvas overlay — renders above everything */}
      {starActive && (
        <ShootingStarCanvas
          logoStartX={starActive.x}
          logoStartY={starActive.y}
          onComplete={handleStarComplete}
        />
      )}

      {/* Top nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <img
          ref={logoRef}
          src={LOGO_URL}
          alt="6+1"
          id="hero-logo"
          className="h-10 w-auto"
          style={{ filter: "invert(1)" }}
        />
        <div className="flex items-center gap-4">
          <span className="font-mono text-[#FF5500] text-xs tracking-[0.3em]">
            SPORTS DAY 002
          </span>
        </div>
      </nav>

      {/* Shader Hero — full screen */}
      <AnimatedShaderHero
        trustBadge={{
          text: "REGISTRATION OPEN — 2026",
          icons: ["◈"],
        }}
        headline={{
          line1: "SPORTS DAY",
          line2: "002",
        }}
        subtitle="Get your team. Unlock your identity. Built with the people who actually want to be there."
        buttons={{
          primary: {
            text: "REGISTER NOW →",
            onClick: () => navigate("/enter"),
          },
        }}
      />

      {/* Below-fold info strip */}
      <div className="bg-[#0A0A0A] border-t border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-10">
          <InfoBlock
            number="01"
            title="REGISTER"
            body="Fill in your profile. We use every answer to build your sports day identity and assign you to a team."
          />
          <InfoBlock
            number="02"
            title="GET YOUR TEAM"
            body="Unlock your team reveal with a £10 Priority Player Pass — or earn it free by referring 3 friends."
          />
          <InfoBlock
            number="03"
            title="SHOW UP"
            body="Four teams. One day. Your identity is waiting. 2026 — date TBC based on registrations."
          />
        </div>

        {/* Team colour strip */}
        <div className="flex h-1">
          <div className="flex-1 bg-[#E8232A]" />
          <div className="flex-1 bg-[#1A4FE8]" />
          <div className="flex-1 bg-[#F72B8C]" />
          <div className="flex-1 bg-[#FF6B00]" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-6">
          <img
            src={LOGO_URL}
            alt="6+1"
            className="h-5 w-auto opacity-40"
            style={{ filter: "invert(1)" }}
          />
          <p className="font-mono text-[#333] text-xs tracking-wider">
            © 6+1 SPORTS DAY 002 — 2026
          </p>
        </div>
      </div>
    </div>
  );
}
