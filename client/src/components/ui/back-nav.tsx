import { useLocation } from "wouter";

interface BackNavProps {
  to: string;
  label?: string;
}

/**
 * Minimal top-left back navigation button used on every page.
 * Renders as a fixed overlay so it sits above page content without
 * affecting layout flow.
 */
export function BackNav({ to, label = "BACK" }: BackNavProps) {
  const [, navigate] = useLocation();

  return (
    <button
      onClick={() => navigate(to)}
      className="fixed top-4 left-4 z-50 flex items-center gap-2 text-white/60 hover:text-white transition-colors group"
      aria-label={`Go back to ${to}`}
    >
      {/* Arrow */}
      <span
        className="flex items-center justify-center w-8 h-8 rounded-full border border-white/15 bg-black/50 backdrop-blur-sm group-hover:border-[#FF5500]/60 group-hover:bg-[#FF5500]/10 transition-all"
        aria-hidden="true"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 2L4 7L9 12"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {/* Label — hidden on very small screens to avoid overlap */}
      <span className="hidden sm:block font-mono text-xs tracking-widest uppercase">
        {label}
      </span>
    </button>
  );
}
