import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

// Polls every 30 seconds for the live event
export function NowHappening() {
  const { data: liveEvent, refetch } = trpc.sportsday.getLiveEvent.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!liveEvent) return;
    const interval = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(interval);
  }, [liveEvent]);

  if (!liveEvent) return null;

  return (
    <div
      className="w-full border border-[#FF5500]/40 bg-[#0A0A0A] overflow-hidden"
      style={{ boxShadow: "0 0 30px rgba(255,85,0,0.15)" }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#FF5500]/10 border-b border-[#FF5500]/30">
        <div className="relative flex items-center justify-center w-3 h-3">
          <div
            className="absolute w-3 h-3 rounded-full bg-[#FF5500]"
            style={{
              opacity: pulse ? 1 : 0.5,
              transform: pulse ? "scale(1.2)" : "scale(1)",
              transition: "all 0.6s ease",
            }}
          />
          <div
            className="absolute w-5 h-5 rounded-full border border-[#FF5500]"
            style={{
              opacity: pulse ? 0.4 : 0,
              transform: pulse ? "scale(1.4)" : "scale(1)",
              transition: "all 0.6s ease",
            }}
          />
        </div>
        <span className="font-display text-[#FF5500] tracking-[0.3em] text-sm">LIVE NOW</span>
      </div>

      {/* Event info */}
      <div className="px-4 py-4">
        <h3 className="font-display text-white tracking-widest text-xl mb-1">
          {liveEvent.eventName}
        </h3>
        <div className="flex flex-wrap gap-3 mt-2">
          {(liveEvent.startTime || liveEvent.endTime) && (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#FF5500]/60" />
              <span className="font-mono text-white/50 text-xs">
                {liveEvent.startTime}
                {liveEvent.endTime ? ` – ${liveEvent.endTime}` : ""}
              </span>
            </div>
          )}
          {liveEvent.location && (
            <div className="flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-[#FF5500]/60" />
              <span className="font-mono text-white/50 text-xs">{liveEvent.location}</span>
            </div>
          )}
        </div>
        {liveEvent.description && (
          <p className="font-mono text-white/40 text-xs mt-2 leading-relaxed">
            {liveEvent.description}
          </p>
        )}
        {(liveEvent as any).upNext && (
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
            <span className="font-mono text-white/25 text-[10px] tracking-[0.2em] uppercase">Up next:</span>
            <span className="font-mono text-white/50 text-[10px]">{(liveEvent as any).upNext.eventName}</span>
            {(liveEvent as any).upNext.startTime && (
              <span className="font-mono text-white/30 text-[10px]">· {(liveEvent as any).upNext.startTime}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for use in headers / small spaces
export function NowHappeningBadge() {
  const { data: liveEvent } = trpc.sportsday.getLiveEvent.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!liveEvent) return;
    const interval = setInterval(() => setPulse((p) => !p), 1200);
    return () => clearInterval(interval);
  }, [liveEvent]);

  if (!liveEvent) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 border border-[#FF5500]/40 bg-[#FF5500]/10">
      <div
        className="w-2 h-2 rounded-full bg-[#FF5500] transition-all duration-500"
        style={{ opacity: pulse ? 1 : 0.4, transform: pulse ? "scale(1.3)" : "scale(1)" }}
      />
      <span className="font-display text-[#FF5500] text-xs tracking-[0.2em]">
        {liveEvent.eventName}
      </span>
    </div>
  );
}
