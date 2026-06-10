import { useEffect, useRef, useCallback } from "react";

export type ParticleConfig = {
  color: string;
  speed: "slow" | "medium" | "fast";
  direction: "drift" | "radial" | "directional";
  density: "sparse" | "moderate" | "dense";
  shape: "dot" | "line" | "spark";
};

// Per-step particle configs (12 steps + 2 final steps)
export const STEP_PARTICLE_CONFIGS: ParticleConfig[] = [
  // Step 0 — Name: warm welcome, slow drift
  { color: "#FF5500", speed: "slow", direction: "drift", density: "sparse", shape: "dot" },
  // Step 1 — Email: clean, directional
  { color: "#FF7A1A", speed: "slow", direction: "directional", density: "sparse", shape: "line" },
  // Step 2 — Instagram: social energy, radial
  { color: "#FF5500", speed: "medium", direction: "radial", density: "moderate", shape: "spark" },
  // Step 3 — Attended before: nostalgic, slow drift
  { color: "#CC4400", speed: "slow", direction: "drift", density: "sparse", shape: "dot" },
  // Step 4 — Solo/group: social energy
  { color: "#FF6B1A", speed: "medium", direction: "radial", density: "moderate", shape: "dot" },
  // Step 5 — Group code: focused, directional
  { color: "#FF5500", speed: "medium", direction: "directional", density: "moderate", shape: "line" },
  // Step 6 — Dates: forward momentum
  { color: "#FF7A1A", speed: "medium", direction: "directional", density: "moderate", shape: "spark" },
  // Step 7 — Competitiveness: intense, fast radial
  { color: "#FF3300", speed: "fast", direction: "radial", density: "dense", shape: "spark" },
  // Step 8 — Teammate type: collaborative, drift
  { color: "#FF5500", speed: "medium", direction: "drift", density: "moderate", shape: "dot" },
  // Step 9 — Strongest event: power, directional fast
  { color: "#FF4400", speed: "fast", direction: "directional", density: "dense", shape: "line" },
  // Step 10 — Fear: tension, slow radial
  { color: "#CC3300", speed: "slow", direction: "radial", density: "sparse", shape: "dot" },
  // Step 11 — Motivation: energy burst
  { color: "#FF6B1A", speed: "fast", direction: "radial", density: "dense", shape: "spark" },
  // Step 12 — Captain vote: leadership, directional
  { color: "#FF5500", speed: "medium", direction: "directional", density: "moderate", shape: "line" },
  // Step 13 — Shirt/health/consent: calm, slow
  { color: "#CC4400", speed: "slow", direction: "drift", density: "sparse", shape: "dot" },
];

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
};

function createParticle(config: ParticleConfig, canvasW: number, canvasH: number): Particle {
  const densityMap = { sparse: 1, moderate: 2, dense: 3 };
  const speedMap = { slow: 0.3, medium: 0.7, fast: 1.4 };
  const speed = speedMap[config.speed] * (0.5 + Math.random() * 0.8);
  const maxLife = 80 + Math.random() * 120;

  let x = Math.random() * canvasW;
  let y = Math.random() * canvasH;
  let vx = 0;
  let vy = 0;

  if (config.direction === "drift") {
    const angle = Math.random() * Math.PI * 2;
    vx = Math.cos(angle) * speed * 0.4;
    vy = Math.sin(angle) * speed * 0.4 - speed * 0.3; // slight upward bias
  } else if (config.direction === "radial") {
    const cx = canvasW / 2;
    const cy = canvasH / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    vx = (dx / dist) * speed;
    vy = (dy / dist) * speed;
  } else if (config.direction === "directional") {
    vx = (Math.random() - 0.3) * speed * 0.5;
    vy = -speed; // upward
  }

  const size = config.shape === "line" ? 1 + Math.random() * 2 : 1.5 + Math.random() * 2.5;

  return { x, y, vx, vy, life: 0, maxLife, size };
}

interface StepParticlesProps {
  step: number;
  className?: string;
}

export default function StepParticles({ step, className = "" }: StepParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const configRef = useRef<ParticleConfig>(STEP_PARTICLE_CONFIGS[0]);

  // Update config when step changes (no remount)
  useEffect(() => {
    configRef.current = STEP_PARTICLE_CONFIGS[step] ?? STEP_PARTICLE_CONFIGS[0];
  }, [step]);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const config = configRef.current;
    const densityMap = { sparse: 25, moderate: 50, dense: 90 };
    const targetCount = densityMap[config.density];

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Spawn new particles to maintain density
    while (particlesRef.current.length < targetCount) {
      particlesRef.current.push(createParticle(config, canvas.width, canvas.height));
    }

    // Update and draw
    particlesRef.current = particlesRef.current.filter((p) => {
      p.life++;
      p.x += p.vx;
      p.y += p.vy;

      // Fade in/out
      const progress = p.life / p.maxLife;
      const alpha = progress < 0.2
        ? progress / 0.2
        : progress > 0.8
        ? (1 - progress) / 0.2
        : 1;

      ctx.save();
      ctx.globalAlpha = alpha * 0.6;

      if (config.shape === "line") {
        ctx.strokeStyle = config.color;
        ctx.lineWidth = p.size * 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 6, p.y - p.vy * 6);
        ctx.stroke();
      } else if (config.shape === "spark") {
        ctx.fillStyle = config.color;
        ctx.shadowColor = config.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = config.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      return p.life < p.maxLife;
    });

    animFrameRef.current = requestAnimationFrame(animate);
  }, []) // Empty dependency array - animate is self-referential via requestAnimationFrame

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
    />
  );
}
