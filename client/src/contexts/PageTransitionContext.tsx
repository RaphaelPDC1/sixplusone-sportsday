import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ShootingStarCanvas } from "@/components/ui/shooting-star-canvas";

interface PageTransitionContextValue {
  /** Call this with the logo element (or any anchor element) to fire the shooting star then navigate */
  triggerTransition: (to: string, fromEl?: HTMLElement | null) => void;
}

const PageTransitionContext = createContext<PageTransitionContextValue>({
  triggerTransition: () => {},
});

export function usePageTransition() {
  return useContext(PageTransitionContext);
}

/**
 * PageTransitionProvider
 * Wraps the whole app. Intercepts navigations to play the shooting-star
 * firework animation before the route changes.
 *
 * Usage in any component:
 *   const { triggerTransition } = usePageTransition();
 *   triggerTransition("/holding", logoRef.current);
 */
export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const [star, setStar] = useState<{ x: number; y: number; to: string } | null>(null);
  const pendingNav = useRef<string | null>(null);

  // Find the 6+1 logo on screen to use as launch origin
  const getLogoPos = useCallback((fromEl?: HTMLElement | null) => {
    // Prefer the explicitly passed element
    if (fromEl) {
      const r = fromEl.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    // Fall back to any img with alt="6+1" on the page
    const logo = document.querySelector<HTMLImageElement>('img[alt="6+1"]');
    if (logo) {
      const r = logo.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    // Last resort: top-left corner
    return { x: 24, y: 24 };
  }, []);

  const triggerTransition = useCallback((to: string, fromEl?: HTMLElement | null) => {
    // Don't double-fire if already animating
    if (star) {
      navigate(to);
      return;
    }
    const pos = getLogoPos(fromEl);
    pendingNav.current = to;
    setStar({ ...pos, to });
  }, [star, getLogoPos, navigate]);

  const handleComplete = useCallback(() => {
    const dest = pendingNav.current;
    setStar(null);
    pendingNav.current = null;
    if (dest) navigate(dest);
  }, [navigate]);

  return (
    <PageTransitionContext.Provider value={{ triggerTransition }}>
      {star && (
        <ShootingStarCanvas
          logoStartX={star.x}
          logoStartY={star.y}
          onComplete={handleComplete}
        />
      )}
      {children}
    </PageTransitionContext.Provider>
  );
}
