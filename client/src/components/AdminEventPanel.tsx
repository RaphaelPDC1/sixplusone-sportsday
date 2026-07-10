/**
 * AdminEventPanel — Mobile-first referee flow
 * Event list → tap to expand → ARM → log placements per team → LOCK & PUSH
 * No sub-tabs: everything flows vertically in one scroll.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Team = "red" | "blue" | "pink" | "orange";
const TEAMS: Team[] = ["red", "blue", "pink", "orange"];

const TEAM_COLORS: Record<Team, { hex: string; bg: string; border: string; label: string }> = {
  red:    { hex: "#FF4444", bg: "#FF444418", border: "#FF444466", label: "RED" },
  blue:   { hex: "#4488FF", bg: "#4488FF18", border: "#4488FF66", label: "BLUE" },
  pink:   { hex: "#FF66CC", bg: "#FF66CC18", border: "#FF66CC66", label: "PINK" },
  orange: { hex: "#FF8800", bg: "#FF880018", border: "#FF880066", label: "ORANGE" },
};

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  upcoming:  { color: "#666",    bg: "#1A1A1A",   label: "UPCOMING" },
  armed:     { color: "#FF8800", bg: "#FF880018", label: "ARMED" },
  briefing:  { color: "#FFCC00", bg: "#FFCC0018", label: "BRIEFING" },
  live:      { color: "#00FF88", bg: "#00FF8818", label: "● LIVE" },
  delayed:   { color: "#FF4444", bg: "#FF444418", label: "DELAYED" },
  complete:  { color: "#4488FF", bg: "#4488FF18", label: "✓ DONE" },
};

const BASE_POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 4, 4: 2 };
const PLACEMENT_LABELS: Record<number, string> = { 1: "1ST", 2: "2ND", 3: "3RD", 4: "4TH" };

const POWER_UP_LABELS: Record<string, string> = {
  boost: "⚡ BOOST",
  sabotage: "💣 SABOTAGE",
  block: "🛡️ BLOCK",
  double_down: "×2 DOUBLE DOWN",
  all_in: "🎲 ALL IN",
};

const TYPE_EMOJI: Record<string, string> = {
  male: "♂", female: "♀", mixed: "⚡", team: "👥", finale: "🏆",
};

// ─── Single expanded event card ───────────────────────────────────────────────
function EventCard({
  event,
  onStatusChange,
}: {
  event: {
    id: number;
    name: string;
    status: string;
    eventType?: string | null;
    arena?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    pointsMultiplier: number;
  };
  onStatusChange: () => void;
}) {
  const [placements, setPlacements] = useState<Partial<Record<Team, number>>>({});
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [showPowerUps, setShowPowerUps] = useState(false);

  const meta = STATUS_META[event.status] ?? STATUS_META.upcoming;
  const isActive = event.status === "armed" || event.status === "live" || event.status === "briefing";
  const isDone = event.status === "complete";

  const setStatus = trpc.scoring.adminSetEventStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); onStatusChange(); },
    onError: (e) => toast.error(e.message),
  });

  const { data: existingResults, refetch: refetchResults } = trpc.scoring.getEventResults.useQuery(
    { eventId: event.id },
    { enabled: true }
  );

  const enterResult = trpc.scoring.adminEnterResult.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const lockResults = trpc.scoring.adminLockEventResults.useMutation({
    onSuccess: (d) => {
      toast.success(`🔒 Locked ${d.locked} results — leaderboard updated`);
      refetchResults();
      onStatusChange();
    },
    onError: (e) => toast.error(e.message),
  });
  const overrideResult = trpc.scoring.adminOverrideResult.useMutation({
    onSuccess: () => { toast.success("Override applied"); refetchResults(); },
    onError: (e) => toast.error(e.message),
  });

  const wildcards = trpc.powerUps.getEventWildcards.useQuery(
    { eventId: event.id },
    { refetchInterval: 5_000, enabled: showPowerUps }
  );
  const resolveWildcard = trpc.powerUps.adminResolvePowerUp.useMutation({
    onSuccess: () => { toast.success("Approved"); wildcards.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const blockWildcard = trpc.powerUps.adminBlockPowerUp.useMutation({
    onSuccess: () => { toast.success("Blocked"); wildcards.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const resultMap = Object.fromEntries((existingResults ?? []).map((r) => [r.team, r]));

  const allPlacementsSet = TEAMS.every((t) => placements[t] !== undefined);
  const anyPlacementSet = TEAMS.some((t) => placements[t] !== undefined);

  const handleSaveAll = async () => {
    const entries = Object.entries(placements) as [Team, number][];
    if (entries.length === 0) { toast.error("Select at least one placement"); return; }
    for (const [team, placement] of entries) {
      await enterResult.mutateAsync({ eventId: event.id, team, placement });
    }
    toast.success("Placements saved — ready to lock");
    refetchResults();
  };

  const handleLock = () => {
    if (!confirm(`Lock results for "${event.name}"?\n\nThis will push points to the live leaderboard.`)) return;
    lockResults.mutate({ eventId: event.id });
  };

  const handleOverride = (team: Team) => {
    const p = placements[team];
    if (!p || !overrideReason.trim()) { toast.error("Select a placement and enter a reason"); return; }
    overrideResult.mutate({ eventId: event.id, team, newPlacement: p, reason: overrideReason });
  };

  const pendingWildcards = (wildcards.data ?? []).filter((w) => w.status === "pending" || w.status === "active");

  return (
    <div
      className="border rounded-none transition-all"
      style={{ borderColor: isActive ? meta.color + "55" : "#222", background: isActive ? meta.bg : "#0D0D0D" }}
    >
      {/* ── Event header ── */}
      <div className="px-4 py-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-xl mt-0.5 flex-shrink-0">{TYPE_EMOJI[event.eventType ?? ""] ?? "🎯"}</span>
          <div className="min-w-0">
            <p className="font-mono text-[#F2F0EB] text-sm font-bold leading-tight">{event.name}</p>
            {(event.arena || event.startTime) && (
              <p className="font-mono text-[#555] text-[10px] mt-0.5">
                {[event.arena, event.startTime && `${event.startTime}–${event.endTime}`].filter(Boolean).join(" · ")}
                {event.pointsMultiplier > 1 && ` · ×${event.pointsMultiplier} PTS`}
              </p>
            )}
          </div>
        </div>
        <span
          className="font-mono text-[10px] tracking-widest px-2 py-1 border flex-shrink-0 mt-0.5"
          style={{ color: meta.color, borderColor: meta.color + "55", background: meta.color + "11" }}
        >
          {meta.label}
        </span>
      </div>

      {/* ── Status control row ── */}
      <div className="px-4 pb-3">
        <p className="font-mono text-[#444] text-[9px] tracking-[0.3em] mb-2">SET STATUS</p>
        <div className="grid grid-cols-3 gap-1">
          {(["upcoming", "armed", "briefing", "live", "delayed", "complete"] as const).map((s) => {
            const sm = STATUS_META[s];
            const isCurrent = event.status === s;
            const btnLabels: Record<string, string> = {
              upcoming: "RESET", armed: "ARM", briefing: "BRIEF",
              live: "▶ LIVE", delayed: "DELAY", complete: "✓ DONE",
            };
            return (
              <button
                key={s}
                disabled={isCurrent || setStatus.isPending}
                onClick={() => setStatus.mutate({ eventId: event.id, status: s })}
                className="font-mono text-[10px] py-2.5 tracking-widest transition-all disabled:cursor-default border"
                style={{
                  background: isCurrent ? sm.color + "22" : "transparent",
                  color: isCurrent ? sm.color : "#444",
                  borderColor: isCurrent ? sm.color + "55" : "#1A1A1A",
                  fontWeight: isCurrent ? 700 : 400,
                }}
              >
                {btnLabels[s]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Placement entry (always visible) ── */}
      <div className="border-t border-[#1A1A1A] px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[#444] text-[9px] tracking-[0.3em]">LOG PLACEMENTS</p>
          {event.pointsMultiplier > 1 && (
            <span className="font-mono text-[10px] text-[#FF8800] tracking-wider">×{event.pointsMultiplier} MULTIPLIER</span>
          )}
        </div>

        {/* Override toggle */}
        {isDone && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={overrideMode} onChange={(e) => setOverrideMode(e.target.checked)} className="accent-[#FF5500]" />
            <span className="font-mono text-[#555] text-[10px] tracking-wider">OVERRIDE MODE (locked results)</span>
          </label>
        )}
        {overrideMode && (
          <input
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Override reason (required)"
            className="w-full bg-[#0D0D0D] border border-[#FF5500] text-[#F2F0EB] font-mono text-xs px-3 py-2 focus:outline-none"
          />
        )}

        {/* Team placement rows */}
        <div className="space-y-2">
          {TEAMS.map((team) => {
            const tc = TEAM_COLORS[team];
            const existing = resultMap[team];
            const isLocked = existing?.locked;
            const selected = placements[team];

            return (
              <div
                key={team}
                className="border p-3"
                style={{
                  borderColor: selected ? tc.border : "#1A1A1A",
                  background: selected ? tc.bg : "transparent",
                }}
              >
                {/* Team label + existing result */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold tracking-widest" style={{ color: tc.hex }}>
                    TEAM {tc.label}
                  </span>
                  {existing && (
                    <span
                      className="font-mono text-[10px] tracking-wider"
                      style={{ color: isLocked ? "#4488FF" : "#FF8800" }}
                    >
                      {isLocked ? "🔒" : "⏳"} {PLACEMENT_LABELS[existing.placement ?? 0]} · {existing.finalPoints}pts
                    </span>
                  )}
                </div>

                {/* Placement buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  {[1, 2, 3, 4].map((p) => {
                    const pts = (BASE_POINTS[p] ?? 0) * event.pointsMultiplier;
                    const isSelected = selected === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPlacements((prev) => ({ ...prev, [team]: p }))}
                        disabled={isLocked && !overrideMode}
                        className="font-mono py-3 text-center transition-all border disabled:opacity-25 disabled:cursor-not-allowed"
                        style={{
                          background: isSelected ? tc.hex : "transparent",
                          color: isSelected ? "#0A0A0A" : "#666",
                          borderColor: isSelected ? tc.hex : "#2A2A2A",
                          fontWeight: isSelected ? 700 : 400,
                        }}
                      >
                        <div className="text-xs tracking-widest">{PLACEMENT_LABELS[p]}</div>
                        <div className="text-[9px] mt-0.5 opacity-70">{pts}pts</div>
                      </button>
                    );
                  })}
                </div>

                {/* Override button */}
                {overrideMode && isLocked && selected && (
                  <button
                    onClick={() => handleOverride(team)}
                    className="mt-2 w-full py-2 font-mono text-[10px] tracking-widest border border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500]/10 transition-colors"
                  >
                    APPLY OVERRIDE
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Save + Lock buttons */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSaveAll}
            disabled={enterResult.isPending || !anyPlacementSet}
            className="flex-1 bg-[#1A1A1A] text-[#F2F0EB] font-mono text-xs tracking-widest py-3 hover:bg-[#222] disabled:opacity-40 transition-colors border border-[#2A2A2A]"
          >
            SAVE DRAFT
          </button>
          <button
            onClick={handleLock}
            disabled={lockResults.isPending}
            className="flex-1 font-mono text-xs tracking-widest py-3 disabled:opacity-40 transition-colors"
            style={{
              background: allPlacementsSet ? "#FF5500" : "#1A1A1A",
              color: allPlacementsSet ? "#0A0A0A" : "#555",
              border: allPlacementsSet ? "1px solid #FF5500" : "1px solid #2A2A2A",
              fontWeight: allPlacementsSet ? 700 : 400,
            }}
          >
            🔒 LOCK & PUSH
          </button>
        </div>
      </div>

      {/* ── Power Ups section ── */}
      <div className="border-t border-[#1A1A1A]">
        <button
          onClick={() => setShowPowerUps((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 font-mono text-[10px] tracking-widest text-[#444] hover:text-[#888] transition-colors"
        >
          <span>
            ⚡ POWER UPS
            {pendingWildcards.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 bg-[#FF8800] text-[#0A0A0A] text-[9px] font-bold">
                {pendingWildcards.length} PENDING
              </span>
            )}
          </span>
          <span>{showPowerUps ? "▲" : "▼"}</span>
        </button>

        {showPowerUps && (
          <div className="px-4 pb-4 space-y-3">
            {/* Voting status */}
            <div
              className="flex items-center gap-3 px-3 py-2 border"
              style={{
                borderColor: isActive ? "#00FF8840" : "#33333380",
                background: isActive ? "#00FF8808" : "transparent",
              }}
            >
              <span>{isActive ? "⚡" : "⏳"}</span>
              <div>
                <div className="font-mono text-[10px] tracking-widest" style={{ color: isActive ? "#00FF88" : "#555" }}>
                  POWER UPS {isActive ? "OPEN" : "LOCKED"}
                </div>
                <div className="font-mono text-[9px] text-[#444] tracking-wider mt-0.5">
                  {isActive ? "Teams can initiate and vote now" : "Opens when event is ARMED or LIVE"}
                </div>
              </div>
            </div>

            {wildcards.isLoading ? (
              <p className="font-mono text-xs text-[#444]">Loading…</p>
            ) : (wildcards.data ?? []).length === 0 ? (
              <p className="font-mono text-xs text-[#444]">No power ups for this event.</p>
            ) : (
              <div className="space-y-2">
                {(wildcards.data ?? []).map((wc) => {
                  const ownerColor = TEAM_COLORS[wc.ownerTeam as Team]?.hex ?? "#fff";
                  const targetColor = wc.targetTeam ? (TEAM_COLORS[wc.targetTeam as Team]?.hex ?? "#fff") : null;
                  const canAct = wc.status === "pending" || wc.status === "active";
                  const statusColors: Record<string, string> = {
                    pending: "#FF8800", active: "#00FF88", resolved: "#4488FF", blocked: "#FF4444", failed: "#555",
                  };
                  const sc = statusColors[wc.status] ?? "#555";

                  return (
                    <div key={wc.id} className="border p-3 space-y-2" style={{ borderColor: ownerColor + "30" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs" style={{ color: ownerColor }}>
                            {POWER_UP_LABELS[wc.type] ?? wc.type.toUpperCase()}
                          </span>
                          <span className="font-mono text-[10px] text-[#555]">
                            <span style={{ color: ownerColor }}>{wc.ownerTeam.toUpperCase()}</span>
                            {wc.targetTeam && (
                              <> → <span style={{ color: targetColor ?? "#fff" }}>{wc.targetTeam.toUpperCase()}</span></>
                            )}
                          </span>
                        </div>
                        <span
                          className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
                          style={{ color: sc, borderColor: sc + "40" }}
                        >
                          {wc.status.toUpperCase()}
                        </span>
                      </div>
                      {canAct && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => resolveWildcard.mutate({ wildcardId: wc.id })}
                            disabled={resolveWildcard.isPending}
                            className="flex-1 py-2.5 font-mono text-xs tracking-widest border transition-colors disabled:opacity-40"
                            style={{ borderColor: "#00FF8840", color: "#00FF88", background: "#00FF8808" }}
                          >
                            ✓ APPROVE
                          </button>
                          <button
                            onClick={() => blockWildcard.mutate({ wildcardId: wc.id })}
                            disabled={blockWildcard.isPending}
                            className="flex-1 py-2.5 font-mono text-xs tracking-widest border transition-colors disabled:opacity-40"
                            style={{ borderColor: "#FF444440", color: "#FF4444", background: "#FF444408" }}
                          >
                            ✗ BLOCK
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main AdminEventPanel ─────────────────────────────────────────────────────
export function AdminEventPanel() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data: events, refetch: refetchEvents } = trpc.scoring.getEvents.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  // Auto-expand first ARMED or LIVE event on load
  useEffect(() => {
    if (!events || expandedId !== null) return;
    const active = events.find((e: { status: string }) => e.status === "armed" || e.status === "live");
    if (active) setExpandedId(Number(active.id));
  }, [events, expandedId]);

  const handleToggle = (id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-2">
      <p className="font-mono text-[#444] text-[9px] tracking-[0.35em] mb-3">
        TAP AN EVENT TO MANAGE IT
      </p>

      {!events ? (
        <p className="font-mono text-[#555] text-xs">Loading events…</p>
      ) : (
        events.map((ev) => {
          const meta = STATUS_META[ev.status] ?? STATUS_META.upcoming;
          const isExpanded = expandedId === Number(ev.id);
          const isActive = ev.status === "armed" || ev.status === "live";

          return (
            <div key={ev.id} className="border transition-all" style={{ borderColor: isExpanded ? "#FF5500" : isActive ? meta.color + "44" : "#1A1A1A" }}>
              {/* Collapsed header — tap to expand */}
              <button
                onClick={() => handleToggle(Number(ev.id))}
                className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
                style={{ background: isExpanded ? "#FF550010" : isActive ? meta.bg : "transparent" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-base flex-shrink-0">{TYPE_EMOJI[ev.eventType ?? ""] ?? "🎯"}</span>
                  <div className="min-w-0">
                    <p
                      className="font-mono text-sm font-bold truncate"
                      style={{ color: isExpanded ? "#FF5500" : isActive ? meta.color : "#888" }}
                    >
                      {ev.name}
                    </p>
                    {ev.arena && (
                      <p className="font-mono text-[10px] text-[#444] truncate">{ev.arena}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span
                    className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
                    style={{ color: meta.color, borderColor: meta.color + "44", background: meta.color + "11" }}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[#333] text-xs">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-[#FF550030]">
                  <EventCard
                    event={{
                      id: Number(ev.id),
                      name: ev.name,
                      status: ev.status,
                      eventType: ev.eventType,
                      arena: ev.arena,
                      startTime: ev.startTime,
                      endTime: ev.endTime,
                      pointsMultiplier: ev.pointsMultiplier,
                    }}
                    onStatusChange={refetchEvents}
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
