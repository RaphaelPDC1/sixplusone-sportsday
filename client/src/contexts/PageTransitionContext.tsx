import { createContext, useContext, useCallback } from "react";
import { useLocation } from "wouter";

interface PageTransitionContextValue {
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
 * Thin wrapper so BackNav and other nav elements can call triggerTransition
 * without knowing the router internals. The shooting-star easter egg lives
 * exclusively on the Home page and is NOT triggered here.
 */
export function PageTransitionProvider({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();

  const triggerTransition = useCallback((to: string) => {
    navigate(to);
  }, [navigate]);

  return (
    <PageTransitionContext.Provider value={{ triggerTransition }}>
      {children}
    </PageTransitionContext.Provider>
  );
}
