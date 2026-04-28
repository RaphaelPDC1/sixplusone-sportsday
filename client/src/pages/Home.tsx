import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import AnimatedShaderHero from "@/components/ui/animated-shader-hero";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { User } from "lucide-react";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

// Hook: fires the shooting star animation on the nav logo element
function useShootingStarLogo(logoRef: React.RefObject<HTMLImageElement | null>) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const triggerShootingStar = () => {
      const logo = logoRef.current;
      if (!logo) return;
      logo.classList.add("shooting-star-active");
      setTimeout(() => {
        logo.classList.remove("shooting-star-active");
        // Schedule next: 55–65 seconds
        const nextDelay = 55000 + Math.random() * 10000;
        timer = setTimeout(triggerShootingStar, nextDelay);
      }, 1200);
    };

    // First trigger: 10–20 seconds after load
    const initialDelay = 10000 + Math.random() * 10000;
    timer = setTimeout(triggerShootingStar, initialDelay);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
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
  const [loginOpen, setLoginOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const logoRef = useRef<HTMLImageElement>(null);
  useShootingStarLogo(logoRef);

  // Query to check if email exists
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
        // User found — redirect to holding page
        localStorage.setItem("userEmail", email.trim());
        setLoginOpen(false);
        navigate("/holding");
      } else {
        setLoginError("Email not found. Please register first.");
      }
    } catch (err) {
      setLoginError("Error looking up email. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
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
        <DialogContent className="bg-[#1A1A1A] border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-white font-bebas text-2xl">FIND YOUR ACCOUNT</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setLoginError("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleLogin();
              }}
              className="bg-[#0A0A0A] border-[#333] text-white placeholder-[#666]"
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
