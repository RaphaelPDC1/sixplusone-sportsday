import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BackNav } from "@/components/ui/back-nav";
import { EntrySplash } from "@/components/ui/entry-splash";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";


const SHOPIFY_STORE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL || "https://your-store.myshopify.com";
const SHOPIFY_VARIANT_ID = import.meta.env.VITE_SHOPIFY_VARIANT_ID || "12345678901234";

// ─── Animated orb background ─────────────────────────────────────────────────
function HoldingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    type Orb = { x: number; y: number; r: number; vx: number; vy: number; alpha: number };
    const orbs: Orb[] = Array.from({ length: 4 }, () => ({
      x: Math.random() * (canvas.width || 400),
      y: Math.random() * (canvas.height || 800),
      r: 100 + Math.random() * 180,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      alpha: 0.025 + Math.random() * 0.04,
    }));

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      for (const orb of orbs) {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -orb.r) orb.x = w + orb.r;
        if (orb.x > w + orb.r) orb.x = -orb.r;
        if (orb.y < -orb.r) orb.y = h + orb.r;
        if (orb.y > h + orb.r) orb.y = -orb.r;
        const hex = Math.round(orb.alpha * 255).toString(16).padStart(2, "0");
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        grad.addColorStop(0, `#FF5500${hex}`);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let current = 0;
    const step = () => {
      current += Math.ceil((value - current) / 6);
      setDisplay(current);
      if (current < value) requestAnimationFrame(step);
    };
    if (value > 0) requestAnimationFrame(step);
  }, [value]);
  return <>{display}</>;
}

