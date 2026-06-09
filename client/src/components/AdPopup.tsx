/**
 * AdPopup
 *
 * Shown to visitors who arrive from a Meta ad (UTM source = facebook or instagram).
 *
 * Two variants:
 *  - "new_visitor"  — shown on Home page to unregistered ad traffic
 *  - "registered"   — shown on Holding page to registered-but-unpaid ad traffic
 *
 * Behaviour:
 * - Appears after 3 seconds
 * - Dismissed on backdrop click, X button, or CTA click
 * - Session storage flag prevents re-showing on refresh within the same session
 * - Does NOT fire for organic traffic (no UTM or non-Meta UTM)
 * - Does NOT fire for paid users
 */

import { useEffect, useState } from "react";

const SESSION_KEY_NEW = "sd_ad_popup_new_seen";
const SESSION_KEY_REG = "sd_ad_popup_reg_seen";

/** Returns true if the current URL has UTM source = facebook or instagram */
function isMetaAdTraffic(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  const src = (params.get("utm_source") ?? "").toLowerCase();
  return src === "facebook" || src === "instagram";
}

function hasSeenPopup(key: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(key) === "true";
}

function markPopupSeen(key: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, "true");
}

interface AdPopupProps {
  /** Which variant to show */
  variant: "new_visitor" | "registered";
  /** Called when user clicks the CTA button */
  onCtaClick: () => void;
  /** Delay in ms before popup appears (default: 3000) */
  delay?: number;
}

export function AdPopup({ variant, onCtaClick, delay = 3000 }: AdPopupProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const sessionKey = variant === "new_visitor" ? SESSION_KEY_NEW : SESSION_KEY_REG;

  useEffect(() => {
    // Only show for Meta ad traffic
    if (!isMetaAdTraffic()) return;
    // Only show once per session
    if (hasSeenPopup(sessionKey)) return;

    const t = setTimeout(() => {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    }, delay);

    return () => clearTimeout(t);
  }, [delay, sessionKey]);

  const handleDismiss = () => {
    setVisible(false);
    markPopupSeen(sessionKey);
    setTimeout(() => setMounted(false), 400);
  };

  const handleCta = () => {
    handleDismiss();
    onCtaClick();
  };

  if (!mounted) return null;

  const copy =
    variant === "new_visitor"
      ? {
          label: "SPORTS DAY 002 · SHEFFIELD",
          headline: "Your team is waiting.",
          body: "Sports Day 002. Sheffield. July 11th. Register free — your team gets revealed when you unlock for £22.",
          cta: "REGISTER NOW →",
          footer: "Free to register · Priority unlock £22 · One-time event",
        }
      : {
          label: "YOU'RE ALREADY IN",
          headline: "Still thinking about it?",
          body: "Your team is assigned. Your teammates know each other. Unlock for £22 and find out where you stand before July 11th.",
          cta: "UNLOCK MY TEAM →",
          footer: "One-time payment · Team revealed instantly",
        };

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
              {copy.label}
            </p>

            {/* Headline */}
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
                        {rest}
                        <br />
                        <span className="text-[#FF5500]">{last?.trim()}</span>
                      </>
                    );
                  })()
                : <span className="text-[#FF5500]">{copy.headline}</span>}
            </h2>

            {/* Body */}
            <p className="font-mono text-[#F2F0EB]/55 text-xs tracking-wider leading-relaxed mb-5">
              {copy.body}
            </p>

            {/* Urgency signal for registered variant */}
            {variant === "registered" && (
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#FF5500] animate-pulse" />
                <span className="font-mono text-[#FF5500] text-[10px] tracking-[0.25em]">
                  PRICE INCREASES AFTER JULY 11TH
                </span>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleCta}
              className="w-full bg-[#FF5500] text-[#0A0A0A] font-display tracking-widest py-4 hover:bg-[#F2F0EB] transition-all active:scale-[0.98]"
              style={{ fontSize: "clamp(1rem, 4vw, 1.2rem)" }}
            >
              {copy.cta}
            </button>

            <p className="font-mono text-[#333] text-[10px] text-center mt-3 tracking-wider">
              {copy.footer}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
