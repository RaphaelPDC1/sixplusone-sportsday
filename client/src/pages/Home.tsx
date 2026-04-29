import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import AnimatedShaderHero from "@/components/ui/animated-shader-hero";
import { ShootingStarCanvas } from "@/components/ui/shooting-star-canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { User } from "lucide-react";

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
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

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

  // Email lookup query
  const checkEmailQuery = trpc.sportsday.checkEmailExists.useQuery(
    { email: email.trim() },
    { enabled: false }
  );

  const handleLogin = async () => {
    if (!email.trim()) {
      setLoginError("Please enter your email");
      return;
    }
    setLoginLoading(true);
    setLoginError("");
    try {
      const result = await checkEmailQuery.refetch();
      if (result.data?.exists) {
        localStorage.setItem("userEmail", email.trim());
        setLoginOpen(false);
        navigate("/holding");
      } else {
        setLoginError("Email not found. Please register first.");
      }
    } catch {
      setLoginError("Error looking up email. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

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
          <button
            onClick={() => setLoginOpen(true)}
            className="p-2 hover:bg-[#1A1A1A] rounded-lg transition-colors"
            title="Login"
          >
            <User className="w-5 h-5 text-[#FF5500]" />
          </button>
        </div>
      </nav>

      {/* Login Dialog */}
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent
          className="bg-[#1A1A1A] border-[#333]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-white font-bebas text-2xl">FIND YOUR ACCOUNT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLoginError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
              className="w-full bg-[#0A0A0A] border border-[#333] text-white placeholder-[#666] rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#FF5500] transition-colors"
            />
            {loginError && <p className="text-[#FF5500] text-sm">{loginError}</p>}
            <Button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full bg-[#FF5500] hover:bg-[#FF6B1A] text-white font-bebas tracking-wide"
            >
              {loginLoading ? "LOOKING UP..." : "FIND MY ACCOUNT"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shader Hero — full screen */}
      <AnimatedShaderHero
        trustBadge={{
          text: "REGISTRATION OPEN — JULY 2025",
          icons: ["◈"],
        }}
        headline={{
          line1: "SPORTS DAY",
          line2: "002",
        }}
        subtitle="Enter the system. Get your team. Unlock your identity. Built with the people who actually want to be there."
        buttons={{
          primary: {
            text: "ENTER THE SYSTEM →",
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
            body="Four teams. One day. Your identity is waiting. July 2025 — date TBC based on registrations."
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
            © 6+1 SPORTS DAY 002
          </p>
        </div>
      </div>
    </div>
  );
}
