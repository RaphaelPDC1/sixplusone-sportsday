import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BackNav } from "@/components/ui/back-nav";
import { EntrySplash } from "@/components/ui/entry-splash";
import { ParticleTextBg } from "@/components/ui/particle-text-bg";
import { ScratchCardGrid } from "@/components/ui/scratch-card";
import { toPng } from "html-to-image";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const SHOPIFY_STORE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL || "https://your-store.myshopify.com";
const SHOPIFY_VARIANT_ID = import.meta.env.VITE_SHOPIFY_VARIANT_ID || "12345678901234";

// ─── Particle text background ──────────────────────────────────────────────────
function HoldingBackground() {
  return (
    <ParticleTextBg
      words={["SPORTS DAY", "002", "GET READY", "YOUR TEAM", "AWAITS", "6+1", "JULY 2026"]}
      interval={3200}
      className="absolute inset-0 w-full h-full pointer-events-none"
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
      className="relative overflow-hidden border border-white/8 bg-black/20 backdrop-blur-sm"
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

// ─── Scratch card replay section ──────────────────────────────────────────────
function ScratchReplaySection({ visible }: { visible: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayKey, setReplayKey] = useState(0);
  const [showShareCard, setShowShareCard] = useState(false);

  const handleReplay = () => {
    setShowCard(true);
    setReplaying(true);
    setReplayKey((k) => k + 1);
    setShowShareCard(false);
  };

  const handleScratchComplete = useCallback(() => {
    setReplaying(false);
    setShowShareCard(true);
  }, []);

  const handleToggle = () => {
    setExpanded((e) => !e);
  };

  return (
    <section
      style={{
        transition: "opacity 0.7s ease 0.7s",
        opacity: visible ? 1 : 0,
      }}
    >
      <div className="border border-white/8 bg-black/15 backdrop-blur-sm overflow-hidden">
        {/* ── Header row ── always visible, tap to expand/collapse */}
        <button
          onClick={handleToggle}
          className="w-full flex items-center justify-between px-6 py-5 hover:bg-white/[0.02] transition-colors"
        >
          <div className="text-left">
            <p className="font-mono text-[#444] text-xs tracking-[0.3em] mb-0.5">YOUR GOLDEN TICKET</p>
            <p className="font-mono text-[#F2F0EB]/40 text-[10px] tracking-wider">
              {expanded ? "Tap to close" : "11 July 2026 · Scratch again or share"}
            </p>
          </div>
          {/* Chevron */}
          <div
            className="w-6 h-6 flex items-center justify-center border border-white/10 flex-shrink-0 transition-transform duration-300"
            style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1L5 5L9 1" stroke="#FF5500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </button>

        {/* ── Collapsible body ── */}
        <div
          style={{
            maxHeight: expanded ? "1200px" : "0px",
            overflow: "hidden",
            transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div className="px-6 pb-6">
            {!showCard && (
              <button
                onClick={handleReplay}
                className="w-full border border-[#FF5500]/40 text-[#FF5500] font-mono text-sm tracking-widest py-3 hover:bg-[#FF5500]/5 transition-all"
              >
                SCRATCH AGAIN
              </button>
            )}

            {showCard && (
              <div className="mt-2">
                <ScratchCardGrid
                  key={replayKey}
                  onComplete={handleScratchComplete}
                  autoReveal={!replaying}
                />
                {!replaying && (
                  <button
                    onClick={handleReplay}
                    className="w-full mt-3 border border-white/10 text-white/30 font-mono text-xs tracking-widest py-2 hover:border-[#FF5500]/30 hover:text-[#FF5500]/60 transition-all"
                  >
                    SCRATCH AGAIN
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Share card — only shown after scratch complete */}
          {showShareCard && <ShareCard />}
        </div>
      </div>
    </section>
  );
}

// ─── Shareable share card ─────────────────────────────────────────────────────
function ShareCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = "I'm in. 11 July 2026. 6+1 Sports Day 002.";
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

  const getCardPng = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const res = await fetch(dataUrl);
      return await res.blob();
    } catch {
      return null;
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await getCardPng();
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "sd002.png", { type: "image/png" })] })) {
        // Share the actual image file (mobile)
        await navigator.share({
          title: "6+1 Sports Day 002",
          text: shareText,
          files: [new File([blob], "sd002.png", { type: "image/png" })],
        });
      } else if (navigator.share) {
        await navigator.share({ title: "6+1 Sports Day 002", text: shareText, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setCopied(true);
        toast.success("Copied to clipboard.");
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      // cancelled
    } finally {
      setSharing(false);
    }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await getCardPng();
      if (!blob) { toast.error("Could not generate image."); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "6plus1-sd002.png";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Story card saved.");
    } catch {
      toast.error("Download failed.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="border-t border-white/8 bg-black/10">
      {/* ── Story card visual ── */}
      <div
        ref={cardRef}
        className="relative overflow-hidden"
        style={{
          background: "#0A0A0A",
          aspectRatio: "9/16",
          maxHeight: "340px",
        }}
      >
        {/* Full-bleed orange gradient wash */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 70%, rgba(255,85,0,0.22) 0%, transparent 70%), linear-gradient(180deg, #0A0A0A 0%, #1a0800 60%, #0A0A0A 100%)",
          }}
        />

        {/* Diagonal grid texture */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, #FF5500 0px, #FF5500 1px, transparent 1px, transparent 24px), repeating-linear-gradient(-45deg, #FF5500 0px, #FF5500 1px, transparent 1px, transparent 24px)",
          }}
        />

        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: "linear-gradient(90deg, transparent, #FF5500, transparent)" }} />

        {/* Top label */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-4">
          <span className="font-mono text-white/20 text-[9px] tracking-[0.3em]">SPORTS DAY</span>
          <img src={LOGO_URL} alt="6+1" className="h-5 w-auto opacity-60" style={{ filter: "invert(1)" }} />
          <span className="font-mono text-white/20 text-[9px] tracking-[0.3em]">002</span>
        </div>

        {/* Centre content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          {/* Overline */}
          <p className="font-mono text-[#FF5500]/70 text-[9px] tracking-[0.4em] mb-5">CONFIRMED</p>

          {/* Hero date */}
          <p
            className="font-display text-[#FF5500] leading-none"
            style={{ fontSize: "clamp(2.8rem, 14vw, 4.5rem)", textShadow: "0 0 40px rgba(255,85,0,0.5)" }}
          >
            11 JULY
          </p>
          <p
            className="font-display text-[#F2F0EB] leading-none"
            style={{ fontSize: "clamp(2rem, 10vw, 3.2rem)" }}
          >
            2026
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5 w-full max-w-[160px]">
            <div className="flex-1 h-px bg-[#FF5500]/30" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" />
            <div className="flex-1 h-px bg-[#FF5500]/30" />
          </div>

          {/* Statement */}
          <p
            className="font-display text-[#F2F0EB] leading-none mb-2"
            style={{ fontSize: "clamp(1.4rem, 7vw, 2.2rem)" }}
          >
            I'M IN.
          </p>
          <p className="font-mono text-[#F2F0EB]/35 text-[9px] tracking-[0.3em]">
            6+1 SPORTS DAY 002
          </p>
        </div>

        {/* Bottom bar */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}
        >
          <span className="font-mono text-white/20 text-[8px] tracking-[0.25em]">6PLUS1.COM</span>
          <div className="flex gap-1">
            {["#FF5500", "#1A4FE8", "#F72B8C", "#FF6B00"].map((c) => (
              <div key={c} className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <span className="font-mono text-[#FF5500]/50 text-[8px] tracking-[0.2em]">SD002</span>
        </div>
      </div>

      {/* Share actions */}
      <div className="p-5 space-y-3">
        <button
          onClick={handleShare}
          disabled={sharing || downloading}
          className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-lg tracking-widest py-4 hover:bg-[#F2F0EB] transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {sharing ? "SHARING..." : copied ? "✓ COPIED" : "SHARE TO STORY →"}
        </button>
        <button
          onClick={handleDownload}
          disabled={sharing || downloading}
          className="w-full border border-white/10 text-white/50 font-mono text-xs tracking-widest py-3 hover:border-[#FF5500]/30 hover:text-[#FF5500]/60 transition-all disabled:opacity-40"
        >
          {downloading ? "SAVING..." : "↓ DOWNLOAD STORY CARD"}
        </button>
        <p className="font-mono text-[#333] text-[10px] text-center tracking-wider">
          Share opens your share sheet. Download saves the image.
        </p>
      </div>
    </div>
  );
}

// ─── Welcome Back (no-session login screen) ───────────────────────────────────
function WelcomeBack({ onLogin }: { onLogin: (id: string) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focused, setFocused] = useState(false);

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
        sessionStorage.removeItem("holding_splash_seen");
        sessionStorage.removeItem("reveal_splash_seen");
        sessionStorage.removeItem("teamhub_splash_seen");
        sessionStorage.removeItem("came_from_teamhub");
        onLogin(result.data.id);
      } else {
        setError("No registration found for that email.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB] relative overflow-hidden flex flex-col">
      <HoldingBackground />

      {/* Top accent bar */}
      <div className="h-[2px] bg-[#FF5500] relative z-10" />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4">
        <BackNav to="/" inline />
        <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
        <span className="font-mono text-[#FF5500] text-xs tracking-[0.2em]">SPORTS DAY 002</span>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-16">
        {/* Label */}
        <p className="font-mono text-[#444] text-xs tracking-[0.3em] mb-4">RETURNING PLAYER</p>

        {/* Headline */}
        <h1
          className="font-display text-[#F2F0EB] leading-none text-center mb-2"
          style={{ fontSize: "clamp(2.8rem, 13vw, 5.5rem)" }}
        >
          WELCOME<br />
          <span className="text-[#FF5500]">BACK.</span>
        </h1>

          <p className="font-mono text-[#F2F0EB]/30 text-xs tracking-wider text-center mb-10 max-w-[260px]">
          Enter your registration email to get back in.
        </p>

        {/* Email input block */}
        <div className="w-full max-w-sm">
          <div
            className="border-b-2 transition-colors duration-300 mb-1"
            style={{ borderColor: focused ? "#FF5500" : error ? "#FF5500" : "rgba(255,255,255,0.15)" }}
          >
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="YOUR EMAIL"
              className="w-full bg-transparent outline-none text-[#F2F0EB] font-mono text-lg py-3 placeholder:text-white/15 tracking-wider"
            />
          </div>
          {error && (
            <p className="font-mono text-[#FF5500] text-xs tracking-wider mt-2 mb-0">{error}</p>
          )}
          {!error && <div className="h-5" />}

          <button
            onClick={handleSubmit}
            disabled={loading || !email.trim()}
            className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-xl tracking-widest py-4 mt-2 hover:bg-[#F2F0EB] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "CHECKING..." : "GET BACK IN →"}
          </button>

          <div className="mt-6 text-center">
            <a
              href="/enter"
              className="font-mono text-[#444] text-xs tracking-[0.2em] hover:text-[#FF5500] transition-colors"
            >
              Not registered? → ENTER THE SYSTEM
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Holding Page ─────────────────────────────────────────────────────────────
export default function Holding() {
  const [, navigate] = useLocation();
  // Initialise directly from localStorage so no-session state is known on first render (no blank flash)
  const [userId, setUserId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("sd_user_id") : null)
  );
  const [copied, setCopied] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  // Show splash only once per session — only when user HAS a session
  const [showSplash, setShowSplash] = useState(
    () => {
      if (typeof window === "undefined") return false;
      const hasSession = !!localStorage.getItem("sd_user_id");
      return hasSession && sessionStorage.getItem("holding_splash_seen") !== "true";
    }
  );
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const handleSplashComplete = () => {
    sessionStorage.setItem("holding_splash_seen", "true");
    setShowSplash(false);
  };

  useEffect(() => {
    if (!userId) return;
    // Delay hero fade-in until after splash completes
    const splashDone = sessionStorage.getItem("holding_splash_seen") === "true";
    const delay = splashDone ? 120 : 1800; // wait for splash if first visit
    const t = setTimeout(() => setHeroVisible(true), delay);
    return () => clearTimeout(t);
  }, [userId]);

  const { data: user, isLoading, error } = trpc.sportsday.getUserStatus.useQuery(
    { id: userId! },
    {
      enabled: !!userId,
      refetchInterval: 15000,
      retry: false,
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
  // Suppress redirect if user just navigated back from TeamHub (they chose to be here)
  useEffect(() => {
    if (!user) return;
    const cameFromTeamHub = sessionStorage.getItem("came_from_teamhub") === "1";
    if (cameFromTeamHub) {
      sessionStorage.removeItem("came_from_teamhub");
      return;
    }
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
      toast.success("Link copied.");
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

  // ── No userId in localStorage — show Welcome Back login screen ──
  if (!userId) {
    return <WelcomeBack onLogin={(id) => { setUserId(id); }} />;
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
      {/* Full-page particle text background — fixed behind all content */}
      <ParticleTextBg
        words={["SPORTS DAY", "002", "GET READY", "YOUR TEAM", "AWAITS", "6+1", "JULY 2026"]}
        interval={3200}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

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
        <span className="font-mono text-[#FF5500] text-xs tracking-[0.2em]">SPORTS DAY 002</span>
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
            <p className="font-mono text-[#444] text-xs tracking-[0.35em] mb-3">YOU'RE REGISTERED</p>
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
          <div className="border border-white/8 bg-black/15 backdrop-blur-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <p className="font-mono text-[#444] text-xs tracking-[0.3em]">YOUR PROFILE</p>
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

        {/* ── Section 4: Scratch Card Replay + Share ── */}
        <ScratchReplaySection visible={heroVisible} />

        {/* ── Particle breathing space ── */}
        <div aria-hidden="true" style={{ height: "40vh", pointerEvents: "none" }} />

        {/* ── Section 5: Unlock CTA ── */}
        <section
          style={{
            transition: "opacity 0.7s ease 0.9s",
            opacity: heroVisible ? 1 : 0,
          }}
        >
          <div className="relative border border-[#FF5500]/20 bg-black/20 backdrop-blur-sm overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF5500]/50 to-transparent" />
            <div className="p-6">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                <p className="font-mono text-[#444] text-xs tracking-[0.3em]">LIMITED ACCESS</p>
              </div>
              <h2 className="font-display text-[#FF5500] text-2xl tracking-widest mb-5">
                PRIORITY PLAYER PASS
              </h2>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Instant team reveal",
                  "Custom team-colour shirt",
                  "Early merch access",
                  "Sponsor drops",
                  "Priority event access",
                  "First into the dashboard",
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
                Limited passes. Once they're gone, you wait for public allocation.
              </p>
            </div>
          </div>
        </section>

        {/* ── Section 6: Referral Block ── */}
        <section
          style={{
            transition: "opacity 0.7s ease 1.1s",
            opacity: heroVisible ? 1 : 0,
          }}
        >
          <div className="border border-white/8 bg-black/15 backdrop-blur-sm p-6">
            <p className="font-mono text-[#444] text-xs tracking-[0.3em] mb-4">BRING YOUR PEOPLE</p>
            <p className="font-mono text-[#F2F0EB]/80 text-sm tracking-wider mb-1">
              Refer 3 friends. Earn your unlock.
            </p>
            <p className="font-mono text-[#444] text-xs tracking-wider mb-4">
              Reward: merch discount + priority captain vote
            </p>
            <div className="bg-black/15 border border-white/8 p-3 mb-3">
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

    </div>
  );
}
