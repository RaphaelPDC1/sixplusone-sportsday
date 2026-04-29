import React, { useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface HeroProps {
  trustBadge?: { text: string; icons?: string[] };
  headline: { line1: string; line2: string };
  subtitle: string;
  buttons?: {
    primary?: { text: string; onClick?: () => void };
    secondary?: { text: string; onClick?: () => void };
  };
  className?: string;
}

// ─── WebGL Shader Source (cosmic fire / nebula — dark orange palette) ─────────

const defaultShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}

float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}

float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}

float clouds(vec2 p) {
  float d=1., t=.0;
  for (float i=.0; i<3.; i++) {
    float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
    t=mix(t,d,a);
    d=a;
    p*=2./(i+1.);
  }
  return t;
}

void main(void) {
  vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
  vec3 col=vec3(0);
  float bg=clouds(vec2(st.x+T*.5,-st.y));
  uv*=1.-.3*(sin(T*.2)*.5+.5);
  for (float i=1.; i<12.; i++) {
    uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
    vec2 p=uv;
    float d=length(p);
    // Shift palette toward deep orange/red/amber
    col+=.00125/d*(cos(sin(i)*vec3(0.8,0.3,0.05))+1.);
    float b=noise(i+p+bg*1.731);
    col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
    col=mix(col,vec3(bg*.35,bg*.12,bg*.02),d);
  }
  // Darken overall to keep text readable — 6+1 brand dark
  col *= 0.35;
  O=vec4(col,1);
}`;

// ─── WebGL Renderer ───────────────────────────────────────────────────────────

class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram | null = null;
  private vs: WebGLShader | null = null;
  private fs: WebGLShader | null = null;
  private buffer: WebGLBuffer | null = null;
  private scale: number;
  private mouseMove = [0, 0];
  private mouseCoords = [0, 0];
  private pointerCoords = [0, 0];
  private nbrOfPointers = 0;

  private vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`;

  private vertices = [-1, 1, -1, -1, 1, 1, 1, -1];

  constructor(canvas: HTMLCanvasElement, scale: number) {
    this.canvas = canvas;
    this.scale = scale;
    this.gl = canvas.getContext("webgl2")!;
    if (this.gl) {
      this.gl.viewport(0, 0, canvas.width * scale, canvas.height * scale);
    }
  }

  updateMove(deltas: number[]) { this.mouseMove = deltas; }
  updateMouse(coords: number[]) { this.mouseCoords = coords; }
  updatePointerCoords(coords: number[]) { this.pointerCoords = coords; }
  updatePointerCount(nbr: number) { this.nbrOfPointers = nbr; }

  updateScale(scale: number) {
    this.scale = scale;
    if (this.gl) this.gl.viewport(0, 0, this.canvas.width * scale, this.canvas.height * scale);
  }

  compile(shader: WebGLShader, source: string) {
    const gl = this.gl;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    }
  }

  test(source: string) {
    const gl = this.gl;
    const shader = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const result = gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? null : gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    return result;
  }

  reset() {
    const gl = this.gl;
    if (this.program && !gl.getProgramParameter(this.program, gl.DELETE_STATUS)) {
      if (this.vs) { gl.detachShader(this.program, this.vs); gl.deleteShader(this.vs); }
      if (this.fs) { gl.detachShader(this.program, this.fs); gl.deleteShader(this.fs); }
      gl.deleteProgram(this.program);
    }
  }

  setup(source = defaultShaderSource) {
    const gl = this.gl;
    if (!gl) return;
    this.vs = gl.createShader(gl.VERTEX_SHADER)!;
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    this.compile(this.vs, this.vertexSrc);
    this.compile(this.fs, source);
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, this.vs);
    gl.attachShader(this.program, this.fs);
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(this.program));
    }
  }

  init() {
    const gl = this.gl;
    const program = this.program!;
    if (!gl || !program) return;
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    (program as any).resolution = gl.getUniformLocation(program, "resolution");
    (program as any).time = gl.getUniformLocation(program, "time");
    (program as any).move = gl.getUniformLocation(program, "move");
    (program as any).touch = gl.getUniformLocation(program, "touch");
    (program as any).pointerCount = gl.getUniformLocation(program, "pointerCount");
    (program as any).pointers = gl.getUniformLocation(program, "pointers");
  }

  render(now = 0) {
    const gl = this.gl;
    const program = this.program;
    if (!gl || !program || gl.getProgramParameter(program, gl.DELETE_STATUS)) return;
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.uniform2f((program as any).resolution, this.canvas.width, this.canvas.height);
    gl.uniform1f((program as any).time, now * 1e-3);
    gl.uniform2f((program as any).move, ...this.mouseMove as [number, number]);
    gl.uniform2f((program as any).touch, ...this.mouseCoords as [number, number]);
    gl.uniform1i((program as any).pointerCount, this.nbrOfPointers);
    gl.uniform2fv((program as any).pointers, this.pointerCoords);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

// ─── Pointer Handler ──────────────────────────────────────────────────────────

class PointerHandler {
  private scale: number;
  private active = false;
  private pointers = new Map<number, number[]>();
  private lastCoords = [0, 0];
  private moves = [0, 0];

  constructor(element: HTMLCanvasElement, scale: number) {
    this.scale = scale;
    const map = (el: HTMLCanvasElement, sc: number, x: number, y: number) =>
      [x * sc, el.height - y * sc];

    element.addEventListener("pointerdown", (e) => {
      this.active = true;
      this.pointers.set(e.pointerId, map(element, this.scale, e.clientX, e.clientY));
    });
    element.addEventListener("pointerup", (e) => {
      if (this.pointers.size === 1) this.lastCoords = this.first;
      this.pointers.delete(e.pointerId);
      this.active = this.pointers.size > 0;
    });
    element.addEventListener("pointerleave", (e) => {
      if (this.pointers.size === 1) this.lastCoords = this.first;
      this.pointers.delete(e.pointerId);
      this.active = this.pointers.size > 0;
    });
    element.addEventListener("pointermove", (e) => {
      if (!this.active) return;
      this.lastCoords = [e.clientX, e.clientY];
      this.pointers.set(e.pointerId, map(element, this.scale, e.clientX, e.clientY));
      this.moves = [this.moves[0] + e.movementX, this.moves[1] + e.movementY];
    });
  }

  get count() { return this.pointers.size; }
  get move() { return this.moves; }
  get coords() {
    return this.pointers.size > 0 ? Array.from(this.pointers.values()).flat() : [0, 0];
  }
  get first() {
    const first = this.pointers.values().next();
    return first.done ? this.lastCoords : first.value;
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useShaderBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const pointersRef = useRef<PointerHandler | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.max(1, 0.5 * window.devicePixelRatio);

    const resize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth * dpr;
      canvasRef.current.height = window.innerHeight * dpr;
      rendererRef.current?.updateScale(dpr);
    };

    rendererRef.current = new WebGLRenderer(canvas, dpr);
    pointersRef.current = new PointerHandler(canvas, dpr);

    // Check WebGL2 support
    if (!canvas.getContext("webgl2")) {
      console.warn("WebGL2 not supported — shader hero will fall back to dark bg");
      return;
    }

    rendererRef.current.setup(defaultShaderSource);
    rendererRef.current.init();
    resize();

    const loop = (now: number) => {
      if (!rendererRef.current || !pointersRef.current) return;
      rendererRef.current.updateMouse(pointersRef.current.first);
      rendererRef.current.updatePointerCount(pointersRef.current.count);
      rendererRef.current.updatePointerCoords(pointersRef.current.coords);
      rendererRef.current.updateMove(pointersRef.current.move);
      rendererRef.current.render(now);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      rendererRef.current?.reset();
    };
  }, []);

  return canvasRef;
};