// ─── Status block ─────────────────────────────────────────────────────────────
function StatusBlock({ visible }: { visible: boolean }) {
  return (
    <div
      className="relative overflow-hidden border border-white/8 bg-black/60 backdrop-blur-sm"
      style={{
        transition: "opacity 0.8s ease 0.5s, transform 0.8s ease 0.5s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
      }}
    >
      {/* Animated top border */}
      <div
        className="absolute top-0 left-0 h-[2px] bg-[#FF5500]"
        style={{
          width: visible ? "100%" : "0%",
          transition: "width 1.4s ease 0.8s",
        }}
      />

      <div className="p-6 space-y-4">
        <StatusRow label="REGISTRATION" value="COMPLETE" valueColor="#22c55e" delay={0} visible={visible} />
        <div className="h-px bg-white/5" />
        <StatusRow label="TEAM ASSIGNED" value="HIDDEN" valueColor="#FF5500" delay={200} visible={visible} blink />
        <div className="h-px bg-white/5" />
        <StatusRow label="REVEAL STATUS" value="LOCKED" valueColor="#444" delay={400} visible={visible} />
      </div>

      <div
        className="border-t border-white/8 px-6 py-4 bg-white/[0.02]"
        style={{
          transition: "opacity 0.6s ease 1.2s",
          opacity: visible ? 1 : 0,
        }}
      >
        <div className="flex items-center justify-between">
          <p className="font-mono text-[#F2F0EB] text-sm tracking-[0.25em]">YOUR TEAM IS WAITING.</p>
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-[#FF5500]"
                style={{ animation: `pulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  value,
  valueColor,
  delay,
  visible,
  blink = false,
}: {
  label: string;
  value: string;
  valueColor: string;
  delay: number;
  visible: boolean;
  blink?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        transition: `opacity 0.5s ease ${0.9 + delay / 1000}s, transform 0.5s ease ${0.9 + delay / 1000}s`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-8px)",
      }}
    >
      <span className="font-mono text-[#444] text-xs tracking-[0.2em]">{label}</span>
      <span
        className="font-mono text-xs tracking-[0.2em]"
        style={{
          color: valueColor,
          animation: blink ? "pulse 2s ease-in-out infinite" : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Login modal ──────────────────────────────────────────────────────────────
function LoginModal({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkQuery = trpc.sportsday.checkEmailExists.useQuery(
    { email: email.trim() },
    { enabled: false }
  );

  const handleSubmit = async () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await checkQuery.refetch();
      if (result.data?.exists && result.data?.id) {
        localStorage.setItem("sd_user_id", result.data.id);
        localStorage.setItem("userEmail", trimmed);
        onClose();
        navigate("/holding");
      } else {
        setError("Email not found. Not registered yet?");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-5">
      <div className="w-full max-w-sm bg-[#0D0D0D] border border-white/10 p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/30 hover:text-white/70 font-mono text-sm transition-colors"
        >
          ✕
        </button>
        <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-2">RETURNING PLAYER</p>
        <h2 className="font-display text-[#F2F0EB] text-3xl tracking-widest mb-2">LOG IN</h2>
        <p className="font-mono text-[#444] text-xs tracking-wider mb-6">
          Enter your registration email to access your profile.
        </p>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="your@email.com"
          className="w-full bg-transparent border-b-2 border-white/20 focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-lg py-3 placeholder:text-white/20 transition-colors mb-2"
        />
        {error && <p className="font-mono text-[#FF5500] text-xs mb-4">{error}</p>}
        {!error && <div className="mb-4" />}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-xl tracking-widest py-4 hover:bg-[#F2F0EB] transition-colors disabled:opacity-50"
        >
          {loading ? "CHECKING..." : "LOG IN →"}
        </button>
        <div className="mt-4 text-center">
          <a href="/enter" className="font-mono text-[#444] text-xs tracking-wider hover:text-[#FF5500] transition-colors">
            Not registered yet? → ENTER THE SYSTEM
          </a>
        </div>
      </div>
    </div>
  );
}
// ─── Main Holding Page ─────────────────────────────────────────────────────────────
export default function Holding() {
  const [, navigate] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  // Show splash only once per session
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem("holding_splash_seen") !== "true"
  );
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const handleSplashComplete = () => {
    sessionStorage.setItem("holding_splash_seen", "true");
    setShowSplash(false);
  };

  useEffect(() => {
    const id = localStorage.getItem("sd_user_id");
    if (!id) return; // Don't redirect — show "find my spot" state
    setUserId(id);
    // Delay hero fade-in until after splash completes
    const splashDone = sessionStorage.getItem("holding_splash_seen") === "true";
    const delay = splashDone ? 120 : 1800; // wait for splash if first visit
    const t = setTimeout(() => setHeroVisible(true), delay);
    return () => clearTimeout(t);
  }, []);

  const { data: user, isLoading, error } = trpc.sportsday.getUserStatus.useQuery(
    { id: userId! },
    {
      enabled: !!userId,
      refetchInterval: 15000,
      retry: false, // Don't retry on NOT_FOUND — prevents console spam
    }
  );

  // If the stored ID no longer exists in the DB, clear it and show "find my spot"
  useEffect(() => {
    if (!error) return;
    const code = (error as { data?: { code?: string } }).data?.code;
    if (code === "NOT_FOUND") {
      localStorage.removeItem("sd_user_id");
      setUserId(null);
    }
  }, [error]);

  // Fix: use ref-based navigate to avoid stale closure / setState-in-render
  useEffect(() => {
    if (!user) return;
    if (user.revealStatus === "unlocked") {
      if (user.revealSeen) {
        navigateRef.current("/team-hub");
      } else {
        navigateRef.current("/reveal");
      }
    }
  }, [user?.revealStatus, user?.revealSeen]); // eslint-disable-line react-hooks/exhaustive-deps

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = user?.referralCode ? `${appUrl}/r/${user.referralCode}` : "";

  const copyReferralLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — try manually.");
    }
  };

  const handleUnlock = () => {
    if (!user) return;
    const returnUrl = `${appUrl}/unlock/success?uid=${user.id}`;
    const checkoutUrl = `${SHOPIFY_STORE_URL}/cart/${SHOPIFY_VARIANT_ID}:1?checkout[email]=${encodeURIComponent(user.email)}&return_to=${encodeURIComponent(returnUrl)}`;
    window.location.href = checkoutUrl;
  };

  // ── No userId in localStorage — show "find my spot" state ──
  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB] relative overflow-hidden">
        <HoldingBackground />
        <div className="h-[2px] bg-[#FF5500] relative z-10" />
        <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
          <BackNav to="/" inline />
          <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
          <button
            onClick={() => setShowLogin(true)}
            className="flex items-center gap-2 font-mono text-[#F2F0EB]/40 hover:text-[#FF5500] text-xs tracking-[0.2em] transition-colors"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            FIND MY SPOT
          </button>
        </header>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-5 text-center">
          <p className="font-mono text-[#444] text-xs tracking-[0.3em] mb-4">SPORTS DAY 002</p>
          <h1 className="font-display text-[#F2F0EB] leading-none mb-4" style={{ fontSize: "clamp(3rem, 14vw, 6rem)" }}>
            ALREADY<br />
            <span className="text-[#FF5500]">REGISTERED?</span>
          </h1>
          <p className="font-mono text-[#F2F0EB]/40 text-sm tracking-wider mb-8 max-w-xs">
            Use the link from your registration email, or find your spot below.
          </p>
          <button
            onClick={() => setShowLogin(true)}
            className="bg-[#FF5500] text-[#0A0A0A] font-display text-xl tracking-widest px-10 py-4 hover:bg-[#F2F0EB] transition-colors mb-4"
          >
            FIND MY SPOT →
          </button>
          <a href="/enter" className="font-mono text-[#444] text-xs tracking-wider hover:text-[#FF5500] transition-colors">
            Not registered yet? → ENTER THE SYSTEM
          </a>
        </div>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
        {showSplash && <EntrySplash onComplete={handleSplashComplete} />}
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FF5500] font-display text-3xl tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  const firstName = user.fullName.split(" ")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB] relative overflow-hidden">
      {showSplash && <EntrySplash onComplete={handleSplashComplete} />}
      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      <HoldingBackground />

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.025) 2px, rgba(0,0,0,0.025) 4px)",
          zIndex: 1,
        }}
      />

      {/* Top accent */}
      <div className="h-[2px] bg-[#FF5500] relative z-10" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
        <BackNav to="/" inline />
        <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
        <div className="flex items-center gap-4">
          <span className="font-mono text-[#FF5500] text-xs tracking-[0.2em]">SPORTS DAY 002</span>
          <button
            onClick={() => setShowLogin(true)}
            title="Switch account"
            className="text-white/20 hover:text-[#FF5500] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        </div>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-16 space-y-8">

        {/* ── Section 1: Hero Greeting ── */}
        <section className="pt-8">
          <div
            style={{
              transition: "opacity 0.9s ease, transform 0.9s ease",
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(24px)",
            }}
          >
            <p className="font-mono text-[#444] text-xs tracking-[0.35em] mb-3">YOU'RE IN THE SYSTEM</p>
            <h1
              className="font-display text-[#F2F0EB] leading-[0.88] mb-5"
              style={{ fontSize: "clamp(3.2rem, 14vw, 6.5rem)" }}
            >
              WELCOME<br />
              <span
                className="text-[#FF5500]"
                style={{
                  display: "inline-block",
                  transition: "opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s",
                  opacity: heroVisible ? 1 : 0,
                  transform: heroVisible ? "translateX(0)" : "translateX(-12px)",
                }}
              >
                {firstName}.
              </span>
            </h1>
            {user.profileTagline && (
              <p
                className="font-mono text-[#F2F0EB]/55 text-sm tracking-wider leading-relaxed max-w-sm"
                style={{
                  transition: "opacity 0.7s ease 0.8s",
                  opacity: heroVisible ? 1 : 0,
                }}
              >
                {user.profileTagline}
              </p>
            )}
          </div>
        </section>

        {/* ── Section 2: Profile Badge ── */}
        <section
          style={{
            transition: "opacity 0.7s ease 0.35s",
            opacity: heroVisible ? 1 : 0,
          }}
        >
          <div className="border border-white/8 bg-black/50 backdrop-blur-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="font-mono text-[#444] text-xs tracking-[0.3em]">PLAYER PROFILE</p>
              <span className="font-mono text-[#FF5500] text-xs tracking-wider">
                {user.sportsDayProfile?.replace(/_/g, " ").toUpperCase() ?? "COMPETITOR"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "NAME", value: user.fullName.toUpperCase() },
                { label: "STATUS", value: "REGISTERED", color: "#FF5500" },
                { label: "TEAM", value: "CLASSIFIED", color: "#444" },
                { label: "ACCESS", value: user.paymentStatus === "paid" ? "PRIORITY" : "STANDARD", color: user.paymentStatus === "paid" ? "#22c55e" : "#444" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <p className="font-mono text-[#333] text-[10px] tracking-[0.2em] mb-1">{label}</p>
                  <p className="font-mono text-sm tracking-wider" style={{ color: color ?? "#F2F0EB" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3: Status Block ── */}
        <section>
          <StatusBlock visible={heroVisible} />
        </section>

        {/* ── Section 4: Unlock CTA ── */}
        <section
          style={{
            transition: "opacity 0.7s ease 0.9s",
            opacity: heroVisible ? 1 : 0,
          }}
        >
          <div className="relative border border-[#FF5500]/20 bg-black/60 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF5500]/50 to-transparent" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                <p className="font-mono text-[#444] text-xs tracking-[0.3em]">LIMITED ACCESS</p>
              </div>
              <h2 className="font-display text-[#FF5500] text-2xl tracking-widest mb-5">
                PRIORITY PLAYER PASS — £10
              </h2>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Instant team reveal",
                  "Custom team-colour shirt (early drop)",
                  "Early merch access",
                  "Sponsor goodies",
                  "Priority access to event release",
                  "First access to dashboard",
                  "Early announcements",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 font-mono text-[#F2F0EB]/65 text-xs tracking-wider">
                    <span className="text-[#FF5500] mt-0.5 shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleUnlock}
                className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-2xl tracking-widest py-5 hover:bg-[#F2F0EB] transition-all active:scale-[0.98]"
              >
                UNLOCK MY TEAM →
              </button>
              <p className="font-mono text-[#333] text-xs text-center mt-3 tracking-wider">
                Priority Player Passes are limited. Once early reveals close, you'll wait for public allocation.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 5: Referral Block ── */}
        <section
          style={{
            transition: "opacity 0.7s ease 1.1s",
            opacity: heroVisible ? 1 : 0,
          }}
        >
          <div className="border border-white/8 bg-black/50 backdrop-blur-sm p-6">
            <p className="font-mono text-[#444] text-xs tracking-[0.3em] mb-4">BRING YOUR PEOPLE</p>
            <p className="font-mono text-[#F2F0EB]/80 text-sm tracking-wider mb-1">
              Invite 3 friends to join the Sports Day 002 list.
            </p>
            <p className="font-mono text-[#444] text-xs tracking-wider mb-4">
              Reward: extra merch discount + priority captain vote access
            </p>
            <div className="bg-black/60 border border-white/8 p-3 mb-3">
              <p className="font-mono text-[#FF5500] text-xs tracking-wider break-all">
                {referralLink || "Generating your link..."}
              </p>
            </div>
            <button
              onClick={copyReferralLink}
              className={`w-full border font-mono text-sm tracking-widest py-3 transition-all ${
                copied
                  ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/5"
                  : "border-white/10 text-[#F2F0EB]/50 hover:border-[#FF5500] hover:text-[#FF5500]"
              }`}
            >
              {copied ? "✓ COPIED" : "COPY REFERRAL LINK"}
            </button>
            {(user.referralCount ?? 0) > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-1 transition-colors duration-500"
                      style={{
                        width: "2rem",
                        background: n <= (user.referralCount ?? 0) ? "#FF5500" : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[#444] text-xs tracking-wider">
                  <AnimatedNumber value={user.referralCount ?? 0} />/3
                  {user.referralRewardUnlocked && " — REWARD UNLOCKED"}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
    </div>
  );
}
