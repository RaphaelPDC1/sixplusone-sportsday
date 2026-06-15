import React from "react";

const TEAM_CAPTAINS = {
  red: {
    color: "#E8232A",
    name: "TEAM RED",
    teamName: "RELENTLESS",
    captains: [
      { name: "Queen", role: "Co-Captain" },
      { name: "Slew", role: "Co-Captain" },
    ],
  },
  blue: {
    color: "#1A4FE8",
    name: "TEAM BLUE",
    teamName: "THE VILLAINS",
    captains: [
      { name: "Chigz", role: "Co-Captain" },
      { name: "Axel", role: "Co-Captain" },
    ],
  },
  pink: {
    color: "#F72B8C",
    name: "TEAM PINK",
    teamName: "UNRULY",
    captains: [
      { name: "Verity", role: "Co-Captain" },
      { name: "Henry", role: "Co-Captain" },
    ],
  },
  orange: {
    color: "#FF6B00",
    name: "TEAM ORANGE",
    teamName: "CHAOS",
    captains: [
      { name: "Nahal", role: "Co-Captain" },
      { name: "George", role: "Co-Captain" },
    ],
  },
};

export function TeamCaptainsSection() {
  return (
    <div className="space-y-4">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em]">TEAM CAPTAINS</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(Object.entries(TEAM_CAPTAINS) as Array<[string, typeof TEAM_CAPTAINS.red]>).map(
          ([teamKey, team]) => (
            <div
              key={teamKey}
              className="border p-5 bg-[#0D0D0D] transition-all"
              style={{
                borderColor: team.color + "4D", // 30% opacity in hex
              }}
            >
              {/* Team Color Bar */}
              <div
                className="h-1 w-full mb-4"
                style={{ backgroundColor: team.color }}
              />

              {/* Team Name */}
              <p
                className="font-display text-lg tracking-widest mb-1"
                style={{ color: team.color }}
              >
                {team.name}
              </p>

              {/* Team Badge */}
              <p className="font-mono text-[#444] text-xs tracking-wider mb-4">
                {team.teamName}
              </p>

              {/* Captains */}
              <div className="space-y-2">
                {team.captains.map((captain, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="font-display text-sm tracking-wide text-[#F2F0EB]">
                      {captain.name}
                    </p>
                    <p
                      className="font-mono text-xs tracking-wider"
                      style={{ color: team.color, opacity: 0.7 }}
                    >
                      {captain.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
