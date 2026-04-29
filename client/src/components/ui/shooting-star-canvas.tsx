import { useEffect, useRef, useCallback } from "react";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

// Team colours for firework sparks
const TEAM_COLORS = ["#E8232A", "#1A4FE8", "#F72B8C", "#FF6B00"];

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  size: number;
  trail: { x: number; y: number; alpha: number }[];
}

interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
  size: number;
}

/**
 * ShootingStarCanvas
 * Renders a full-screen canvas overlay. The 6+1 logo shoots diagonally
 * across the screen leaving a glowing comet trail, then explodes into
 * a firework burst with sparks in all four team colours.
 *
 * Props:
 *   logoStartX / logoStartY — starting position (from nav logo getBoundingClientRect)
 *   onComplete — called when the animation finishes (canvas can be hidden)
 */
export function ShootingStarCanvas({
  logoStartX,
  logoStartY,
  onComplete,
}: {
  logoStartX: number;
  logoStartY: number;
  onComplete: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load logo image
    const logoImg = new Image();
    logoImg.src = LOGO_URL;

    const LOGO_SIZE = 48; // px on canvas
    const DURATION_TRAVEL = 1400; // ms for the logo to cross the screen
    const DURATION_FIREWORK = 1200; // ms for the firework to fade

    // Travel path: start at nav logo position, arc to a random burst point anywhere on screen
    const startX = logoStartX;
    const startY = logoStartY;
    // Firework detonation point: random position on screen (avoid edges)
    const burstX = window.innerWidth  * (0.2 + Math.random() * 0.6);
    const burstY = window.innerHeight * (0.2 + Math.random() * 0.6);
    // End point is the burst point — logo disappears there
    const endX = burstX;
    const endY = burstY;
    // Control point arcs the path naturally toward the burst
    const cpX = (startX + burstX) * 0.5 + (Math.random() - 0.5) * window.innerWidth * 0.3;
    const cpY = Math.min(startY, burstY) - window.innerHeight * (0.1 + Math.random() * 0.2);

    // Quadratic bezier helper
    const bezier = (t: number, p0: number, p1: number, p2: number) =>
      (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;

    let startTime: number | null = null;
    let phase: "travel" | "firework" | "done" = "travel";
    let fireworkStartTime: number | null = null;
    const trail: TrailPoint[] = [];
    let sparks: Spark[] = [];

    // Create firework sparks at explosion point
    const createSparks = (x: number, y: number) => {
      const newSparks: Spark[] = [];
      const SPARKS_PER_COLOR = 18;
      TEAM_COLORS.forEach((color) => {
        for (let i = 0; i < SPARKS_PER_COLOR; i++) {
          const angle = (i / SPARKS_PER_COLOR) * Math.PI * 2 + Math.random() * 0.3;
          const speed = 3 + Math.random() * 8;
          newSparks.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2, // slight upward bias
            color,
            alpha: 1,
            size: 2 + Math.random() * 3,
            trail: [],
          });
        }
      });
      // Add some white sparks for brightness
      for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 12;
        newSparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 3,
          color: "#FFFFFF",
          alpha: 1,
          size: 1.5 + Math.random() * 2,
          trail: [],
        });
      }
      return newSparks;
    };

    const draw = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (phase === "travel") {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const t = Math.min(elapsed / DURATION_TRAVEL, 1);

        // Ease in-out for natural arc
        const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const x = bezier(eased, startX, cpX, endX);
        const y = bezier(eased, startY, cpY, endY);

        // Add trail point
        trail.push({ x, y, alpha: 1, size: LOGO_SIZE * 0.6 });
        if (trail.length > 28) trail.shift();

        // Draw trail — glowing comet tail
        trail.forEach((pt, i) => {
          const trailT = i / trail.length;
          const trailAlpha = trailT * 0.7;
          const trailSize = pt.size * trailT * 0.8;
          // Outer glow
          const glow = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, trailSize * 1.8);
          glow.addColorStop(0, `rgba(255, 140, 40, ${trailAlpha * 0.5})`);
          glow.addColorStop(0.4, `rgba(255, 85, 0, ${trailAlpha * 0.3})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, trailSize * 1.8, 0, Math.PI * 2);
          ctx.fill();
          // Inner bright core
          ctx.globalAlpha = trailAlpha * 0.9;
          ctx.fillStyle = "#FFD080";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, trailSize * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // Draw logo at current position (white, inverted)
        if (logoImg.complete && logoImg.naturalWidth > 0) {
          const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
          const w = LOGO_SIZE * aspect;
          const h = LOGO_SIZE;
          ctx.save();
          ctx.filter = "brightness(0) invert(1) drop-shadow(0 0 12px rgba(255,140,40,0.9))";
          ctx.globalAlpha = Math.max(0, 1 - t * 0.3);
          ctx.drawImage(logoImg, x - w / 2, y - h / 2, w, h);
          ctx.restore();
        }

        if (t >= 1) {
          // Transition to firework at screen centre
          phase = "firework";
          sparks = createSparks(burstX, burstY);
          fireworkStartTime = timestamp;
        }
      } else if (phase === "firework") {
        if (!fireworkStartTime) fireworkStartTime = timestamp;
        const elapsed = timestamp - fireworkStartTime;
        const progress = elapsed / DURATION_FIREWORK;

        if (progress >= 1) {
          phase = "done";
          onCompleteRef.current();
          return;
        }

        // Draw remaining trail fading out
        trail.forEach((pt, i) => {
          const trailT = (i / trail.length) * (1 - progress);
          const trailAlpha = trailT * 0.5;
          if (trailAlpha <= 0) return;
          ctx.globalAlpha = trailAlpha;
          ctx.fillStyle = "#FF8800";
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.size * 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });

        // Update and draw sparks
        sparks.forEach((spark) => {
          // Save trail
          spark.trail.push({ x: spark.x, y: spark.y, alpha: spark.alpha });
          if (spark.trail.length > 8) spark.trail.shift();

          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.vy += 0.18; // gravity
          spark.vx *= 0.97; // air resistance
          spark.alpha = Math.max(0, 1 - progress * 1.3);

          // Draw spark trail
          spark.trail.forEach((tp, ti) => {
            const tAlpha = (ti / spark.trail.length) * spark.alpha * 0.5;
            ctx.globalAlpha = tAlpha;
            ctx.fillStyle = spark.color;
            ctx.beginPath();
            ctx.arc(tp.x, tp.y, spark.size * 0.4, 0, Math.PI * 2);
            ctx.fill();
          });

          // Draw spark head with glow
          if (spark.alpha > 0.05) {
            ctx.save();
            ctx.shadowColor = spark.color;
            ctx.shadowBlur = 8;
            ctx.globalAlpha = spark.alpha;
            ctx.fillStyle = spark.color;
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        // Central flash at start of firework
        if (progress < 0.15) {
          const flashAlpha = (1 - progress / 0.15) * 0.6;
          const flashR = 60 * (1 - progress / 0.15);
          const lastTrail = trail[trail.length - 1];
          if (lastTrail) {
            const flash = ctx.createRadialGradient(
              lastTrail.x, lastTrail.y, 0,
              lastTrail.x, lastTrail.y, flashR
            );
            flash.addColorStop(0, `rgba(255, 255, 220, ${flashAlpha})`);
            flash.addColorStop(0.3, `rgba(255, 140, 40, ${flashAlpha * 0.6})`);
            flash.addColorStop(1, "transparent");
            ctx.fillStyle = flash;
            ctx.beginPath();
            ctx.arc(lastTrail.x, lastTrail.y, flashR, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.globalAlpha = 1;
      }

      if (phase !== "done") {
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    // Wait for logo to load before starting
    const start = () => { frameRef.current = requestAnimationFrame(draw); };
    if (logoImg.complete) {
      start();
    } else {
      logoImg.onload = start;
    }

    return () => cancelAnimationFrame(frameRef.current);
  }, [logoStartX, logoStartY]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 9999 }}
    />
  );
}

/**
 * useShootingStarEasterEgg
 * Manages the shooting star easter egg lifecycle.
 * Returns: { canvasProps, logoRef }
 * - logoRef: attach to the nav logo img element
 * - canvasProps: spread onto <ShootingStarCanvas> (or null if not active)
 */
export function useShootingStarEasterEgg() {
  const logoRef = useRef<HTMLImageElement>(null);
  const activeRef = useRef<{ x: number; y: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setActiveState = useRef<((v: { x: number; y: number } | null) => void) | null>(null);

  const schedule = useCallback(() => {
    const delay = 55000 + Math.random() * 15000;
    timerRef.current = setTimeout(() => {
      const logo = logoRef.current;
      if (!logo) { schedule(); return; }
      const rect = logo.getBoundingClientRect();
      const startX = rect.left + rect.width / 2;
      const startY = rect.top + rect.height / 2;
      activeRef.current = { x: startX, y: startY };
      setActiveState.current?.({ x: startX, y: startY });
    }, delay);
  }, []);

  useEffect(() => {
    // First trigger: 10–20s after load
    const initialDelay = 10000 + Math.random() * 10000;
    timerRef.current = setTimeout(() => {
      const logo = logoRef.current;
      if (!logo) return;
      const rect = logo.getBoundingClientRect();
      activeRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      setActiveState.current?.({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }, initialDelay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [schedule]);

  return { logoRef, activeRef, setActiveState, schedule };
}
