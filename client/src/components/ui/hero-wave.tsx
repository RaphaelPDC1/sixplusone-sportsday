import { useEffect, useRef } from "react";

interface HeroWaveProps {
  className?: string;
  /** RGB tint 0-255 for each channel — shifts the wave palette toward the team colour */
  tint?: { r: number; g: number; b: number };
}

/**
 * HeroWave
 * Pixel-shader style animated wave background.
 * Adapted from dynamic-wave-canvas-background.tsx (pasted_content_15).
 * Pass `tint` to shift the palette toward a team colour.
 */
export function HeroWave({
  className = "absolute inset-0 w-full h-full",
  tint = { r: 0, g: 0, b: 0 },
}: HeroWaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const SCALE = 2;
    let width = 0;
    let height = 0;
    let imageData: ImageData;
    let data: Uint8ClampedArray;

    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth || window.innerWidth;
      canvas.height = canvas.clientHeight || window.innerHeight;
      width = Math.floor(canvas.width / SCALE);
      height = Math.floor(canvas.height / SCALE);
      imageData = ctx.createImageData(width, height);
      data = imageData.data;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const startTime = Date.now();

    const SIN_TABLE = new Float32Array(1024);
    const COS_TABLE = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const angle = (i / 1024) * Math.PI * 2;
      SIN_TABLE[i] = Math.sin(angle);
      COS_TABLE[i] = Math.cos(angle);
    }

    const fastSin = (x: number) => {
      const index = Math.floor(((x % (Math.PI * 2)) / (Math.PI * 2)) * 1024) & 1023;
      return SIN_TABLE[index];
    };

    const fastCos = (x: number) => {
      const index = Math.floor(((x % (Math.PI * 2)) / (Math.PI * 2)) * 1024) & 1023;
      return COS_TABLE[index];
    };

    // Normalised tint (0-1)
    const tr = tint.r / 255;
    const tg = tint.g / 255;
    const tb = tint.b / 255;
    const tintStrength = 0.45; // how strongly to shift toward team colour

    let raf: number;

    const render = () => {
      if (!data) { raf = requestAnimationFrame(render); return; }
      const time = (Date.now() - startTime) * 0.001;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const u_x = (2 * x - width) / height;
          const u_y = (2 * y - height) / height;

          let a = 0;
          let d = 0;

          for (let i = 0; i < 4; i++) {
            a += fastCos(i - d + time * 0.5 - a * u_x);
            d += fastSin(i * u_y + a);
          }

          const wave = (fastSin(a) + fastCos(d)) * 0.5;
          const intensity = 0.3 + 0.4 * wave;
          const baseVal = 0.1 + 0.15 * fastCos(u_x + u_y + time * 0.3);
          const blueAccent = 0.2 * fastSin(a * 1.5 + time * 0.2);
          const purpleAccent = 0.15 * fastCos(d * 2 + time * 0.1);

          // Base wave colours (blue/purple palette from original)
          let r = Math.max(0, Math.min(1, baseVal + purpleAccent * 0.8)) * intensity;
          let g = Math.max(0, Math.min(1, baseVal + blueAccent * 0.6)) * intensity;
          let b = Math.max(0, Math.min(1, baseVal + blueAccent * 1.2 + purpleAccent * 0.4)) * intensity;

          // Blend toward team tint colour
          r = r * (1 - tintStrength) + tr * intensity * tintStrength;
          g = g * (1 - tintStrength) + tg * intensity * tintStrength;
          b = b * (1 - tintStrength) + tb * intensity * tintStrength;

          const idx = (y * width + x) * 4;
          data[idx]     = r * 255;
          data[idx + 1] = g * 255;
          data[idx + 2] = b * 255;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      if (SCALE > 1) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(canvas, 0, 0, width, height, 0, 0, canvas.width, canvas.height);
      }

      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [tint.r, tint.g, tint.b]);

  return <canvas ref={canvasRef} className={className} />;
}
