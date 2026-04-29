import { useState, useEffect } from "react";

interface TeamLiveFeaturesProps {
  teamColor: "red" | "blue" | "pink" | "orange";
  teamName: string;
  memberCount: number;
}

export function TeamLiveFeatures({ teamColor, teamName, memberCount }: TeamLiveFeaturesProps) {
  const [heatScore, setHeatScore] = useState(45);
  const [strategyNotes, setStrategyNotes] = useState([
    "Focus on relay timing",
    "Red team weak on endurance",
    "Practice handoffs",
  ]);
  const [energyFeed, setEnergyFeed] = useState([
    { name: "Alex", action: "unlocked reveal" },
    { name: "Jordan", action: "just joined" },
    { name: "Casey", action: "posted strategy note" },
  ]);
  const [chaosMeter, setChaosMeter] = useState(62);

  // Simulate live updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (teamColor === "red") {
        setHeatScore((s) => Math.min(100, s + Math.random() * 10 - 2));
      } else if (teamColor === "orange") {
        setChaosMeter((m) => Math.random() * 100);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [teamColor]);

  if (teamColor === "red") {
    return (
      <div className="space-y-4 mt-6">
        <div className="border border-[#B80000]/30 bg-[#B80000]/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[#B80000] tracking-widest">HEAT SCORE</span>
            <span className="font-bebas text-2xl text-[#B80000]">{Math.round(heatScore)}%</span>
          </div>
          <div className="w-full h-2 bg-[#B80000]/20 overflow-hidden">
            <div
              className="h-full bg-[#B80000] transition-all duration-300"
              style={{ width: `${heatScore}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-white/40 mt-2">
            Resets daily. Rises when team members interact.
          </p>
        </div>
      </div>
    );
  }

  if (teamColor === "blue") {
    return (
      <div className="space-y-4 mt-6">
        <div className="border border-[#1A4FE8]/30 bg-[#1A4FE8]/5 p-4">
          <div className="font-mono text-xs text-[#1A4FE8] tracking-widest mb-3">STRATEGY BOARD</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {strategyNotes.map((note, i) => (
              <div key={i} className="p-2 bg-white/5 border border-white/10 text-white/70 text-xs font-mono">
                • {note}
              </div>
            ))}
          </div>
          <input
            type="text"
            placeholder="Add a note (max 60 chars)"
            maxLength={60}
            className="w-full mt-3 bg-transparent border-b border-[#1A4FE8]/30 text-white text-xs placeholder-white/30 focus:outline-none focus:border-[#1A4FE8] py-1"
          />
        </div>
      </div>
    );
  }

  if (teamColor === "pink") {
    return (
      <div className="space-y-4 mt-6">
        <div className="border border-[#F72B8C]/30 bg-[#F72B8C]/5 p-4">
          <div className="font-mono text-xs text-[#F72B8C] tracking-widest mb-3">ENERGY FEED</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {energyFeed.map((item, i) => (
              <div key={i} className="text-white/60 text-xs font-mono">
                <span className="text-[#F72B8C]">{item.name}</span>
                <span className="text-white/40"> just {item.action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (teamColor === "orange") {
    return (
      <div className="space-y-4 mt-6">
        <div className="border border-[#FF6B00]/30 bg-[#FF6B00]/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[#FF6B00] tracking-widest">CHAOS METER</span>
            <span className="font-bebas text-2xl text-[#FF6B00]">{Math.round(chaosMeter)}%</span>
          </div>
          <div className="w-full h-2 bg-[#FF6B00]/20 overflow-hidden">
            <div
              className="h-full bg-[#FF6B00] transition-all duration-300"
              style={{ width: `${chaosMeter}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-white/40 mt-2">
            Resets every 4–6 hours. Fills unpredictably.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
