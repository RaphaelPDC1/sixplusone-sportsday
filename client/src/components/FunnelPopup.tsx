/**
 * FunnelPopup
 *
 * Two pop-up variants for the holding page funnel:
 *
 * FIRST_VISIT — shown once ever (localStorage flag).
 *   Copy is AI-generated per user from their sports profile.
 *
 * RETURN_VISIT — shown on second+ visit (after first popup has been dismissed).
 *   Copy is AI-generated per user with urgency angle.
 *
 * Behaviour:
 * - Only renders when admin has enabled popups globally (settings.popupsEnabled)
 * - Copy is personalised via LLM and cached in DB per user
 * - Appears 2.2s after page load (after splash completes)
 * - Dismisses on backdrop click, X button, or CTA click
 * - Each variant is shown at most once per browser (localStorage)
 */

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

const KEY_FIRST_POPUP_SEEN = "sd_popup_first_seen";
const KEY_RETURN_POPUP_SEEN = "sd_popup_return_seen";

type PopupVariant = "first" | "return" | null;

function getPopupVariant(): PopupVariant {
  if (typeof window === "undefined") return null;
  const firstSeen = localStorage.getItem(KEY_FIRST_POPUP_SEEN) === "true";
  const returnSeen = localStorage.getItem(KEY_RETURN_POPUP_SEEN) === "true";
  if (!firstSeen) return "first";
  if (!returnSeen) return "return";
  return null;
}

function markPopupSeen(variant: PopupVariant) {
  if (!variant) return;
  if (variant === "first") localStorage.setItem(KEY_FIRST_POPUP_SEEN, "true");
  if (variant === "return") localStorage.setItem(KEY_RETURN_POPUP_SEEN, "true");
}

interface PopupCopy {
  headline: string;
  body: string;
  cta: string;
}

interface FunnelPopupProps {
  registrationId: string;
  /** Called when user clicks the CTA — parent should scroll to payment */
  onCtaClick: () => void;
  /** Delay in ms before popup appears (default: 2200) */
  delay?: number;
}

export function FunnelPopup({ registrationId, onCtaClick, delay = 2200 }: FunnelPopupProps) {
  const [variant, setVariant] = useState<PopupVariant>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Fetch AI copy + check global enabled flag
  const { data: popupData } = trpc.sportsday.getPopupSettings.useQuery(
    { registrationId },
    { enabled: !!registrationId, staleTime: 10 * 60 * 1000 } // cache 10 min
  );

  useEffect(() => {
    if (!popupData?.enabled) return; // Admin hasn't enabled popups yet
    const v = getPopupVariant();
    if (!v) return;
    setVariant(v);
    const t = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    }, delay);
    return () => clearTimeout(t);
  }, [popupData?.enabled, delay]);

  const handleDismiss = () => {
    setVisible(false);
    markPopupSeen(variant);
    setTimeout(() => setMounted(false), 400);
  };

  const handleCta = () => {
    handleDismiss();
    onCtaClick();
  };

  if (!mounted || !variant || !popupData?.enabled) return null;

  const copy: PopupCopy | null = variant === "first"
    ? (popupData?.firstVisit ?? null)
    : (popupData?.returnVisit ?? null);

  if (!copy) return null;

  const isFirst = variant === "first";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[90]"
        style={{
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
          transition: "opacity 0.4s ease",
          opacity: visible ? 1 : 0,
        }}
        onClick={handleDismiss}
      />

      {/* Panel — slides up from bottom */}
      <div
        className="fixed inset-x-0 bottom-0 z-[91] px-4 pb-6"
        style={{
          transition: "transform 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.4s ease",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            background: "#0D0D0D",
            border: "1px solid rgba(255,85,0,0.35)",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          {/* Animated top border */}
          <div
            className="absolute top-0 left-0 h-[2px] bg-[#FF5500]"
            style={{
              width: visible ? "100%" : "0%",
              transition: "width 1.2s ease 0.3s",
            }}
          />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center border border-white/10 hover:border-white/30 transition-colors"
            aria-label="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1L9 9M9 1L1 9" stroke="#F2F0EB" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <div className="p-6 pt-7 pr-12">
            {/* Label */}
            <p className="font-mono text-[#FF5500] text-[10px] tracking-[0.35em] mb-3">
              {isFirst ? "SPORTS DAY 002 · JULY 11TH" : "YOU CAME BACK"}
            </p>

            {/* AI-generated headline */}
            <h2
              className="font-display text-[#F2F0EB] leading-[0.9] mb-4"
              style={{ fontSize: "clamp(1.6rem, 7vw, 2.4rem)" }}
            >
              {copy.headline.includes(".")
                ? (() => {
                    const parts = copy.headline.split(".");
                    const last = parts.pop();
                    const rest = parts.join(".") + ".";
                    return (
                      <>
                        {rest}<br />
                        <span className="text-[#FF5500]">{last?.trim()}</span>
                      </>
                    );
                  })()
                : <span className="text-[#FF5500]">{copy.headline}</span>
              }
            </h2>

            {/* AI-generated body */}
            <p className="font-mono text-[#F2F0EB]/55 text-xs tracking-wider leading-relaxed mb-5">
              {copy.body}
            </p>

            {/* Urgency signal */}
            {!isFirst && (
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
                <span className="font-mono text-[#FF5500] text-[10px] tracking-[0.25em]">
                  PRICE INCREASES SOON
                </span>
              </div>
            )}
            {isFirst && (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-white/8" />
                  <span className="font-mono text-[#444] text-[10px] tracking-[0.3em]">FREE TO ATTEND</span>
                  <div className="flex-1 h-px bg-white/8" />
                </div>
                <p className="font-mono text-[#F2F0EB]/30 text-[10px] tracking-wider mb-5">
                  The event is free. The kit is optional — but it's the piece that makes the story yours.
                </p>
              </>
            )}

            {/* AI-generated CTA */}
            <button
              onClick={handleCta}
              className="w-full bg-[#FF5500] text-[#0A0A0A] font-display tracking-widest py-4 hover:bg-[#F2F0EB] transition-all active:scale-[0.98]"
              style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)" }}
            >
              {copy.cta}
            </button>

            <p className="font-mono text-[#333] text-[10px] text-center mt-3 tracking-wider">
              {isFirst
                ? "Free to attend · Kit is optional · One-time run"
                : "Your registration is already saved · No pressure"}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
