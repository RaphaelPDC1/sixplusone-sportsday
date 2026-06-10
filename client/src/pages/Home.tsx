import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import AnimatedShaderHero from "@/components/ui/animated-shader-hero";
import { ShootingStarCanvas } from "@/components/ui/shooting-star-canvas";
import { AdPopup } from "@/components/AdPopup";
import { LoginModal } from "@/components/LoginModal";

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
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Set SEO title and meta description
  useEffect(() => {
    document.title = "Sports Day 002 | 6+1 Team Building Event July 2026";
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Join Sports Day 002 on July 11th 2026 in Sheffield. Register now to discover your team and compete with 6+1. Early access with Priority Player Pass.');
    
    // Set keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', 'sports day, team building, 6+1, Sheffield, July 2026, event, team competition');
  }, []);

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
      {/* Login Modal */}
      <LoginModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

      {/* Ad popup — shown 3s after load to Meta ad traffic who haven't registered */}
      <AdPopup
        variant="new_visitor"
        onCtaClick={() => navigate("/enter")}
        delay={3000}
      />

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
          <button
            onClick={() => setLoginModalOpen(true)}
            className="font-mono text-white/60 hover:text-[#FF5500] text-xs tracking-[0.2em] transition-colors"
          >
            LOG IN
          </button>
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
        subtitle="Your team is waiting. Your identity is hidden. Show up and earn it."
        buttons={{
          primary: {
            text: "REGISTER NOW →",
            onClick: () => navigate("/enter"),
          },
        }}
      />

      {/* Below-fold info strip */}
      <div className="bg-[#0A0A0A] border-t border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="font-display text-3xl text-white mb-12 tracking-widest">HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <InfoBlock
            number="01"
            title="REGISTER"
            body="Fill in your profile. Every answer shapes your team identity. No filler questions."
          />
          <InfoBlock
            number="02"
            title="GET YOUR TEAM"
            body="Unlock your reveal with a Priority Player Pass. Or refer 3 friends. Either way, earn it."
          />
          <InfoBlock
            number="03"
            title="SHOW UP"
            body="Four teams. One day. Saturday 11 July 2026. Come ready."
          />
          </div>
        </div>

        {/* Team colour strip */}
        <div className="flex h-1">
          <div className="flex-1 bg-[#E8232A]" />
          <div className="flex-1 bg-[#1A4FE8]" />
          <div className="flex-1 bg-[#F72B8C]" />
          <div className="flex-1 bg-[#FF6B00]" />
        </div>

        {/* Footer */}
        <div className="flex flex-col items-center gap-3 px-6 py-6 border-t border-white/10">
          <div className="flex items-center gap-6">
            <a href="/terms" className="font-mono text-white/30 text-xs tracking-wider hover:text-white/60 transition-colors">TERMS &amp; CONDITIONS</a>
            <span className="text-white/20 text-xs">|</span>
            <a href="/privacy" className="font-mono text-white/30 text-xs tracking-wider hover:text-white/60 transition-colors">PRIVACY POLICY</a>
          </div>
          <div className="flex items-center justify-between w-full">
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
    </div>
  );
}
