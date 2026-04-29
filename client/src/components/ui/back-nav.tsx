import { useRef } from "react";
import { usePageTransition } from "@/contexts/PageTransitionContext";

interface BackNavProps {
  to: string;
  label?: string;
  /** Pass className to override positioning */
  className?: string;
  /** If true, renders inline — useful inside flex headers */
  inline?: boolean;
  /** Optional extra action to run before navigation (e.g. set sessionStorage flag) */
  onBeforeNavigate?: () => void;
}

/**
 * Back navigation in the site's editorial mono style.
 * Fires the page transition animation on click.
 */
export function BackNav({ to, label = "BACK", className, inline = false, onBeforeNavigate }: BackNavProps) {
  const { triggerTransition } = usePageTransition();
  const btnRef = useRef<HTMLButtonElement>(null);

  const base =
    "flex items-center gap-2 font-mono text-xs tracking-[0.25em] text-white/40 hover:text-[#FF5500] transition-colors group";

  const positioning = inline ? "" : "fixed top-5 left-5 z-50";

  return (
    <button
      ref={btnRef}
      onClick={() => {
        onBeforeNavigate?.();
        triggerTransition(to, btnRef.current);
      }}
      className={`${base} ${positioning} ${className ?? ""}`}
      aria-label="Go back"
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      >
        <path
          d="M8 1.5L3.5 6L8 10.5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{label}</span>
    </button>
  );
}
