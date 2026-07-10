/**
 * Admin Power Up Monitor
 * View active power ups, votes, and manage resolutions
 * Standalone — no required props, includes event selector.
 * Auto-selects the first ARMED or LIVE event when data loads.
 * BLOCK button shows a team target picker before confirming.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

const TEAM_COLORS: Record<string, string> = {
  red: "#FF4444",
  blue: "#4488FF",
  pink: "#FF66CC",
  orange: "#FF8800",
};

const POWER_UP_LABELS: Record<string, string> = {
  boost: "⚡ BOOST",
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

/** Colour-coded pill for event status */
function EventStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { color: string; bg: string }> = {
    armed:    { color: "#FF8800", bg: "#FF880018" },
    live:     { color: "#00FF88", bg: "#00FF8818" },
    briefing: { color: "#FFDD00", bg: "#FFDD0018" },
    complete: { color: "#4488FF", bg: "#4488FF18" },
    delayed:  { color: "#FF4444", bg: "#FF444418" },
    upcoming: { color: "#555",    bg: "transparent" },
  };
  const c = colors[status] ?? colors.upcoming;
  return (
    <span
      className="text-[9px] tracking-widest px-1.5 py-0.5 border"
      style={{ color: c.color, borderColor: `${c.color}40`, background: c.bg }}
    >
      {status.toUpperCase()}
    </span>
  );
}

