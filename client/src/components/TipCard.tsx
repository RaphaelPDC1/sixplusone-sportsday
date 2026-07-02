/**
 * TipCard — inline onboarding tip card for the Team Hub
 *
 * Dark card, thin cream border, monospace labels, subtle accent glow.
 * Renders nothing once dismissed (gap closes naturally).
 */

import { type Tip } from "../hooks/useTips";

interface TipCardProps {
  tip: Tip;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
  showDismissAll?: boolean;
  /** Optional team colour for the left accent bar (hex string) */
  accentColor?: string;
}

export function TipCard({
  tip,
  onDismiss,
  onDismissAll,
  showDismissAll = false,
  accentColor = "#f97316",
}: TipCardProps) {
  return (
    <div
      className="relative mb-4 rounded-none border border-white/20 bg-black/60 backdrop-blur-sm overflow-hidden"
      style={{ boxShadow: `0 0 12px 0 ${accentColor}22` }}
    >
      {/* Left accent bar */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: accentColor }}
      />

      <div className="pl-4 pr-3 py-3">
        {/* Label row */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="font-mono text-[9px] tracking-[0.2em] font-bold"
            style={{ color: accentColor }}
          >
            {tip.label}
          </span>
          <span className="font-mono text-[9px] tracking-widest text-white/30">
            TIP
          </span>
        </div>

        {/* Body */}
        <p className="font-mono text-[11px] text-white/70 leading-relaxed tracking-wide">
          {tip.body}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3">
          <button
            onClick={() => onDismiss(tip.id)}
            className="font-mono text-[10px] tracking-widest text-white border border-white/30 px-3 py-1 hover:border-white/60 hover:text-white transition-colors active:scale-[0.97]"
          >
            GOT IT
          </button>
          {showDismissAll && (
            <button
              onClick={onDismissAll}
              className="font-mono text-[10px] tracking-widest text-white/30 hover:text-white/60 transition-colors"
            >
              HIDE ALL TIPS
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
