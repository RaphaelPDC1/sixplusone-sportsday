import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BackNav } from "@/components/ui/back-nav";
import { EntrySplash } from "@/components/ui/entry-splash";
import { ParticleTextBg } from "@/components/ui/particle-text-bg";
import { ScratchCardGrid } from "@/components/ui/scratch-card";
import { toPng } from "html-to-image";

const LOGO_URL = "/manus-storage/logo-61_bea00c75.webp";

// Stripe checkout is now used instead of Shopify

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

// ─── Unlock counter ───────────────────────────────────────────────────────────
function UnlockCounter({ visible }: { visible: boolean }) {
  const { data: stats } = trpc.sportsday.unlockStats.useQuery(undefined, {
    refetchInterval: 5000,
  });
  
  if (!stats) return null;
  
  return (
    <div
      className="mt-3 pt-3 border-t border-white/8"
      style={{
        transition: "opacity 0.5s ease 1.4s",
        opacity: visible ? 1 : 0,
      }}
    >
      <p className="font-mono text-[#F2F0EB] text-xs tracking-[0.2em] mb-2">
        <AnimatedNumber value={stats.total} /> HAVE UNLOCKED THEIR TEAM
      </p>
      <div className="flex gap-2 text-xs font-mono tracking-[0.15em]">
        <span className="text-[#FF4444]">RED: <AnimatedNumber value={stats.teams.red} /></span>
        <span className="text-[#4488FF]">BLUE: <AnimatedNumber value={stats.teams.blue} /></span>
        <span className="text-[#FF88CC]">PINK: <AnimatedNumber value={stats.teams.pink} /></span>
        <span className="text-[#FF8800]">ORANGE: <AnimatedNumber value={stats.teams.orange} /></span>
      </div>
    </div>
  );
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
        <UnlockCounter visible={visible} />
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
              {expanded ? "Tap to close" : "11 July 2026 · Your confirmed spot"}
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
            maxHeight: expanded ? "9999px" : "0px",
            overflow: "hidden",
            transition: "max-height 0.45s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <div className="px-6 pb-6">
            {!showCard && (
              <div className="space-y-4">
                {/* Teaser copy */}
                <div className="border border-[#FF5500]/20 bg-[#FF5500]/5 px-4 py-4 space-y-1">
                  <p className="font-mono text-[#FF5500] text-xs tracking-[0.25em]">YOUR TICKET IS LIVE.</p>
                  <p className="font-mono text-[#F2F0EB]/50 text-[10px] tracking-wider leading-relaxed">
                    Scratch the card to reveal your confirmed date. Share it. Flex it.
                  </p>
                </div>
                {/* Bold CTA */}
                <button
                  onClick={handleReplay}
                  className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-base tracking-widest py-4 hover:bg-[#F2F0EB] transition-all active:scale-[0.98]"
                >
                  REVEAL YOUR TICKET →
                </button>
              </div>
            )}

            {showCard && (
              <div className="mt-2 relative">
                <ScratchCardGrid
                  key={replayKey}
                  onComplete={handleScratchComplete}
                  autoReveal={!replaying}
                />
                {/* Tap-to-scratch prompt — only shown while actively replaying (before first scratch) */}
                {replaying && (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-4"
                    style={{ zIndex: 20 }}
                  >
                    <div
                      className="flex items-center gap-2 px-4 py-2 rounded-full"
                      style={{
                        background: "rgba(10,10,10,0.75)",
                        border: "1px solid rgba(255,85,0,0.35)",
                        backdropFilter: "blur(6px)",
                        animation: "pulse 1.8s ease-in-out infinite",
                      }}
                    >
                      {/* Finger tap icon */}
                      <svg width="14" height="18" viewBox="0 0 14 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 1C5.9 1 5 1.9 5 3V9.5C4.4 9.2 3.7 9 3 9C1.9 9 1 9.9 1 11C1 13.8 3.2 17 7 17C10.8 17 13 13.8 13 11V5C13 3.9 12.1 3 11 3C10.6 3 10.3 3.1 10 3.3C9.7 2 8.5 1 7 1Z" stroke="#FF5500" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="font-mono text-[#FF5500] text-[10px] tracking-[0.25em]">TAP &amp; DRAG TO SCRATCH</span>
                    </div>
                  </div>
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
const SHARE_CARD_URL = "/manus-storage/share-card-sd002_9d2fded2.png";

function ShareCard() {
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = "I'm in. 11 July 2026. 6+1 Sports Day 002.";
  const shareUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Fetch the hosted image as a Blob for native file sharing / download
  const getCardBlob = async (): Promise<Blob | null> => {
    try {
      const res = await fetch(SHARE_CARD_URL);
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const blob = await getCardBlob();
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], "sd002.png", { type: "image/png" })] })) {
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
      const blob = await getCardBlob();
      if (!blob) { toast.error("Could not fetch image."); return; }
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
    <div className="border-t border-white/8 bg-black/10 p-5 space-y-4">
      <p className="font-mono text-[#444] text-[10px] tracking-[0.3em]">SHARE YOUR SPOT</p>

      {/* ── Story card image — full natural height, no cropping ── */}
      <img
        src={SHARE_CARD_URL}
        alt="6+1 Sports Day 002 — 11 July 2026"
        className="w-full block rounded-sm"
        style={{ height: "auto" }}
      />

      {/* Actions */}
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
        className="w-full border border-white/10 text-white/40 font-mono text-xs tracking-widest py-3 hover:border-[#FF5500]/30 hover:text-[#FF5500]/60 transition-all disabled:opacity-40"
      >
        {downloading ? "SAVING..." : "↓ DOWNLOAD STORY CARD"}
      </button>
      <p className="font-mono text-[#333] text-[10px] text-center tracking-wider">
        Share opens your share sheet. Download saves the image.
      </p>
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
        {/* Logo absolutely centred so it's not pushed by unequal side elements */}
        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
          <img src={LOGO_URL} alt="6+1" className="h-12 w-auto pointer-events-auto" style={{ filter: "invert(1)" }} />
        </div>
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

// ─── Teammate Cards (for unlocked users) ─────────────────────────────────────
function TeammateCards({ teammates }: { teammates: Array<{
  status: string;
  id?: string;
  displayName: string;
  sportsDayProfile?: string | null;
  profileTagline?: string | null;
  photoUrl?: string | null;
  message?: string;
}> }) {
  if (teammates.length === 0) {
    return (
      <div className="border border-white/8 bg-black/15 p-5 text-center">
        <p className="font-mono text-[#444] text-xs tracking-wider">Your teammates will appear here as they unlock.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {teammates.map((tm, i) => (
        <div
          key={tm.status === "visible" ? tm.id : `locked-${i}`}
          className="border border-white/8 bg-black/15 backdrop-blur-sm p-4"
        >
          {tm.status === "visible" ? (
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#FF5500]/20 border border-[#FF5500]/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {tm.photoUrl ? (
                  <img src={tm.photoUrl} alt={tm.displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-[#FF5500] text-sm">{tm.displayName.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-mono text-[#F2F0EB] text-sm tracking-wider">{tm.displayName.toUpperCase()}</p>
                {tm.sportsDayProfile && (
                  <p className="font-mono text-[#FF5500] text-xs tracking-wider mt-0.5">{tm.sportsDayProfile.toUpperCase()}</p>
                )}
                {tm.profileTagline && (
                  <p className="font-mono text-[#444] text-[10px] tracking-wider mt-1 leading-relaxed">{tm.profileTagline}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              {/* Locked avatar */}
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <svg width="14" height="17" viewBox="0 0 14 17" fill="none">
                  <rect x="1" y="7" width="12" height="9" rx="1.5" stroke="#444" strokeWidth="1.2"/>
                  <path d="M4 7V5C4 3.34 5.34 2 7 2C8.66 2 10 3.34 10 5V7" stroke="#444" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="font-mono text-[#333] text-sm tracking-wider">TEAMMATE LOCKED</p>
                <p className="font-mono text-[#222] text-[10px] tracking-wider mt-0.5">
                  This player has not unlocked their Priority Player Pack yet.
                </p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Countdown display ────────────────────────────────────────────────────────
function CountdownBadge({ countdownMs }: { countdownMs: number }) {
  const [remaining, setRemaining] = useState(countdownMs);
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (remaining <= 0) return null;

  return (
    <div className="flex items-center gap-3 border border-[#FF5500]/20 bg-[#FF5500]/5 px-4 py-2">
      <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse flex-shrink-0" />
      <p className="font-mono text-[#FF5500] text-xs tracking-wider">
        EARLY PRICE ENDS IN {days > 0 ? `${days}D ` : ""}{hours}H {mins}M
      </p>
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
  // Webhook delay polling: true when user returns from Stripe but webhook hasn't fired yet
  const [awaitingWebhook, setAwaitingWebhook] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("session_id") && !params.has("cancelled");
  });
  // Cancelled checkout: show soft copy
  const [showCancelledMessage, setShowCancelledMessage] = useState(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("cancelled") === "true";
  });

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

  // SECURITY: Use backend-led dashboard — never derive locked/unlocked from frontend state
  const { data: dashboard, isLoading, error, refetch } = trpc.sportsday.getSportsDayDashboard.useQuery(
    { registrationId: userId! },
    {
      enabled: !!userId,
      // Poll every 15s normally; every 3s when awaiting webhook confirmation
      refetchInterval: awaitingWebhook ? 3000 : 15000,
      retry: false,
      retryOnMount: false,
      throwOnError: false,
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

  // Redirect when dashboard state becomes UNLOCKED_PRIORITY or PUBLIC_REVEAL
  useEffect(() => {
    if (!dashboard) return;
    const cameFromTeamHub = sessionStorage.getItem("came_from_teamhub") === "1";
    if (cameFromTeamHub) {
      sessionStorage.removeItem("came_from_teamhub");
      return;
    }
    if (dashboard.state === "UNLOCKED_PRIORITY" || dashboard.state === "PUBLIC_REVEAL") {
      // Stop webhook polling once unlocked
      setAwaitingWebhook(false);
      if (dashboard.revealSeen) {
        navigateRef.current("/team-hub");
      } else {
        navigateRef.current("/reveal");
      }
    }
  }, [dashboard?.state, dashboard?.revealSeen]); // eslint-disable-line react-hooks/exhaustive-deps

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = dashboard?.referralCode ? `${appUrl}/r/${dashboard.referralCode}` : "";

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

  const createCheckout = trpc.sportsday.createStripeCheckout.useMutation();

  const handleUnlock = async () => {
    if (!dashboard || !userId) return;
    try {
      const result = await createCheckout.mutateAsync({ uid: userId });
      if (result.checkoutUrl) {
        // Start polling for webhook confirmation immediately
        setAwaitingWebhook(true);
        window.open(result.checkoutUrl, "_blank");
        toast.success("Redirecting to checkout...");
      }
    } catch (err: any) {
      // SAFEGUARD: If already unlocked, redirect to dashboard
      if (err?.data?.code === "CONFLICT" || err?.message?.includes("ALREADY_UNLOCKED")) {
        toast.success("You're already unlocked! Redirecting...");
        refetch();
        return;
      }
      toast.error("Failed to create checkout session. Please try again.");
      console.error(err);
    }
  };

  // ── No userId in localStorage — show Welcome Back login screen ──
  if (!userId) {
    return <WelcomeBack onLogin={(id) => { setUserId(id); }} />;
  }

  if (isLoading || !dashboard) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FF5500] font-display text-3xl tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  const firstName = dashboard.fullName.split(" ")[0].toUpperCase();
  const isLocked = dashboard.state === "LOCKED_UNPAID" || dashboard.state === "RETURNING_UNPAID";
  const isReturning = dashboard.state === "RETURNING_UNPAID";
  const { priceState } = dashboard;

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
        <div className="absolute inset-x-0 flex justify-center pointer-events-none">
          <img src={LOGO_URL} alt="6+1" className="h-12 w-auto pointer-events-auto" style={{ filter: "invert(1)" }} />
        </div>
        <span className="font-mono text-[#FF5500] text-xs tracking-[0.2em]">SPORTS DAY 002</span>
      </header>

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-16 space-y-8">

        {/* ── Webhook delay banner ── */}
        {awaitingWebhook && (
          <div className="border border-[#FF5500]/40 bg-[#FF5500]/10 px-5 py-4 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse flex-shrink-0" />
            <div>
              <p className="font-mono text-[#FF5500] text-xs tracking-wider">PAYMENT RECEIVED.</p>
              <p className="font-mono text-[#F2F0EB]/50 text-[10px] tracking-wider mt-0.5">
                We're confirming your unlock now — this usually takes a few seconds.
              </p>
            </div>
          </div>
        )}

        {/* ── Cancelled checkout soft message ── */}
        {showCancelledMessage && (
          <div className="border border-white/10 bg-white/[0.03] px-5 py-4 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-white/20 mt-1 flex-shrink-0" />
            <div>
              <p className="font-mono text-[#F2F0EB]/70 text-xs tracking-wider">NO WORRIES.</p>
              <p className="font-mono text-[#444] text-[10px] tracking-wider mt-0.5 leading-relaxed">
                Your registration is still saved. Your Player Pack is still locked.
              </p>
            </div>
            <button
              onClick={() => setShowCancelledMessage(false)}
              className="ml-auto font-mono text-[#333] text-xs hover:text-[#F2F0EB] transition-colors flex-shrink-0"
            >✕</button>
          </div>
        )}

        {/* ── Section 1: Hero Greeting ── */}
        <section className="pt-8">
          <div
            style={{
              transition: "opacity 0.9s ease, transform 0.9s ease",
              opacity: heroVisible ? 1 : 0,
              transform: heroVisible ? "translateY(0)" : "translateY(24px)",
            }}
          >
            <p className="font-mono text-[#444] text-xs tracking-[0.35em] mb-3">
              {isReturning ? "WELCOME BACK" : "YOU'RE REGISTERED"}
            </p>
            <h1
              className="font-display text-[#F2F0EB] leading-[0.88] mb-5"
              style={{ fontSize: "clamp(3.2rem, 14vw, 6.5rem)" }}
            >
              {isReturning ? (
                <>{"YOUR TEAM"}<br /><span className="text-[#FF5500]">WAITS.</span></>
              ) : (
                <>WELCOME<br />
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
                </span></>
              )}
            </h1>
            <p
              className="font-mono text-[#F2F0EB]/55 text-sm tracking-wider leading-relaxed max-w-sm"
              style={{
                transition: "opacity 0.7s ease 0.8s",
                opacity: heroVisible ? 1 : 0,
              }}
            >
              {dashboard.body}
            </p>
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
                {dashboard.sportsDayProfile?.replace(/_/g, " ").toUpperCase() ?? "COMPETITOR"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "NAME", value: dashboard.fullName.toUpperCase() },
                { label: "STATUS", value: "REGISTERED", color: "#FF5500" },
                { label: "TEAM", value: isLocked ? "CLASSIFIED" : (dashboard.team?.toUpperCase() ?? "ASSIGNED"), color: isLocked ? "#444" : "#22c55e" },
                { label: "ACCESS", value: isLocked ? "STANDARD" : "PRIORITY", color: isLocked ? "#444" : "#22c55e" },
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

        {/* ── Section 5: Unlock CTA (locked states only) ── */}
        {isLocked && (
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
                  <p className="font-mono text-[#444] text-xs tracking-[0.3em]">PRIORITY PLAYER PACK</p>
                </div>

                {/* State-specific headline */}
                <h2 className="font-display text-[#FF5500] text-2xl tracking-widest mb-2">
                  {isReturning ? "YOUR TEAM IS STILL WAITING." : "YOUR TEAM HAS BEEN PICKED."}
                </h2>

                {/* Price urgency */}
                {priceState.countdownMs != null && priceState.countdownMs > 0 && (
                  <div className="mb-4">
                    <CountdownBadge countdownMs={priceState.countdownMs} />
                  </div>
                )}

                <ul className="space-y-2.5 mb-6">
                  {[
                    "Instant team reveal",
                    "One-of-one custom team-colour top",
                    "Early teammate preview",
                    "Priority event access",
                    "Sponsor drops",
                    "First into the dashboard",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 font-mono text-[#F2F0EB]/65 text-xs tracking-wider">
                      <span className="text-[#FF5500] mt-0.5 shrink-0">→</span>
                      {item}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={handleUnlock}
                  disabled={createCheckout.isPending || awaitingWebhook}
                  className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-xl tracking-widest py-5 hover:bg-[#F2F0EB] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createCheckout.isPending
                    ? "OPENING CHECKOUT..."
                    : awaitingWebhook
                    ? "CONFIRMING PAYMENT..."
                    : dashboard.ctaLabel.toUpperCase()}
                </button>

                {/* Price note */}
                {dashboard.ctaNote && (
                  <p className="font-mono text-[#444] text-[10px] text-center mt-3 tracking-wider leading-relaxed">
                    {dashboard.ctaNote}
                  </p>
                )}

                {priceState.topProductionCutoffPassed && (
                  <p className="font-mono text-[#FF5500]/60 text-[10px] text-center mt-2 tracking-wider">
                    Late unlocks may not guarantee full top customisation.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

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
            {(dashboard.referralCount ?? 0) > 0 && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="h-1 transition-colors duration-500"
                      style={{
                        width: "2rem",
                        background: n <= (dashboard.referralCount ?? 0) ? "#FF5500" : "rgba(255,255,255,0.08)",
                      }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[#444] text-xs tracking-wider">
                  <AnimatedNumber value={dashboard.referralCount ?? 0} />/3
                </span>
              </div>
            )}
          </div>
        </section>
      </div>

    </div>
  );
}
