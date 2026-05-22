import { useLocation } from "wouter";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB] flex flex-col">
      <div className="h-[2px] bg-[#FF5500]" />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <img
          src={LOGO_URL}
          alt="6+1"
          className="h-8 w-auto mb-10 opacity-30"
          style={{ filter: "invert(1)" }}
        />
        <p className="font-mono text-[#444] text-xs tracking-[0.3em] mb-4">ERROR 404</p>
        <h1
          className="font-display text-[#F2F0EB] leading-none mb-3"
          style={{ fontSize: "clamp(4rem, 20vw, 8rem)" }}
        >
          OUT OF<br />
          <span className="text-[#FF5500]">BOUNDS.</span>
        </h1>
        <p className="font-mono text-[#F2F0EB]/30 text-xs tracking-wider max-w-[260px] mb-10">
          That page doesn't exist. Head back and try again.
        </p>
        <button
          onClick={() => setLocation("/")}
          className="border border-[#FF5500]/40 text-[#FF5500] font-mono text-sm tracking-widest px-8 py-4 hover:bg-[#FF5500]/5 transition-all"
        >
          ← BACK TO START
        </button>
      </div>
    </div>
  );
}
