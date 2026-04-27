import { useLocation } from "wouter";
import AnimatedShaderHero from "@/components/ui/animated-shader-hero";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Top nav bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
        <img
          src={LOGO_URL}
          alt="6+1"
          className="h-7 w-auto"
          style={{ filter: "invert(1)" }}
        />
        <span className="font-mono text-[#FF5500] text-xs tracking-[0.3em]">
          SPORTS DAY 002
        </span>
      </nav>

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
          <a
            href="/admin"
            className="font-mono text-[#222] text-xs tracking-wider hover:text-[#FF5500] transition-colors"
          >
            ADMIN
          </a>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="font-mono text-[#FF5500] text-xs tracking-widest">{number}</span>
        <div className="flex-1 h-[1px] bg-[#FF5500]/20" />
      </div>
      <h3 className="font-display text-[#F2F0EB] text-2xl tracking-widest">{title}</h3>
      <p className="font-mono text-[#555] text-xs leading-relaxed tracking-wide">{body}</p>
    </div>
  );
}
