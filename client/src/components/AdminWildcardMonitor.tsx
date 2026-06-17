/**
 * Admin Wildcard Monitor
 * View active wildcards, votes, and manage resolutions
 * Standalone — no required props, includes event selector
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";

const TEAM_COLORS: Record<string, string> = {
  red: "#FF4444",
  blue: "#4488FF",
  pink: "#FF66CC",
  orange: "#FF8800",
};

const WILDCARD_LABELS: Record<string, string> = {
  steal: "👤 STEAL",
  sabotage: "💣 SABOTAGE",
  block: "🛡️ BLOCK",
  double_down: "×2 DOUBLE DOWN",
  all_in: "🎲 ALL IN",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#FF8800",
  active: "#00FF88",
  resolved: "#4488FF",
  blocked: "#FF4444",
  failed: "#555",
};

export function AdminWildcardMonitor() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const events = trpc.scoring.getEvents.useQuery();
  const wildcards = trpc.wildcards.getEventWildcards.useQuery(
    { eventId: selectedEventId ?? 0 },
    { enabled: selectedEventId !== null && selectedEventId > 0, refetchInterval: 5_000 }
  );

  const activeWildcards = (wildcards.data ?? []).filter(
    (w) => w.status === "active" || w.status === "pending"
  );
  const allWildcards = wildcards.data ?? [];

  return (
    <div className="space-y-6 font-mono">
      {/* Event selector */}
      <div>
        <div className="text-xs text-[#555] tracking-widest mb-2">SELECT EVENT</div>
        <div className="flex flex-wrap gap-2">
          {(events.data ?? []).map((ev) => (
            <button
              key={ev.id}
              onClick={() => setSelectedEventId(Number(ev.id))}
              className="px-3 py-1.5 text-xs tracking-widest border transition-colors"
              style={{
                borderColor: selectedEventId === Number(ev.id) ? "#FF5500" : "#222",
                color: selectedEventId === Number(ev.id) ? "#FF5500" : "#555",
                background: selectedEventId === Number(ev.id) ? "#FF550010" : "transparent",
              }}
            >
              {ev.name}
            </button>
          ))}
        </div>
      </div>

      {selectedEventId === null ? (
        <p className="text-xs text-[#444] tracking-wider">Select an event to view wildcards.</p>
      ) : wildcards.isLoading ? (
        <p className="text-xs text-[#444] tracking-wider">Loading...</p>
      ) : allWildcards.length === 0 ? (
        <p className="text-xs text-[#444] tracking-wider">No wildcards for this event yet.</p>
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-4 text-xs text-[#555] tracking-wider">
            <span>{activeWildcards.length} active</span>
            <span>{allWildcards.filter((w) => w.status === "resolved").length} resolved</span>
            <span>{allWildcards.filter((w) => w.status === "blocked").length} blocked</span>
          </div>

          {/* Wildcard list */}
          {allWildcards.map((wc) => {
            const ownerColor = TEAM_COLORS[wc.ownerTeam] ?? "#fff";
            const targetColor = wc.targetTeam ? (TEAM_COLORS[wc.targetTeam] ?? "#fff") : null;
            const statusColor = STATUS_COLORS[wc.status] ?? "#555";
            const isExpanded = expandedId === wc.id;

            return (
              <div
                key={wc.id}
                className="border transition-all"
                style={{ borderColor: `${ownerColor}30` }}
              >
                {/* Header row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : wc.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm tracking-widest" style={{ color: ownerColor }}>
                      {WILDCARD_LABELS[wc.type] ?? wc.type.toUpperCase()}
                    </div>
                    <div className="text-xs text-[#555]">
                      <span style={{ color: ownerColor }}>{wc.ownerTeam.toUpperCase()}</span>
                      {wc.targetTeam && (
                        <>
                          {" → "}
                          <span style={{ color: targetColor ?? "#fff" }}>{wc.targetTeam.toUpperCase()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-[10px] tracking-widest px-2 py-0.5 border"
                      style={{ color: statusColor, borderColor: `${statusColor}40` }}
                    >
                      {wc.status.toUpperCase()}
                    </span>
                    <span className="text-[#333] text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    className="px-4 pb-4 border-t space-y-3"
                    style={{ borderColor: `${ownerColor}20` }}
                  >
                    <div className="grid grid-cols-2 gap-3 text-xs mt-3">
                      <div>
                        <div className="text-[#444] tracking-wider mb-1">OWNER TEAM</div>
                        <div style={{ color: ownerColor }}>{wc.ownerTeam.toUpperCase()}</div>
                      </div>
                      {wc.targetTeam && (
                        <div>
                          <div className="text-[#444] tracking-wider mb-1">TARGET TEAM</div>
                          <div style={{ color: targetColor ?? "#fff" }}>{wc.targetTeam.toUpperCase()}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[#444] tracking-wider mb-1">CREATED</div>
                        <div className="text-[#888]">{new Date(wc.createdAt).toLocaleTimeString()}</div>
                      </div>
                      {wc.resolvedAt && (
                        <div>
                          <div className="text-[#444] tracking-wider mb-1">RESOLVED</div>
                          <div className="text-[#888]">{new Date(wc.resolvedAt).toLocaleTimeString()}</div>
                        </div>
                      )}
                    </div>

                    {(wc.status === "pending" || wc.status === "active") && (
                      <div
                        className="p-3 border text-xs"
                        style={{ borderColor: "#FF880030", background: "#FF880008" }}
                      >
                        <div className="text-[#FF8800] tracking-wider mb-1">VOTE THRESHOLD</div>
                        <div className="text-[#888]">Requires captain YES + 75% team weight</div>
                      </div>
                    )}

                    {wc.status === "active" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          className="flex-1 py-2 text-xs tracking-widest border transition-colors"
                          style={{ borderColor: "#00FF8840", color: "#00FF88", background: "#00FF8808" }}
                        >
                          APPROVE
                        </button>
                        <button
                          className="flex-1 py-2 text-xs tracking-widest border transition-colors"
                          style={{ borderColor: "#FF444440", color: "#FF4444", background: "#FF444408" }}
                        >
                          BLOCK
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
