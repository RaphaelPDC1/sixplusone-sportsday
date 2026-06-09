import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { BackNav } from "@/components/ui/back-nav";
import { EntrySplash } from "@/components/ui/entry-splash";
import { ParticleTextBg } from "@/components/ui/particle-text-bg";
import { ScratchCardGrid } from "@/components/ui/scratch-card";
import { TopNameEditor } from "@/components/TopNameEditor";
import { PaymentForm } from "@/components/PaymentForm";
import { FunnelPopup } from "@/components/FunnelPopup";
import { AdPopup } from "@/components/AdPopup";
import {
  getNextRevealRoute,
  hasCompletedFullRevealFlow,
} from "@/lib/revealJourney";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

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
  const paymentSectionRef = useRef<HTMLDivElement>(null);

  const scrollToPayment = () => {
    setUnlockStep("topname");
    setTimeout(() => {
      paymentSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

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

  // ── URL params ──
  const searchParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const paymentConfirmed = searchParams.get("payment_confirmed") === "true";
  const paymentCancelled = searchParams.get("cancelled") === "true";

  // ── Payment UI state ──
  const [unlockStep, setUnlockStep] = useState<"idle" | "topname" | "payment" | "confirming">("idle");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(2200);
  const [confirmingStartedAt, setConfirmingStartedAt] = useState<number | null>(null);
  const [confirmingTimedOut, setConfirmingTimedOut] = useState(false);

  // ── Dashboard query (replaces getUserStatus) ──
  const { data: dashboard, isLoading, error } = trpc.sportsday.getSportsDayDashboard.useQuery(
    { registrationId: userId! },
    {
      enabled: !!userId,
      refetchInterval: unlockStep === "confirming" ? 3000 : 30000,
      retry: false,
      retryOnMount: false,
      throwOnError: false,
    }
  );

  // Alias for backward compat with existing UI sections
  const user = dashboard ? {
    id: userId!,
    fullName: dashboard.playerName ?? "",
    email: "", // playerEmail removed from dashboard (SECURITY PATCH 3)
    profileTagline: dashboard.tagline ?? "",
    sportsDayProfile: dashboard.profile ?? "",
    paymentStatus: dashboard.state === "UNLOCKED_PRIORITY" || dashboard.state === "PUBLIC_REVEAL" ? "paid" : "unpaid",
    revealStatus: dashboard.state === "UNLOCKED_PRIORITY" || dashboard.state === "PUBLIC_REVEAL" ? "unlocked" : "locked",
    revealSeen: false,
    referralCode: dashboard.referralCode ?? "",
    referralCount: dashboard.referralCount ?? 0,
    referralRewardUnlocked: false,
    topName: dashboard.topName ?? "",
  } : null;

  const createPaymentIntent = trpc.sportsday.createPaymentIntent.useMutation();

  // If the stored ID no longer exists in the DB, clear it and show "find my spot"
  useEffect(() => {
    if (!error) return;
    const code = (error as { data?: { code?: string } }).data?.code;
    if (code === "NOT_FOUND") {
      localStorage.removeItem("sd_user_id");
      setUserId(null);
    }
  }, [error]);

  // ── Redirect unlocked users ──
  // Guard: only redirect once per mount to prevent re-firing loops
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    if (!dashboard) return;
    if (hasRedirectedRef.current) return; // already redirected this mount
    const cameFromTeamHub = sessionStorage.getItem("came_from_teamhub") === "1";
    if (cameFromTeamHub) {
      sessionStorage.removeItem("came_from_teamhub");
      return;
    }
    if (dashboard.state === "UNLOCKED_PRIORITY" || dashboard.state === "PUBLIC_REVEAL") {
      hasRedirectedRef.current = true;
      // Use central state manager to determine the correct next route
      const registrationId = localStorage.getItem("sd_user_id") ?? "";
      const accessType = dashboard.accessType; // "priority" for paid, "free" for free users
      if (hasCompletedFullRevealFlow(registrationId, accessType)) {
        // Returning user who has seen their full journey — go straight to dashboard
        navigateRef.current("/team-hub");
      } else {
        // First-time unlock — start the reveal journey from where they left off
        navigateRef.current(getNextRevealRoute(registrationId, accessType));
      }
    }
  }, [dashboard?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-start confirming state if returning from payment ──
  useEffect(() => {
    if (paymentConfirmed && unlockStep === "idle") {
      setUnlockStep("confirming");
      setConfirmingStartedAt(Date.now());
      setConfirmingTimedOut(false);
      console.log("[Holding] Confirming state started — polling every 3s");
    }
  }, [paymentConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stop polling once confirmed ──
  useEffect(() => {
    if (unlockStep === "confirming" && (dashboard?.state === "UNLOCKED_PRIORITY" || dashboard?.state === "PUBLIC_REVEAL")) {
      setUnlockStep("idle");
      console.log("[Holding] Unlock confirmed — redirecting to /reveal (team reveal first)");
      // Always go to /reveal first after a fresh payment confirmation — team reveal is the big moment
      // The reveal journey manager will route through /unlock-reveal → /shirt-confirm → /team-hub
      navigateRef.current("/reveal");
    }
  }, [dashboard?.state, unlockStep]);

  // ── Confirming timeout (30s) ──
  useEffect(() => {
    if (unlockStep !== "confirming" || confirmingTimedOut) return;
    const timer = setTimeout(() => {
      // Only time out if still not unlocked
      if (dashboard?.state !== "UNLOCKED_PRIORITY" && dashboard?.state !== "PUBLIC_REVEAL") {
        console.log("[Holding] Confirming timeout reached after 30s");
        setConfirmingTimedOut(true);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [unlockStep, confirmingTimedOut, dashboard?.state]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleStartUnlock = () => {
    setUnlockStep("topname");
  };

  const handleTopNameConfirmed = async (topName: string) => {
    try {
      // topName is already saved by TopNameEditor via saveTopName mutation
      // createPaymentIntent only needs registrationId
      const result = await createPaymentIntent.mutateAsync({
        registrationId: userId!,
      });
      setClientSecret(result.clientSecret);
      setPaymentIntentId(result.paymentIntentId);
      setPaymentAmount(result.amountPence);
      setUnlockStep("payment");
    } catch (err) {
      toast.error("Could not start payment. Please try again.");
      setUnlockStep("idle");
    }
  };

  const handlePaymentSuccess = () => {
    setUnlockStep("confirming");
    // Clean up URL params
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/holding");
    }
  };

  const handlePaymentCancel = () => {
    setUnlockStep("idle");
    setClientSecret(null);
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

  const firstName = (user?.fullName ?? "").split(" ")[0].toUpperCase() || "PLAYER";

  // Derived state for simplified UI
  const isUnlocked = dashboard.state === "UNLOCKED_PRIORITY" || dashboard.state === "PUBLIC_REVEAL";
  const isLocked = dashboard.state === "LOCKED_UNPAID" || dashboard.state === "RETURNING_UNPAID";
  const price = dashboard?.priceState ? `£${(dashboard.priceState.currentPricePence / 100).toFixed(0)}` : "£22";

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB] relative overflow-hidden">
      {showSplash && <EntrySplash onComplete={handleSplashComplete} />}
      {/* Funnel pop-ups: first-time and return-visit — only for unpaid/locked users */}
      {isLocked && userId && (
        <FunnelPopup
          registrationId={userId}
          onCtaClick={scrollToPayment}
          delay={2200}
        />
      )}
      {/* Ad popup — shown 3s after load to Meta ad traffic who are registered but not paid */}
      {isLocked && (
        <AdPopup
          variant="registered"
          onCtaClick={scrollToPayment}
          delay={3000}
        />
      )}
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

      <div className="relative z-10 max-w-lg mx-auto px-5 pb-16">

        {/* ── HERO ── */}
        <section
          className="pt-10 pb-8"
          style={{
            transition: "opacity 0.9s ease, transform 0.9s ease",
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? "translateY(0)" : "translateY(24px)",
          }}
        >
          {/* Registration confirmed badge */}
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-[#22c55e]" style={{ animation: "pulse 1.6s ease-in-out infinite" }} />
            <p className="font-mono text-[#22c55e] text-[10px] tracking-[0.35em]">REGISTRATION CONFIRMED</p>
          </div>

          {/* Main headline */}
          <h1
            className="font-display text-[#F2F0EB] leading-[0.88] mb-4"
            style={{ fontSize: "clamp(3rem, 16vw, 7rem)" }}
          >
            SPORTS DAY<br />
            <span className="text-[#FF5500]">002.</span>
          </h1>

          {/* Event details line */}
          <p className="font-mono text-[#F2F0EB]/50 text-sm tracking-[0.25em] mb-1">
            FRIDAY 11 JULY 2026
          </p>
          <p className="font-mono text-[#F2F0EB]/30 text-xs tracking-[0.3em]">
            SHEFFIELD
          </p>
        </section>

        {/* ── STATUS INDICATOR ── */}
        <section
          className="mb-6"
          style={{
            transition: "opacity 0.7s ease 0.35s",
            opacity: heroVisible ? 1 : 0,
          }}
        >
          {/* Minimal status indicator */}
          <div className="border border-white/10 bg-black/20 backdrop-blur-sm px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: isUnlocked ? "#22c55e" : "#FF5500",
                    animation: "pulse 1.6s ease-in-out infinite",
                  }}
                />
                <span className="font-mono text-xs tracking-[0.25em]" style={{ color: isUnlocked ? "#22c55e" : "#FF5500" }}>
                  {isUnlocked ? "TEAM UNLOCKED" : "TEAM LOCKED"}
                </span>
              </div>
              <span className="font-mono text-[#444] text-[10px] tracking-widest">
                {firstName}
              </span>
            </div>
          </div>
        </section>

        {/* ── PAYMENT / UNLOCK FLOW ── */}
        <section
          ref={paymentSectionRef}
          className="mt-6"
          style={{
            transition: "opacity 0.7s ease 0.5s",
            opacity: heroVisible ? 1 : 0,
          }}
        >
          {/* Cancelled checkout soft message */}
          {paymentCancelled && unlockStep === "idle" && (
            <div className="mb-4 border border-white/8 bg-black/20 px-5 py-4">
              <p className="font-mono text-[#F2F0EB]/60 text-xs tracking-wider leading-relaxed">
                No worries — your registration is still saved. Your Player Pack is still locked.
              </p>
            </div>
          )}

          {/* ── Confirming state (webhook delay) ── */}
          {unlockStep === "confirming" && (
            <div className="border border-[#FF5500]/30 bg-black/20 backdrop-blur-sm p-6 text-center">
              {!confirmingTimedOut ? (
                <>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
                    <p className="font-mono text-[#FF5500] text-sm tracking-[0.2em]">CONFIRMING YOUR UNLOCK...</p>
                  </div>
                  <p className="font-mono text-[#F2F0EB]/40 text-xs tracking-wider">
                    Payment received. We’re confirming your unlock now.
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <p className="font-mono text-yellow-400 text-sm tracking-[0.2em]">PAYMENT RECEIVED</p>
                  </div>
                  <p className="font-mono text-[#F2F0EB]/70 text-xs tracking-wider mb-3">
                    Your payment was received but your unlock is still syncing. This can take a moment.
                  </p>
                  <p className="font-mono text-[#F2F0EB]/40 text-xs tracking-wider mb-2">
                    Do not pay again. Contact support with this reference:
                  </p>
                  <p className="font-mono text-[#FF5500] text-xs tracking-[0.15em] break-all">
                    {userId}
                  </p>
                  <p className="font-mono text-[#F2F0EB]/30 text-[10px] tracking-wider mt-3">
                    Still checking... this page will update automatically.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── TopName editor step ── */}
          {unlockStep === "topname" && userId && (
            <TopNameEditor
              registrationId={userId}
              playerName={user?.fullName ?? ""}
              initialTopName={user?.topName || undefined}
              onConfirmed={handleTopNameConfirmed}
              onCancel={() => setUnlockStep("idle")}
            />
          )}

          {/* ── Embedded payment form step ── */}
          {unlockStep === "payment" && clientSecret && (
            <PaymentForm
              clientSecret={clientSecret}
              amount={paymentAmount}
              currency="gbp"
              paymentIntentId={paymentIntentId || undefined}
              onPaymentSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          )}

          {/* ── Single CTA based on state ── */}
          {unlockStep === "idle" && isLocked && (
            <div className="space-y-3">
              {/* Urgency line for returning users */}
              {dashboard.state === "RETURNING_UNPAID" && (
                <div className="flex items-center gap-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500]" style={{ animation: "pulse 1.4s ease-in-out infinite" }} />
                  <p className="font-mono text-[#FF5500] text-[10px] tracking-[0.25em]">YOU CAME BACK. EARLY ACCESS STILL OPEN.</p>
                </div>
              )}
              {/* Main unlock CTA */}
              <button
                onClick={handleStartUnlock}
                className="w-full bg-[#FF5500] text-[#0A0A0A] font-display tracking-widest py-5 hover:bg-[#F2F0EB] transition-all active:scale-[0.98]"
                style={{ fontSize: "clamp(1.1rem, 5vw, 1.4rem)" }}
              >
                UNLOCK YOUR TEAM — {price}
              </button>
              {/* Trust micro-copy */}
              <div className="flex items-center justify-center gap-5">
                <span className="font-mono text-[#333] text-[10px] tracking-wider">Secure checkout</span>
                <span className="font-mono text-[#333] text-[10px] tracking-wider">Instant unlock</span>
                <span className="font-mono text-[#333] text-[10px] tracking-wider">Apple Pay</span>
              </div>
            </div>
          )}

          {/* ── Unlocked: See your team CTA ── */}
          {unlockStep === "idle" && isUnlocked && (
            <button
              onClick={() => navigate("/team-dashboard")}
              className="w-full border border-[#F2F0EB]/20 text-[#F2F0EB] font-display tracking-widest py-5 hover:bg-white/5 transition-all active:scale-[0.98]"
              style={{ fontSize: "clamp(1.1rem, 5vw, 1.4rem)" }}
            >
              SEE YOUR TEAM →
            </button>
          )}
        </section>

        {/* ── Referral link (compact) ── */}
        {referralLink && (
          <section
            className="mt-6 pb-4"
            style={{
              transition: "opacity 0.7s ease 0.8s",
              opacity: heroVisible ? 1 : 0,
            }}
          >
            <div className="border border-white/8 bg-black/15 backdrop-blur-sm px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[#444] text-[10px] tracking-[0.3em] mb-1">YOUR REFERRAL LINK</p>
                  <p className="font-mono text-[#FF5500] text-xs tracking-wider truncate">{referralLink}</p>
                </div>
                <button
                  onClick={copyReferralLink}
                  className={`shrink-0 border font-mono text-[10px] tracking-widest px-3 py-2 transition-all ${
                    copied
                      ? "border-[#FF5500] text-[#FF5500]"
                      : "border-white/10 text-[#F2F0EB]/40 hover:border-[#FF5500] hover:text-[#FF5500]"
                  }`}
                >
                  {copied ? "✓ COPIED" : "COPY"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

    </div>
  );
}
