/**
 * AdminEventPanel — Unified event management panel
 * Combines: event status control + result entry + power-up monitor
 * Select an event on the left → manage everything for it on the right.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Team = "red" | "blue" | "pink" | "orange";
const TEAMS: Team[] = ["red", "blue", "pink", "orange"];

const TEAM_COLORS: Record<Team, string> = {
  red: "#FF4444",
  blue: "#4488FF",
  pink: "#FF66CC",
  orange: "#FF8800",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "#555",
  armed: "#FF8800",
  briefing: "#FFCC00",
  live: "#00FF88",
  delayed: "#FF4444",
  complete: "#4488FF",
};

const STATUS_BG: Record<string, string> = {
  upcoming: "#1A1A1A",
  armed: "#FF880022",
  briefing: "#FFCC0022",
  live: "#00FF8822",
  delayed: "#FF444422",
  complete: "#4488FF22",
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: "UPCOMING",
  armed: "ARMED",
  briefing: "BRIEFING",
  live: "● LIVE",
  delayed: "DELAYED",
  complete: "✓ DONE",
};

const PLACEMENT_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const BASE_POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 4, 4: 2 };

const POWER_UP_LABELS: Record<string, string> = {
  boost: "⚡ BOOST",
  sabotage: "💣 SABOTAGE",
  block: "🛡️ BLOCK",
  double_down: "×2 DOUBLE DOWN",
  all_in: "🎲 ALL IN",
};

const POWER_UP_STATUS_COLORS: Record<string, string> = {
  pending: "#FF8800",
  active: "#00FF88",
  resolved: "#4488FF",
  blocked: "#FF4444",
  failed: "#555",
};

const TYPE_EMOJI: Record<string, string> = {
  male: "♂", female: "♀", mixed: "⚡", team: "👥", finale: "🏆",
};

// ─── Event List (left panel) ──────────────────────────────────────────────────
function EventList({
  events,
  selectedId,
  onSelect,
}: {
  events: Array<{ id: number; name: string; status: string; eventType?: string | null; arena?: string | null; startTime?: string | null }>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="font-mono text-[#555] text-[10px] tracking-[0.3em] mb-3">SELECT EVENT</p>
      {events.map((ev) => {
        const isSelected = selectedId === ev.id;
        const statusColor = STATUS_COLORS[ev.status] ?? "#555";
        const isActive = ev.status === "armed" || ev.status === "live";
        return (
          <button
            key={ev.id}
            onClick={() => onSelect(ev.id)}
            className="w-full text-left px-3 py-2.5 border transition-all"
            style={{
              borderColor: isSelected ? "#FF5500" : isActive ? `${statusColor}50` : "#1A1A1A",
              background: isSelected ? "#FF550010" : isActive ? `${statusColor}08` : "#0D0D0D",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm flex-shrink-0">{TYPE_EMOJI[ev.eventType ?? ""] ?? "🎯"}</span>
                <span
                  className="font-mono text-xs truncate"
                  style={{ color: isSelected ? "#FF5500" : isActive ? statusColor : "#888" }}
                >
                  {ev.name}
                </span>
              </div>
              <span
                className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border flex-shrink-0"
                style={{ color: statusColor, borderColor: `${statusColor}40`, background: `${statusColor}10` }}
              >
                {STATUS_LABELS[ev.status] ?? ev.status.toUpperCase()}
              </span>
            </div>
            {ev.arena && (
              <p className="font-mono text-[10px] text-[#444] mt-0.5 pl-6">{ev.arena}{ev.startTime ? ` · ${ev.startTime}` : ""}</p>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Status Control Section ───────────────────────────────────────────────────
function StatusSection({ event, onRefetch }: { event: { id: number; name: string; status: string }; onRefetch: () => void }) {
  const setStatus = trpc.scoring.adminSetEventStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); onRefetch(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <p className="font-mono text-[#555] text-[10px] tracking-[0.3em] mb-2">STATUS CONTROL</p>
      <div className="grid grid-cols-3 gap-px bg-[#111] border border-[#1A1A1A]">
        {(["upcoming", "armed", "briefing", "live", "delayed", "complete"] as const).map((s) => {
          const isActive = event.status === s;
          const btnColor = STATUS_COLORS[s] ?? "#555";
          return (
            <button
              key={s}
              disabled={isActive || setStatus.isPending}
              onClick={() => setStatus.mutate({ eventId: event.id, status: s })}
              className="font-mono text-xs py-2.5 px-1 transition-colors text-center"
              style={{
                background: isActive ? `${btnColor}22` : "#0D0D0D",
                color: isActive ? btnColor : "#555",
                borderBottom: isActive ? `2px solid ${btnColor}` : "2px solid transparent",
              }}
            >
              {s === "upcoming" ? "RESET" : s === "armed" ? "ARM" : s === "briefing" ? "BRIEF" : s === "live" ? "▶ LIVE" : s === "delayed" ? "DELAY" : "✓ DONE"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Result Entry Section ─────────────────────────────────────────────────────
function ResultSection({ event }: { event: { id: number; name: string; status: string; pointsMultiplier: number; arena?: string | null } }) {
  const [placements, setPlacements] = useState<Partial<Record<Team, number>>>({});
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const { data: existingResults, refetch: refetchResults } = trpc.scoring.getEventResults.useQuery(
    { eventId: event.id },
    { enabled: true }
  );

  const enterResult = trpc.scoring.adminEnterResult.useMutation({ onError: (e) => toast.error(e.message) });
  const lockResults = trpc.scoring.adminLockEventResults.useMutation({
    onSuccess: (d) => { toast.success(`Locked ${d.locked} results → leaderboard updated`); refetchResults(); },
    onError: (e) => toast.error(e.message),
  });
  const overrideResult = trpc.scoring.adminOverrideResult.useMutation({
    onSuccess: () => { toast.success("Override applied"); refetchResults(); },
    onError: (e) => toast.error(e.message),
  });

  const resultMap = Object.fromEntries((existingResults ?? []).map((r) => [r.team, r]));

  const handleSaveAll = async () => {
    const entries = Object.entries(placements) as [Team, number][];
    if (entries.length === 0) { toast.error("Enter at least one placement"); return; }
    for (const [team, placement] of entries) {
      await enterResult.mutateAsync({ eventId: event.id, team, placement });
    }
    toast.success("Results saved (not yet locked)");
    refetchResults();
  };

  const handleLock = () => {
    if (!confirm("Lock results? This will push points to the live leaderboard.")) return;
    lockResults.mutate({ eventId: event.id });
  };

  const handleOverride = (team: Team) => {
    const p = placements[team];
    if (!p || !overrideReason.trim()) { toast.error("Select placement and enter a reason"); return; }
    overrideResult.mutate({ eventId: event.id, team, newPlacement: p, reason: overrideReason });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[#555] text-[10px] tracking-[0.3em]">RESULT ENTRY</p>
        <span className="font-mono text-[#444] text-[10px]">×{event.pointsMultiplier} multiplier</span>
      </div>

      {/* Override mode */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={overrideMode} onChange={(e) => setOverrideMode(e.target.checked)} className="accent-[#FF5500]" />
        <span className="font-mono text-[#555] text-xs tracking-wider">OVERRIDE MODE</span>
      </label>
      {overrideMode && (
        <input
          value={overrideReason}
          onChange={(e) => setOverrideReason(e.target.value)}
          placeholder="Override reason (required)"
          className="w-full bg-[#0D0D0D] border border-[#FF5500] text-[#F2F0EB] font-mono text-xs px-3 py-2 focus:outline-none"
        />
      )}

      {/* Placement grid */}
      <div className="space-y-2">
        {TEAMS.map((team) => {
          const existing = resultMap[team];
          const color = TEAM_COLORS[team];
          const isLocked = existing?.locked;
          return (
            <div key={team} className="border border-[#1A1A1A] p-2.5 flex items-center gap-3 flex-wrap">
              <span className="font-mono text-xs tracking-widest uppercase w-14 flex-shrink-0" style={{ color }}>
                {team}
              </span>
              <div className="flex gap-1.5 flex-wrap flex-1">
                {[1, 2, 3, 4].map((p) => {
                  const selected = placements[team] === p;
                  const pts = (BASE_POINTS[p] ?? 0) * event.pointsMultiplier;
                  return (
                    <button
                      key={p}
                      onClick={() => setPlacements((prev) => ({ ...prev, [team]: p }))}
                      disabled={isLocked && !overrideMode}
                      className={`font-mono text-[10px] px-2 py-1.5 border transition-colors ${
                        selected ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10" : "border-[#222] text-[#555] hover:border-[#333] hover:text-[#888]"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                    >
                      {PLACEMENT_LABELS[p]} ({pts}pts)
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {existing && (
                  <div className="text-right">
                    <p className="font-mono text-[10px]" style={{ color: isLocked ? "#4488FF" : "#FF8800" }}>
                      {isLocked ? "🔒" : "⏳"} {PLACEMENT_LABELS[existing.placement ?? 0]}
                    </p>
                    <p className="font-mono text-[10px] text-[#444]">{existing.finalPoints}pts</p>
                  </div>
                )}
                {overrideMode && existing?.locked && placements[team] && (
                  <button
                    onClick={() => handleOverride(team)}
                    className="font-mono text-[10px] px-2 py-1 border border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500]/10"
                  >
                    OVERRIDE
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSaveAll}
          disabled={enterResult.isPending || Object.keys(placements).length === 0}
          className="flex-1 bg-[#1A1A1A] text-[#F2F0EB] font-mono text-xs tracking-widest py-2.5 hover:bg-[#222] disabled:opacity-40 transition-colors"
        >
          SAVE DRAFT
        </button>
        <button
          onClick={handleLock}
          disabled={lockResults.isPending}
          className="flex-1 bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest py-2.5 hover:bg-[#F2F0EB] disabled:opacity-40 transition-colors"
        >
          🔒 LOCK & PUSH
        </button>
      </div>
    </div>
  );
}

// ─── Power Ups Section ────────────────────────────────────────────────────────
function PowerUpsSection({ event }: { event: { id: number; name: string; status: string } }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const wildcards = trpc.powerUps.getEventWildcards.useQuery(
    { eventId: event.id },
    { refetchInterval: 5_000 }
  );
  const resolveWildcard = trpc.powerUps.adminResolvePowerUp.useMutation({
    onSuccess: () => { toast.success("Power up resolved"); wildcards.refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const blockWildcard = trpc.powerUps.adminBlockPowerUp.useMutation({
    onSuccess: () => { toast.success("Power up blocked"); wildcards.refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const votingOpen = event.status === "armed" || event.status === "live";
  const allWildcards = wildcards.data ?? [];
  const activeWildcards = allWildcards.filter((w) => w.status === "active" || w.status === "pending");

  return (
    <div className="space-y-3">
      {/* Voting status banner */}
      <div
        className="flex items-center gap-3 px-3 py-2 border"
        style={{
          borderColor: votingOpen ? "#00FF8840" : "#33333380",
          background: votingOpen ? "#00FF8808" : "transparent",
        }}
      >
        <span>{votingOpen ? "⚡" : "⏳"}</span>
        <div>
          <div className="font-mono text-[10px] tracking-widest" style={{ color: votingOpen ? "#00FF88" : "#555" }}>
            POWER UPS {votingOpen ? "OPEN" : "LOCKED"}
          </div>
          <div className="font-mono text-[9px] text-[#444] tracking-wider mt-0.5">
            {votingOpen ? "Teams can initiate and vote now" : "Opens when event is ARMED or LIVE"}
          </div>
        </div>
      </div>

      {wildcards.isLoading ? (
        <p className="font-mono text-xs text-[#444]">Loading power ups…</p>
      ) : allWildcards.length === 0 ? (
        <p className="font-mono text-xs text-[#444]">
          {votingOpen ? "No power ups initiated yet." : "No power ups for this event."}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-4 font-mono text-[10px] text-[#555] tracking-wider">
            <span>{activeWildcards.length} active</span>
            <span>{allWildcards.filter((w) => w.status === "resolved").length} resolved</span>
            <span>{allWildcards.filter((w) => w.status === "blocked").length} blocked</span>
          </div>

          {allWildcards.map((wc) => {
            const ownerColor = TEAM_COLORS[wc.ownerTeam as Team] ?? "#fff";
            const targetColor = wc.targetTeam ? (TEAM_COLORS[wc.targetTeam as Team] ?? "#fff") : null;
            const statusColor = POWER_UP_STATUS_COLORS[wc.status] ?? "#555";
            const isExpanded = expandedId === wc.id;
            const canAct = wc.status === "pending" || wc.status === "active";

            return (
              <div
                key={wc.id}
                className="border transition-all"
                style={{ borderColor: `${ownerColor}30` }}
              >
                <div
                  className="flex items-center justify-between px-3 py-2.5 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : wc.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs tracking-widest" style={{ color: ownerColor }}>
                      {POWER_UP_LABELS[wc.type] ?? wc.type.toUpperCase()}
                    </span>
                    <span className="font-mono text-[10px] text-[#555]">
                      <span style={{ color: ownerColor }}>{wc.ownerTeam.toUpperCase()}</span>
                      {wc.targetTeam && (
                        <> → <span style={{ color: targetColor ?? "#fff" }}>{wc.targetTeam.toUpperCase()}</span></>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
                      style={{ color: statusColor, borderColor: `${statusColor}40` }}
                    >
                      {wc.status.toUpperCase()}
                    </span>
                    <span className="text-[#333] text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-3 pb-3 border-t space-y-2" style={{ borderColor: `${ownerColor}20` }}>
                    <div className="grid grid-cols-2 gap-2 font-mono text-xs mt-2">
                      <div>
                        <div className="text-[#444] tracking-wider mb-0.5">OWNER</div>
                        <div style={{ color: ownerColor }}>{wc.ownerTeam.toUpperCase()}</div>
                      </div>
                      {wc.targetTeam && (
                        <div>
                          <div className="text-[#444] tracking-wider mb-0.5">TARGET</div>
                          <div style={{ color: targetColor ?? "#fff" }}>{wc.targetTeam.toUpperCase()}</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[#444] tracking-wider mb-0.5">CREATED</div>
                        <div className="text-[#888]">{new Date(wc.createdAt).toLocaleTimeString()}</div>
                      </div>
                      {wc.resolvedAt && (
                        <div>
                          <div className="text-[#444] tracking-wider mb-0.5">RESOLVED</div>
                          <div className="text-[#888]">{new Date(wc.resolvedAt).toLocaleTimeString()}</div>
                        </div>
                      )}
                    </div>

                    {canAct && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => resolveWildcard.mutate({ wildcardId: wc.id })}
                          disabled={resolveWildcard.isPending}
                          className="flex-1 py-2 font-mono text-xs tracking-widest border transition-colors disabled:opacity-40"
                          style={{ borderColor: "#00FF8840", color: "#00FF88", background: "#00FF8808" }}
                        >
                          ✓ APPROVE
                        </button>
                        <button
                          onClick={() => blockWildcard.mutate({ wildcardId: wc.id })}
                          disabled={blockWildcard.isPending}
                          className="flex-1 py-2 font-mono text-xs tracking-widest border transition-colors disabled:opacity-40"
                          style={{ borderColor: "#FF444440", color: "#FF4444", background: "#FF444408" }}
                        >
                          ✗ BLOCK
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

// ─── Main AdminEventPanel ─────────────────────────────────────────────────────
export function AdminEventPanel() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [section, setSection] = useState<"status" | "results" | "powerups">("status");

  const { data: events, refetch: refetchEvents } = trpc.scoring.getEvents.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  // Auto-select first ARMED or LIVE event when events load
  const hasAutoSelected = selectedEventId !== null;
  if (!hasAutoSelected && events) {
    const active = events.find((e: { status: string }) => e.status === "armed" || e.status === "live");
    if (active) setSelectedEventId(Number(active.id));
  }

  const selectedEvent = (events ?? []).find((e) => Number(e.id) === selectedEventId);

  const SECTIONS = [
    { id: "status" as const, label: "STATUS" },
    { id: "results" as const, label: "RESULTS" },
    { id: "powerups" as const, label: "⚡ POWER UPS" },
  ];

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      {/* Left: event list */}
      <div className="lg:w-56 flex-shrink-0">
        {events ? (
          <EventList
            events={events.map((e) => ({ ...e, id: Number(e.id) }))}
            selectedId={selectedEventId}
            onSelect={setSelectedEventId}
          />
        ) : (
          <p className="font-mono text-[#555] text-xs">Loading events…</p>
        )}
      </div>

      {/* Right: detail panel */}
      <div className="flex-1 min-w-0">
        {!selectedEvent ? (
          <div className="flex items-center justify-center h-32 border border-[#1A1A1A]">
            <p className="font-mono text-[#444] text-xs tracking-widest">SELECT AN EVENT</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Event header */}
            <div
              className="flex items-center justify-between px-4 py-3 border"
              style={{
                borderColor: selectedEvent.status === "live" ? "#00FF8866" : selectedEvent.status === "armed" ? "#FF880066" : "#1A1A1A",
                background: STATUS_BG[selectedEvent.status] ?? "#0D0D0D",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{TYPE_EMOJI[selectedEvent.eventType ?? ""] ?? "🎯"}</span>
                <div>
                  <p className="font-mono text-[#F2F0EB] text-sm font-bold">{selectedEvent.name}</p>
                  <p className="font-mono text-[#555] text-[10px] mt-0.5">
                    {selectedEvent.arena}{selectedEvent.startTime ? ` · ${selectedEvent.startTime}–${selectedEvent.endTime}` : ""}
                    {selectedEvent.pointsMultiplier > 1 ? ` · ×${selectedEvent.pointsMultiplier}` : ""}
                  </p>
                </div>
              </div>
              <span
                className="font-mono text-xs tracking-wider px-2 py-1 border flex-shrink-0"
                style={{
                  color: STATUS_COLORS[selectedEvent.status] ?? "#555",
                  borderColor: `${STATUS_COLORS[selectedEvent.status] ?? "#555"}66`,
                  background: `${STATUS_COLORS[selectedEvent.status] ?? "#555"}11`,
                }}
              >
                {STATUS_LABELS[selectedEvent.status] ?? selectedEvent.status.toUpperCase()}
              </span>
            </div>

            {/* Section tabs */}
            <div className="flex gap-px border-b border-[#1A1A1A]">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`font-mono text-[10px] tracking-widest px-4 py-2.5 border-b-2 transition-colors ${
                    section === s.id
                      ? "border-[#FF5500] text-[#FF5500]"
                      : "border-transparent text-[#444] hover:text-[#888]"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Section content */}
            <div>
              {section === "status" && (
                <StatusSection
                  event={{ id: Number(selectedEvent.id), name: selectedEvent.name, status: selectedEvent.status }}
                  onRefetch={refetchEvents}
                />
              )}
              {section === "results" && (
                <ResultSection
                  event={{
                    id: Number(selectedEvent.id),
                    name: selectedEvent.name,
                    status: selectedEvent.status,
                    pointsMultiplier: selectedEvent.pointsMultiplier,
                    arena: selectedEvent.arena,
                  }}
                />
              )}
              {section === "powerups" && (
                <PowerUpsSection
                  event={{ id: Number(selectedEvent.id), name: selectedEvent.name, status: selectedEvent.status }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
