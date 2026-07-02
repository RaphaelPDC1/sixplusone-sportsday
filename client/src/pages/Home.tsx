import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import AnimatedShaderHero from "@/components/ui/animated-shader-hero";
import { ShootingStarCanvas } from "@/components/ui/shooting-star-canvas";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

// Registration closes at 3pm BST on 2 July 2026
// BST = UTC+1, so 3pm BST = 14:00 UTC
const CLOSE_TIME = new Date("2026-07-02T14:00:00Z");

function useCountdown(target: Date) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, target.getTime() - Date.now()));

  useEffect(() => {
    if (timeLeft <= 0) return;
    const id = setInterval(() => {
      const remaining = Math.max(0, target.getTime() - Date.now());
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(id);
  }, [target, timeLeft]);

  const closed = timeLeft <= 0;
  const hours = Math.floor(timeLeft / 3600000);
  const minutes = Math.floor((timeLeft % 3600000) / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  return { closed, hours, minutes, seconds, timeLeft };
}

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
  const { closed, hours, minutes, seconds } = useCountdown(CLOSE_TIME);

  // SEO + Meta Pixel
  useEffect(() => {
    document.title = closed
      ? "Sports Day 002 | 6+1 — Registration Closed"
      : "Sports Day 002 | 6+1 — Registration Closes Today at 3pm";

    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', closed
      ? 'Sports Day 002 — July 11th 2026, Sheffield. Registration is now closed. Already registered? Log in to access your team hub.'
      : 'Sports Day 002 — July 11th 2026, Sheffield. Registration closes today at 3pm. Already registered? Log in to access your team hub.'
    );

    if (typeof (window as any).fbq !== 'undefined') {
      (window as any).fbq('track', 'ViewContent', {
        content_name: 'Sports Day 002 Landing',
        content_type: 'product',
        value: 0.01,
        currency: 'GBP'
      });
    }
  }, [closed]);

  // Shooting star easter egg
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

  // Countdown badge text
  const countdownBadge = closed
    ? "◈ REGISTRATION CLOSED"
    : `◈ REGISTRATION CLOSES IN ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
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
          {!closed && (
            <button
              onClick={() => navigate("/holding")}
              title="Already registered? Log in"
              className="flex items-center gap-2 bg-transparent border border-[#FF5500] hover:bg-[#FF5500]/10 active:scale-95 text-[#FF5500] font-mono text-xs tracking-widest uppercase px-4 py-2 rounded font-bold transition-all"
              aria-label="Returning player login"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              ALREADY IN? →
            </button>
          )}
        </div>
      </nav>

      {/* Shader Hero — full screen */}
      <AnimatedShaderHero
        trustBadge={{
          text: countdownBadge,
          icons: [],
        }}
        headline={{
          line1: "SPORTS DAY",
          line2: "002",
        }}
        subtitle={closed
          ? "Registration is closed. If you're already in, log in below."
          : "Your team is waiting. Your identity is hidden. Show up and earn it."}
        buttons={closed
          ? {
              primary: {
                text: "ALREADY IN? LOG IN →",
                onClick: () => navigate("/holding"),
              },
            }
          : {
              primary: {
                text: "REGISTER NOW →",
                onClick: () => navigate("/enter"),
              },
              secondary: {
                text: "ALREADY IN? →",
                onClick: () => navigate("/holding"),
              },
            }
        }
      />

      {/* Below-fold info strip */}
      <div className="bg-[#0A0A0A] border-t border-[#1A1A1A]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="font-display text-3xl text-white mb-12 tracking-widest">
            {closed ? "WHAT HAPPENS NOW" : "HOW IT WORKS"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <InfoBlock
              number="01"
              title="YOUR TEAM"
              body="You've been assigned. Log in to see your teammates, your team identity, and your role."
            />
            <InfoBlock
              number="02"
              title="THE DAY"
              body="Four teams. One day. Saturday 11 July 2026. Sheffield. Come ready."
            />
            <InfoBlock
              number="03"
              title="COMPETE"
              body="Sprints, relays, tug of war, and more. One team wins. Make sure it's yours."
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