// ─── Hero Component ───────────────────────────────────────────────────────────

const AnimatedShaderHero: React.FC<HeroProps> = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = "",
}) => {
  const canvasRef = useShaderBackground();

  return (
    <div className={`relative w-full h-screen overflow-hidden bg-[#0A0A0A] ${className}`}>
      {/* Shader canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ background: "#0A0A0A" }}
      />

      {/* Gradient overlay — ensures text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

      {/* Content */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-white px-5">
        {/* Trust badge */}
        {trustBadge && (
          <div
            className="mb-8"
            style={{ animation: "fadeInDown 0.8s ease-out forwards" }}
          >
            <div className="flex items-center gap-2 px-5 py-2 bg-[#FF5500]/10 backdrop-blur-sm border border-[#FF5500]/30 text-sm font-mono tracking-widest text-[#FF5500]">
              {trustBadge.icons?.map((icon, i) => (
                <span key={i}>{icon}</span>
              ))}
              <span>{trustBadge.text}</span>
            </div>
          </div>
        )}

        {/* Headline */}
        <div className="text-center space-y-0 max-w-5xl mx-auto">
          <h1
            className="font-display leading-none"
            style={{
              fontSize: "clamp(4rem, 14vw, 11rem)",
              background: "linear-gradient(135deg, #FFFFFF 0%, #FF5500 60%, #FF8C00 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "fadeInUp 0.8s ease-out 0.2s both",
            }}
          >
            {headline.line1}
          </h1>
          <h1
            className="font-display leading-none"
            style={{
              fontSize: "clamp(4rem, 14vw, 11rem)",
              background: "linear-gradient(135deg, #FF5500 0%, #FF8C00 50%, #FFB347 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animation: "fadeInUp 0.8s ease-out 0.4s both",
            }}
          >
            {headline.line2}
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="mt-6 max-w-xl text-center font-mono text-sm md:text-base text-[#F2F0EB]/70 leading-relaxed tracking-wide"
          style={{ animation: "fadeInUp 0.8s ease-out 0.6s both" }}
        >
          {subtitle}
        </p>

        {/* CTA Buttons */}
        {buttons && (
          <div
            className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            style={{ animation: "fadeInUp 0.8s ease-out 0.8s both" }}
          >
            {buttons.primary && (
              <button
                onClick={buttons.primary.onClick}
                className="px-10 py-5 bg-[#FF5500] text-[#0A0A0A] font-display text-2xl tracking-widest hover:bg-[#F2F0EB] transition-all duration-200 active:scale-95"
              >
                {buttons.primary.text}
              </button>
            )}
            {buttons.secondary && (
              <button
                onClick={buttons.secondary.onClick}
                className="px-10 py-5 border-2 border-[#FF5500]/50 text-[#F2F0EB] font-display text-2xl tracking-widest hover:border-[#FF5500] hover:bg-[#FF5500]/10 transition-all duration-200 active:scale-95 backdrop-blur-sm"
              >
                {buttons.secondary.text}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Keyframe styles */}
      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default AnimatedShaderHero;
