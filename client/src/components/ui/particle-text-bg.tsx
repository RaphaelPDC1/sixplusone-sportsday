import { useEffect, useRef } from "react";
import type React from "react";

interface Vector2D { x: number; y: number }

class Particle {
  pos: Vector2D = { x: 0, y: 0 };
  vel: Vector2D = { x: 0, y: 0 };
  acc: Vector2D = { x: 0, y: 0 };
  target: Vector2D = { x: 0, y: 0 };
  closeEnoughTarget = 100;
  maxSpeed = 1.0;
  maxForce = 0.1;
  particleSize = 10;
  isKilled = false;
  startColor = { r: 0, g: 0, b: 0 };
  targetColor = { r: 0, g: 0, b: 0 };
  colorWeight = 0;
  colorBlendRate = 0.01;

  move() {
    const dx = this.target.x - this.pos.x;
    const dy = this.target.y - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const prox = dist < this.closeEnoughTarget ? dist / this.closeEnoughTarget : 1;
    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
    const tx = (dx / mag) * this.maxSpeed * prox;
    const ty = (dy / mag) * this.maxSpeed * prox;
    const sx = tx - this.vel.x;
    const sy = ty - this.vel.y;
    const sm = Math.sqrt(sx * sx + sy * sy) || 1;
    this.acc.x += (sx / sm) * this.maxForce;
    this.acc.y += (sy / sm) * this.maxForce;
    this.vel.x += this.acc.x; this.vel.y += this.acc.y;
    this.pos.x += this.vel.x; this.pos.y += this.vel.y;
    this.acc.x = 0; this.acc.y = 0;
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (this.colorWeight < 1) this.colorWeight = Math.min(this.colorWeight + this.colorBlendRate, 1);
    const r = Math.round(this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight);
    const g = Math.round(this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight);
    const b = Math.round(this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(this.pos.x, this.pos.y, 2, 2);
  }

  kill(w: number, h: number) {
    if (!this.isKilled) {
      const rp = randomPos(w / 2, h / 2, (w + h) / 2);
      this.target.x = rp.x; this.target.y = rp.y;
      this.startColor = {
        r: this.startColor.r + (this.targetColor.r - this.startColor.r) * this.colorWeight,
        g: this.startColor.g + (this.targetColor.g - this.startColor.g) * this.colorWeight,
        b: this.startColor.b + (this.targetColor.b - this.startColor.b) * this.colorWeight,
      };
      this.targetColor = { r: 0, g: 0, b: 0 };
      this.colorWeight = 0;
      this.isKilled = true;
    }
  }
}

function randomPos(cx: number, cy: number, mag: number): Vector2D {
  const rx = Math.random() * 1000, ry = Math.random() * 500;
  const dx = rx - cx, dy = ry - cy;
  const m = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: cx + (dx / m) * mag, y: cy + (dy / m) * mag };
}

interface ParticleTextBgProps {
  /** Words to cycle through */
  words?: string[];
  /** Milliseconds between word transitions (default 3000) */
  interval?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ParticleTextBg
 * Full-canvas particle animation that assembles and dissolves text words.
 * Adapted from particle-text-effect.tsx (pasted_content_13).
 */
export function ParticleTextBg({
  words = ["SPORTS DAY", "002", "GET READY", "YOUR TEAM", "AWAITS"],
  interval = 3000,
  className = "absolute inset-0 w-full h-full",
  style,
}: ParticleTextBgProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    particles: [] as Particle[],
    wordIndex: 0,
    lastSwitch: 0,
    raf: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const PIXEL_STEPS = 6;
    const state = stateRef.current;

    const loadWord = (word: string) => {
      // Guard: canvas must have non-zero dimensions before getImageData
      if (!canvas.width || !canvas.height) return;
      const off = document.createElement("canvas");
      off.width = canvas.width;
      off.height = canvas.height;
      const octx = off.getContext("2d")!;
      // Responsive font size
      const fs = Math.min(canvas.width / (word.length * 0.6), canvas.height * 0.35, 120);
      octx.fillStyle = "white";
      octx.font = `bold ${fs}px 'Space Mono', monospace`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillText(word, canvas.width / 2, canvas.height / 2);

      const imgData = octx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;

      // Orange palette matching site accent
      const colors = [
        { r: 255, g: 85, b: 0 },
        { r: 255, g: 122, b: 46 },
        { r: 242, g: 240, b: 235 },
        { r: 255, g: 51, b: 0 },
      ];
      const newColor = colors[Math.floor(Math.random() * colors.length)];

      const coords: number[] = [];
      for (let i = 0; i < pixels.length; i += PIXEL_STEPS * 4) coords.push(i);
      // Shuffle
      for (let i = coords.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [coords[i], coords[j]] = [coords[j], coords[i]];
      }

      let pi = 0;
      for (const ci of coords) {
        if (pixels[ci + 3] > 0) {
          const x = (ci / 4) % canvas.width;
          const y = Math.floor(ci / 4 / canvas.width);
          let p: Particle;
          if (pi < state.particles.length) {
            p = state.particles[pi];
            p.isKilled = false;
            pi++;
          } else {
            p = new Particle();
            const rp = randomPos(canvas.width / 2, canvas.height / 2, (canvas.width + canvas.height) / 2);
            p.pos.x = rp.x; p.pos.y = rp.y;
            p.maxSpeed = Math.random() * 6 + 4;
            p.maxForce = p.maxSpeed * 0.05;
            p.particleSize = Math.random() * 6 + 6;
            p.colorBlendRate = Math.random() * 0.0275 + 0.0025;
            state.particles.push(p);
          }
          p.startColor = {
            r: p.startColor.r + (p.targetColor.r - p.startColor.r) * p.colorWeight,
            g: p.startColor.g + (p.targetColor.g - p.startColor.g) * p.colorWeight,
            b: p.startColor.b + (p.targetColor.b - p.startColor.b) * p.colorWeight,
          };
          p.targetColor = newColor;
          p.colorWeight = 0;
          p.target.x = x; p.target.y = y;
        }
      }
      for (let i = pi; i < state.particles.length; i++) {
        state.particles[i].kill(canvas.width, canvas.height);
      }
    };

    // Load first word
    loadWord(words[0]);
    state.lastSwitch = performance.now();

    const animate = (now: number) => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.06)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        p.move();
        p.draw(ctx);
        if (p.isKilled && (p.pos.x < 0 || p.pos.x > canvas.width || p.pos.y < 0 || p.pos.y > canvas.height)) {
          state.particles.splice(i, 1);
        }
      }

      if (now - state.lastSwitch > interval) {
        state.wordIndex = (state.wordIndex + 1) % words.length;
        loadWord(words[state.wordIndex]);
        state.lastSwitch = now;
      }

      state.raf = requestAnimationFrame(animate);
    };
    state.raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(state.raf);
      window.removeEventListener("resize", resize);
    };
  }, [words, interval]);

  return <canvas ref={canvasRef} className={className} style={style} />;
}
