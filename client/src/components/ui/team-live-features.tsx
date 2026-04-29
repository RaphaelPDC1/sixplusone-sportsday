import { useState, useEffect, useRef } from "react";

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
  const [noteInput, setNoteInput] = useState("");
  const [energyFeed, setEnergyFeed] = useState([
    { name: "Alex", action: "unlocked reveal", timestamp: Date.now() },
    { name: "Jordan", action: "just joined", timestamp: Date.now() - 60000 },
    { name: "Casey", action: "posted strategy note", timestamp: Date.now() - 120000 },
  ]);
  const [chaosMeter, setChaosMeter] = useState(62);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate live updates for all teams
  useEffect(() => {
    if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);

    if (teamColor === "red") {
      // Heat Score: gradually increases with random fluctuations
      updateIntervalRef.current = setInterval(() => {
        setHeatScore((s) => {
          const newScore = s + (Math.random() * 8 - 2);
          return Math.max(0, Math.min(100, newScore));
        });
      }, 3000);
    } else if (teamColor === "blue") {
      // Strategy Board: simulate occasional new notes from team members
      updateIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.7) {
          const sampleNotes = [
            "Adjust pacing for 400m",
            "Warm up 15 mins early",
            "Focus on transitions",
            "Hydrate between events",
            "Check shoe fit before race",
          ];
          const randomNote = sampleNotes[Math.floor(Math.random() * sampleNotes.length)];
          setStrategyNotes((prev) => [randomNote, ...prev.slice(0, 2)]);
        }
      }, 5000);
    } else if (teamColor === "pink") {
      // Energy Feed: simulate activity from team members
      updateIntervalRef.current = setInterval(() => {
        if (Math.random() > 0.6) {
          const names = ["Alex", "Jordan", "Casey", "Morgan", "Sam"];
          const actions = [
            "posted a comment",
            "liked a post",
            "joined the chat",
            "shared energy",
            "cheered on teammates",
          ];
          const randomName = names[Math.floor(Math.random() * names.length)];
          const randomAction = actions[Math.floor(Math.random() * actions.length)];
          setEnergyFeed((prev) => [
            { name: randomName, action: randomAction, timestamp: Date.now() },
            ...prev.slice(0, 2),
          ]);
        }
      }, 4000);
    } else if (teamColor === "orange") {
      // Chaos Meter: unpredictable spikes and drops
      updateIntervalRef.current = setInterval(() => {
        setChaosMeter((m) => {
          const change = (Math.random() - 0.5) * 40;
          return Math.max(0, Math.min(100, m + change));
        });
      }, 2500);
    }

    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, [teamColor]);

  const handleAddNote = () => {
    if (noteInput.trim()) {
      setStrategyNotes((prev) => [noteInput, ...prev.slice(0, 2)]);
      setNoteInput("");
    }
  };

  if (teamColor === "red") {
    return (
      <div className="space-y-4 mt-6">
        <div className="border border-[#B80000]/30 bg-[#B80000]/5 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-[#B80000] tracking-widest">HEAT SCORE</span>
            <span className="font-bebas text-2xl" style={{ color: "#FFFFFF" }}>
              {Math.round(heatScore)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#B80000]/20 overflow-hidden">
            <div
              className="h-full bg-[#B80000] transition-all duration-300"
              style={{ width: `${heatScore}%` }}
            />
          </div>
          <p className="font-mono text-[10px] mt-2" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
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
              <div
                key={i}
                className="p-2 bg-white/5 border border-white/10 text-xs font-mono"
                style={{ color: "rgba(255, 255, 255, 0.7)" }}
              >
                • {note}
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              placeholder="Add a note (max 60 chars)"
              maxLength={60}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAddNote()}
              className="flex-1 bg-transparent border-b border-[#1A4FE8]/30 text-xs py-1 focus:outline-none focus:border-[#1A4FE8]"
              style={{
                color: "#FFFFFF",
              }}
            />
            <button
              onClick={handleAddNote}
              className="font-mono text-[10px] px-2 py-1 border border-[#1A4FE8]/30 hover:border-[#1A4FE8] transition-colors"
              style={{ color: "#1A4FE8" }}
            >
              ADD
            </button>
          </div>
          <style>{`
            input::placeholder {
              color: rgba(255, 255, 255, 0.3);
            }
          `}</style>
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
              <div key={i} className="text-xs font-mono" style={{ color: "rgba(255, 255, 255, 0.6)" }}>
                <span className="text-[#F72B8C]">{item.name}</span>
                <span style={{ color: "rgba(255, 255, 255, 0.4)" }}> {item.action}</span>
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
            <span className="font-bebas text-2xl" style={{ color: "#FFFFFF" }}>
              {Math.round(chaosMeter)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[#FF6B00]/20 overflow-hidden">
            <div
              className="h-full bg-[#FF6B00] transition-all duration-300"
              style={{ width: `${chaosMeter}%` }}
            />
          </div>
          <p className="font-mono text-[10px] mt-2" style={{ color: "rgba(255, 255, 255, 0.4)" }}>
            Resets every 4–6 hours. Fills unpredictably.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
