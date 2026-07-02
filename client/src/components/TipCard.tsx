/**
 * TipCard — guided onboarding callout for the Team Hub
 *
 * Prominent inline callout with:
 * - Strong glowing border in team colour
 * - Directional arrow (points down by default = tip is above section)
 * - Pulsing accent glow to draw attention
 * - Large "GOT IT" CTA button
 * - Stays visible until dismissed; persists via localStorage
 */

import { type Tip } from "../hooks/useTips";

interface TipCardProps {
  tip: Tip;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  showDismissAll?: boolean;
  /** Team colour hex for accent/glow */
  accentColor?: string;
  /**
   * Arrow direction — where the tip is pointing toward.
   * "down" = tip sits above the section (default, most common on mobile)
   * "up"   = tip sits below the section
   * "none" = no arrow (e.g. share-reveal above tab bar)
   */
  arrowDir?: "down" | "up" | "none";
}

export function TipCard({
  tip,
  onDismiss,
  onDismissAll,
  showDismissAll = false,
  accentColor = "#f97316",
  arrowDir = "down",
}: TipCardProps) {
  return (
    <div className="relative mb-5">
      {/* ── Main card ── */}
      <div
        className="relative overflow-visible rounded-none"
        style={{
          border: `1.5px solid ${accentColor}`,
          background: "rgba(0,0,0,0.85)",
          boxShadow: `0 0 0 1px ${accentColor}33, 0 0 18px 2px ${accentColor}44, inset 0 0 24px 0 ${accentColor}0D`,
          animation: "tipPulse 2.8s ease-in-out infinite",
        }}
      >
        {/* Top accent bar — full width, solid colour */}
        <div
          className="absolute top-0 left-0 right-0 h-[3px]"
          style={{ background: accentColor }}
        />

        {/* "LOOK HERE" badge — top-right corner */}
        <div
          className="absolute -top-[11px] right-4 px-2 py-0.5 font-mono text-[9px] tracking-[0.2em] font-bold"
          style={{
            background: accentColor,
            color: "#000",
            letterSpacing: "0.18em",
          }}
        >
          LOOK HERE
        </div>

        <div className="px-4 pt-5 pb-4">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="font-mono text-[11px] tracking-[0.22em] font-bold"
              style={{ color: accentColor }}
            >
              {tip.label}
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: `linear-gradient(to right, ${accentColor}60, transparent)` }}
            />
          </div>

          {/* Body */}
          <p className="font-mono text-[12px] text-white/85 leading-relaxed tracking-wide mb-4">
            {tip.body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onDismiss(tip.id)}
              className="flex-1 font-mono text-[11px] tracking-[0.2em] font-bold py-2.5 px-4 transition-all active:scale-[0.97] hover:brightness-110"
              style={{
                background: accentColor,
                color: "#000",
                border: "none",
              }}
            >
              GOT IT ✓
            </button>
            {showDismissAll && (
              <button
                onClick={onDismissAll}
                className="font-mono text-[10px] tracking-widest text-white/35 hover:text-white/60 transition-colors whitespace-nowrap"
              >
                HIDE ALL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Directional arrow ── */}
      {arrowDir === "down" && (
        <div className="flex justify-center mt-0">
          {/* Arrow pointing down toward the section */}
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none">
            <path
              d="M11 14L0 0H22L11 14Z"
              fill={accentColor}
              opacity="0.9"
            />
          </svg>
        </div>
      )}
      {arrowDir === "up" && (
        <div className="flex justify-center mb-0 order-first">
          {/* Arrow pointing up toward the section above */}
          <svg width="22" height="14" viewBox="0 0 22 14" fill="none" style={{ marginBottom: 0 }}>
            <path
              d="M11 0L22 14H0L11 0Z"
              fill={accentColor}
              opacity="0.9"
            />
          </svg>
        </div>
      )}

      {/* Pulse keyframes injected once via a style tag */}
      <style>{`
        @keyframes tipPulse {
          0%, 100% { box-shadow: 0 0 0 1px ${accentColor}33, 0 0 18px 2px ${accentColor}44, inset 0 0 24px 0 ${accentColor}0D; }
          50%       { box-shadow: 0 0 0 1px ${accentColor}55, 0 0 28px 6px ${accentColor}66, inset 0 0 32px 0 ${accentColor}18; }
        }
      `}</style>
    </div>
  );
}
