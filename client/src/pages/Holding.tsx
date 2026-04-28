import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const SHOPIFY_STORE_URL = import.meta.env.VITE_SHOPIFY_STORE_URL || "https://your-store.myshopify.com";
const SHOPIFY_VARIANT_ID = import.meta.env.VITE_SHOPIFY_VARIANT_ID || "12345678901234";

export default function Holding() {
  const [, navigate] = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem("sd_user_id");
    if (!id) {
      navigate("/enter");
      return;
    }
    setUserId(id);
  }, [navigate]);

  const { data: user, isLoading } = trpc.sportsday.getUserStatus.useQuery(
    { id: userId! },
    { enabled: !!userId, refetchInterval: 10000 }
  );

  // If unlocked AND already watched the reveal → go straight to team hub
  // If unlocked but NOT yet seen → go to reveal animation first
  useEffect(() => {
    if (user?.revealStatus === "unlocked") {
      if (user?.revealSeen) {
        navigate("/team-hub");
      } else {
        navigate("/reveal");
      }
    }
  }, [user, navigate]);

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

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FF5500] font-display text-3xl tracking-widest animate-pulse">
          LOADING...
        </div>
      </div>
    );
  }

  const firstName = user.fullName.split(" ")[0].toUpperCase();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB]">
      {/* Top accent */}
      <div className="h-[2px] bg-[#FF5500]" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-6 pb-4">
        <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" style={{ filter: "invert(1)" }} />
        <span className="font-mono text-[#FF5500] text-xs tracking-[0.2em]">SPORTS DAY 002</span>
      </header>

      <div className="max-w-lg mx-auto px-5 pb-16 space-y-8">

        {/* ── Section 1: Personal Acknowledgement ── */}
        <section className="pt-8">
          <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-2">REGISTERED</p>
          <h1
            className="font-display text-[#F2F0EB] leading-none"
            style={{ fontSize: "clamp(2.5rem, 10vw, 5rem)" }}
          >
            YOU'RE IN,<br />
            <span className="text-[#FF5500]">{firstName}.</span>
          </h1>
          {user.profileTagline && (
            <p className="font-mono text-[#F2F0EB] opacity-70 text-sm mt-4 tracking-wider leading-relaxed">
              {user.profileTagline}
            </p>
          )}
        </section>

        {/* ── Section 2: Profile Badge ── */}
        <section>
          <div className="border border-[#2A2A2A] p-6 bg-[#0D0D0D]">
            <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-4">YOUR SPORTS DAY PROFILE</p>
            <div className="h-[1px] bg-[#222] mb-4" />
            <h2 className="font-display text-[#FF5500] text-4xl tracking-wider mb-2">
              {user.sportsDayProfile?.toUpperCase() || "THE COMPETITOR"}
            </h2>
            <p className="font-mono text-[#F2F0EB] opacity-60 text-xs tracking-wider">
              {user.profileTagline || "Your identity is locked and loaded."}
            </p>
            <div className="h-[1px] bg-[#222] mt-4" />
          </div>
        </section>

        {/* ── Section 3: Status Block ── */}
        <section>
          <div className="border border-[#2A2A2A] p-6 bg-[#0D0D0D] space-y-3">
            <StatusRow icon="✅" label="Registered" status="complete" />
            <div className="h-[1px] bg-[#1A1A1A]" />
            <StatusRow icon="🔒" label="Team Assigned (Hidden)" status="locked" />
            <div className="h-[1px] bg-[#1A1A1A]" />
            <StatusRow icon="🔒" label="Reveal Pending" status="locked" />
          </div>
          <div className="mt-4 border border-[#2A2A2A] p-4 bg-[#0D0D0D]">
            <p className="font-mono text-[#F2F0EB] text-sm tracking-wider text-center">
              YOUR TEAM IS WAITING.
            </p>
          </div>
        </section>

        {/* ── Section 4: Unlock CTA ── */}
        <section>
          <div className="border border-[#FF5500]/30 p-6 bg-[#FF5500]/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-[#FF5500]" />
              <p className="font-display text-[#FF5500] text-xl tracking-widest">
                PRIORITY PLAYER PASS — £10
              </p>
            </div>

            <p className="font-mono text-[#F2F0EB] opacity-60 text-xs tracking-wider mb-4">
              Unlock everything:
            </p>

            <ul className="space-y-2 mb-6">
              {[
                "Instant team reveal",
                "Custom team-colour shirt (early drop)",
                "Early merch access",
                "Sponsor goodies",
                "Priority access to event release",
                "First access to dashboard",
                "Early announcements",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 font-mono text-[#F2F0EB] text-xs tracking-wider">
                  <span className="text-[#FF5500] mt-0.5">→</span>
                  {item}
                </li>
              ))}
            </ul>

            <button
              onClick={handleUnlock}
              className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-2xl tracking-widest py-5 hover:bg-[#F2F0EB] transition-colors active:scale-95"
            >
              UNLOCK MY TEAM →
            </button>

            <p className="font-mono text-[#555] text-xs text-center mt-3 tracking-wider">
              Priority Player Passes are limited.
              <br />
              Once early reveals close, you'll wait for public allocation.
            </p>
          </div>
        </section>

        {/* ── Section 5: Referral Block ── */}
        <section>
          <div className="border border-[#2A2A2A] p-6 bg-[#0D0D0D]">
            <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-4">BRING YOUR PEOPLE</p>
            <p className="font-mono text-[#F2F0EB] text-sm tracking-wider mb-1">
              Invite 3 friends to join the Sports Day 002 list.
            </p>
            <p className="font-mono text-[#555] text-xs tracking-wider mb-4">
              Reward: extra merch discount + priority captain vote access
            </p>

            <div className="bg-[#111] border border-[#222] p-3 mb-3">
              <p className="font-mono text-[#FF5500] text-xs tracking-wider break-all">
                {referralLink || "Generating your link..."}
              </p>
            </div>

            <button
              onClick={copyReferralLink}
              className={`w-full border font-mono text-sm tracking-widest py-3 transition-all ${
                copied
                  ? "border-[#FF5500] text-[#FF5500]"
                  : "border-[#333] text-[#F2F0EB] hover:border-[#FF5500] hover:text-[#FF5500]"
              }`}
            >
              {copied ? "✓ COPIED" : "COPY LINK"}
            </button>

            {(user.referralCount ?? 0) > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <div className="flex gap-1">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className={`w-8 h-1 ${n <= (user.referralCount ?? 0) ? "bg-[#FF5500]" : "bg-[#222]"}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-[#555] text-xs tracking-wider">
                  {user.referralCount}/3 referrals
                  {user.referralRewardUnlocked && " — REWARD UNLOCKED 🎉"}
                </span>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatusRow({
  icon,
  label,
  status,
}: {
  icon: string;
  label: string;
  status: "complete" | "locked" | "pending";
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-lg">{icon}</span>
      <span
        className={`font-mono text-sm tracking-wider ${
          status === "complete" ? "text-[#F2F0EB]" : "text-[#444]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