export function AdminPowerUpMonitor() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  // Block target picker state: wildcardId -> chosen target team
  const [blockPicking, setBlockPicking] = useState<number | null>(null);
  const [blockTarget, setBlockTarget] = useState<Record<number, string>>({});

  const events = trpc.scoring.getEvents.useQuery(undefined, { refetchInterval: 10_000 });
  const wildcards = trpc.powerUps.getEventWildcards.useQuery(
    { eventId: selectedEventId ?? 0 },
    { enabled: selectedEventId !== null && selectedEventId > 0, refetchInterval: 5_000 }
  );

  // Auto-select the first ARMED or LIVE event when events load
  useEffect(() => {
    if (!events.data || selectedEventId !== null) return;
    const active = events.data.find((e) => e.status === "armed" || e.status === "live");
    if (active) setSelectedEventId(Number(active.id));
  }, [events.data, selectedEventId]);

  const approveMutation = trpc.powerUps.adminResolvePowerUp.useMutation({
    onSuccess: () => wildcards.refetch(),
    onError: (e) => alert(e.message),
  });

  const blockMutation = trpc.powerUps.adminBlockPowerUp.useMutation({
    onSuccess: () => {
      wildcards.refetch();
      setBlockPicking(null);
    },
    onError: (e) => alert(e.message),
  });

  const activeWildcards = (wildcards.data ?? []).filter(
    (w) => w.status === "active" || w.status === "pending"
  );
  const allWildcards = wildcards.data ?? [];

  // Determine whether voting is open for the selected event
  const selectedEvent = (events.data ?? []).find((e) => Number(e.id) === selectedEventId);
  const votingOpen = selectedEvent?.status === "armed" || selectedEvent?.status === "live";

  return (
    <div className="space-y-6 font-mono">
      {/* Voting status banner */}
      {selectedEvent && (
        <div
          className="flex items-center gap-3 px-4 py-3 border"
          style={{
            borderColor: votingOpen ? "#00FF8840" : "#33333380",
            background: votingOpen ? "#00FF8808" : "transparent",
          }}
        >
          <span className="text-base">{votingOpen ? "⚡" : "⏳"}</span>
          <div>
            <div
              className="text-[10px] tracking-widest"
              style={{ color: votingOpen ? "#00FF88" : "#555" }}
            >
              {votingOpen ? "VOTING OPEN" : "VOTING CLOSED"}
            </div>
            <div className="text-[9px] text-[#444] tracking-wider mt-0.5">
              {selectedEvent.name.toUpperCase()} · {selectedEvent.status.toUpperCase()}
            </div>
          </div>
        </div>
      )}

      {/* Event selector */}
      <div>
        <div className="text-xs text-[#555] tracking-widest mb-2">SELECT EVENT</div>
        <div className="flex flex-wrap gap-2">
          {(events.data ?? []).map((ev) => {
            const isSelected = selectedEventId === Number(ev.id);
            const isActive = ev.status === "armed" || ev.status === "live";
            return (
              <button
                key={ev.id}
                onClick={() => setSelectedEventId(Number(ev.id))}
                className="px-3 py-1.5 text-xs tracking-widest border transition-colors flex items-center gap-2"
                style={{
                  borderColor: isSelected ? "#FF5500" : isActive ? "#FF880050" : "#222",
                  color: isSelected ? "#FF5500" : isActive ? "#FF8800" : "#555",
                  background: isSelected ? "#FF550010" : isActive ? "#FF880008" : "transparent",
                }}
              >
                {ev.name}
                <EventStatusBadge status={ev.status} />
              </button>
            );
          })}
        </div>
      </div>

      {selectedEventId === null ? (
        <p className="text-xs text-[#444] tracking-wider">No ARMED or LIVE event found. Select an event above to view power ups.</p>
      ) : wildcards.isLoading ? (
        <p className="text-xs text-[#444] tracking-wider">Loading...</p>
      ) : allWildcards.length === 0 ? (
        <p className="text-xs text-[#444] tracking-wider">
          {votingOpen
            ? "No power ups initiated yet — voting is open."
            : "No power ups for this event."}
        </p>
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
            const isPicking = blockPicking === wc.id;

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
                      {POWER_UP_LABELS[wc.type] ?? wc.type.toUpperCase()}
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
                      <div className="space-y-2 pt-1">
                        {/* ── Block target picker ── */}
                        {isPicking ? (
                          <div className="space-y-2">
                            <p className="text-[10px] tracking-widest text-[#FF4444]">
                              SELECT TEAM TO BLOCK:
                            </p>
                            <div className="grid grid-cols-4 gap-1">
                              {(["red", "blue", "pink", "orange"] as const).map((t) => {
                                const tc = TEAM_COLORS[t];
                                const isChosen = blockTarget[wc.id] === t;
                                return (
                                  <button
                                    key={t}
                                    onClick={() => setBlockTarget((prev) => ({ ...prev, [wc.id]: t }))}
                                    className="py-3 text-[10px] tracking-widest border font-bold transition-all"
                                    style={{
                                      borderColor: isChosen ? tc : `${tc}30`,
                                      color: isChosen ? "#0A0A0A" : tc,
                                      background: isChosen ? tc : "transparent",
                                    }}
                                  >
                                    {t.toUpperCase()}
                                  </button>
                                );
                              })}
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => { setBlockPicking(null); setBlockTarget((p) => { const n = { ...p }; delete n[wc.id]; return n; }); }}
                                className="flex-1 py-2 text-xs tracking-widest border"
                                style={{ borderColor: "#33333380", color: "#555" }}
                              >
                                CANCEL
                              </button>
                              <button
                                disabled={!blockTarget[wc.id] || blockMutation.isPending}
                                onClick={() => blockMutation.mutate({ wildcardId: wc.id })}
                                className="flex-1 py-2 text-xs tracking-widest border transition-colors disabled:opacity-40"
                                style={{ borderColor: "#FF444440", color: "#FF4444", background: "#FF444408" }}
                              >
                                {blockMutation.isPending ? "…" : "CONFIRM BLOCK"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── Normal APPROVE / BLOCK row ── */
                          <div className="flex gap-2">
                            <button
                              onClick={() => approveMutation.mutate({ wildcardId: wc.id })}
                              disabled={approveMutation.isPending}
                              className="flex-1 py-2 text-xs tracking-widest border transition-colors disabled:opacity-40"
                              style={{ borderColor: "#00FF8840", color: "#00FF88", background: "#00FF8808" }}
                            >
                              {approveMutation.isPending ? "…" : "APPROVE"}
                            </button>
                            <button
                              onClick={() => setBlockPicking(wc.id)}
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
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
