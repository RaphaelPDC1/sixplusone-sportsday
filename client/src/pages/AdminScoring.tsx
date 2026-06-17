/**
 * AdminScoring — Phase 1 scoring panel
 * Live leaderboard, event status control, result entry, audit log, wildcard monitor
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AdminWildcardMonitor } from "@/components/AdminWildcardMonitor";

type Team = "red" | "blue" | "pink" | "orange";
const TEAMS: Team[] = ["red", "blue", "pink", "orange"];

const TEAM_COLORS: Record<Team, string> = {
  red: "#FF4444",
  blue: "#4488FF",
  pink: "#FF66CC",
  orange: "#FF8800",
};

const PLACEMENT_LABELS: Record<number, string> = {
  1: "1st",
  2: "2nd",
  3: "3rd",
  4: "4th",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "#555",
  armed: "#FF8800",
  live: "#00FF88",
  complete: "#4488FF",
};

type ScoringView = "leaderboard" | "events" | "entry" | "audit" | "wildcards";

// ─── Live Leaderboard ─────────────────────────────────────────────────────────
function LiveLeaderboard() {
  const { data: lb, isLoading, refetch } = trpc.scoring.getLiveLeaderboard.useQuery(undefined, {
    refetchInterval: 10_000,
  });

  if (isLoading) return <div className="font-mono text-[#555] text-sm">Loading leaderboard…</div>;
  if (!lb?.length) return <div className="font-mono text-[#555] text-sm">No points recorded yet.</div>;

  const max = Math.max(...lb.map((e) => e.points), 1);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[#555] text-xs tracking-[0.3em]">LIVE STANDINGS</p>
        <button
          onClick={() => refetch()}
          className="font-mono text-[#444] text-xs hover:text-[#FF5500] transition-colors"
        >
          ↻ REFRESH
        </button>
      </div>
      {lb.map((entry) => {
        const color = TEAM_COLORS[entry.team as Team];
        const pct = (entry.points / max) * 100;
        return (
          <div key={entry.team} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[#444] text-xs w-5">{entry.rank}.</span>
                <span className="font-mono text-sm tracking-widest uppercase" style={{ color }}>
                  {entry.team}
                </span>
              </div>
              <span className="font-display text-2xl" style={{ color }}>
                {entry.points}
              </span>
            </div>
            <div className="h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Event Status Control ─────────────────────────────────────────────────────
function EventControl() {
  const { data: events, refetch } = trpc.scoring.getEvents.useQuery();
  const setStatus = trpc.scoring.adminSetEventStatus.useMutation({
    onSuccess: () => { toast.success("Status updated"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  if (!events) return <div className="font-mono text-[#555] text-sm">Loading…</div>;

  return (
    <div className="space-y-2">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-4">EVENT STATUS CONTROL</p>
      {events.map((ev) => (
        <div key={ev.id} className="border border-[#1A1A1A] p-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[#F2F0EB] text-sm truncate">{ev.name}</p>
            <p className="font-mono text-[#444] text-xs">{ev.arena} · {ev.startTime}–{ev.endTime} · ×{ev.pointsMultiplier}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="font-mono text-xs tracking-wider px-2 py-1 border"
              style={{ color: STATUS_COLORS[ev.status], borderColor: STATUS_COLORS[ev.status] + "44" }}
            >
              {ev.status.toUpperCase()}
            </span>
            {(["upcoming", "armed", "live", "complete"] as const).map((s) => (
              <button
                key={s}
                disabled={ev.status === s || setStatus.isPending}
                onClick={() => setStatus.mutate({ eventId: ev.id, status: s })}
                className="font-mono text-xs px-2 py-1 border border-[#222] text-[#555] hover:border-[#FF5500] hover:text-[#FF5500] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {s === "upcoming" ? "↩" : s === "armed" ? "ARM" : s === "live" ? "▶ LIVE" : "✓ DONE"}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Result Entry ─────────────────────────────────────────────────────────────
function ResultEntry() {
  const { data: events } = trpc.scoring.getEvents.useQuery();
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [placements, setPlacements] = useState<Partial<Record<Team, number>>>({});
  const [overrideMode, setOverrideMode] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const { data: existingResults, refetch: refetchResults } = trpc.scoring.getEventResults.useQuery(
    { eventId: selectedEventId! },
    { enabled: selectedEventId !== null }
  );

  const enterResult = trpc.scoring.adminEnterResult.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const lockResults = trpc.scoring.adminLockEventResults.useMutation({
    onSuccess: (d) => { toast.success(`Locked ${d.locked} results → leaderboard updated`); refetchResults(); },
    onError: (e) => toast.error(e.message),
  });

  const overrideResult = trpc.scoring.adminOverrideResult.useMutation({
    onSuccess: () => { toast.success("Override applied"); refetchResults(); },
    onError: (e) => toast.error(e.message),
  });

  const selectedEvent = events?.find((e) => e.id === selectedEventId);
  const BASE_POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 4, 4: 2 };

  const handleSaveAll = async () => {
    if (!selectedEventId) return;
    const entries = Object.entries(placements) as [Team, number][];
    if (entries.length === 0) { toast.error("Enter at least one placement"); return; }
    for (const [team, placement] of entries) {
      await enterResult.mutateAsync({ eventId: selectedEventId, team, placement });
    }
    toast.success("Results saved (not yet locked)");
    refetchResults();
  };

  const handleLock = () => {
    if (!selectedEventId) return;
    if (!confirm("Lock results? This will push points to the live leaderboard.")) return;
    lockResults.mutate({ eventId: selectedEventId });
  };

  const handleOverride = (team: Team) => {
    const p = placements[team];
    if (!p || !selectedEventId || !overrideReason.trim()) {
      toast.error("Select placement and enter a reason");
      return;
    }
    overrideResult.mutate({ eventId: selectedEventId, team, newPlacement: p, reason: overrideReason });
  };

  const resultMap = Object.fromEntries((existingResults ?? []).map((r) => [r.team, r]));

  return (
    <div className="space-y-4">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em]">RESULT ENTRY</p>

      {/* Event selector */}
      <select
        value={selectedEventId ?? ""}
        onChange={(e) => { setSelectedEventId(e.target.value ? Number(e.target.value) : null); setPlacements({}); }}
        className="w-full bg-[#0D0D0D] border border-[#222] text-[#F2F0EB] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[#FF5500]"
      >
        <option value="">— Select event —</option>
        {(events ?? []).map((ev) => (
          <option key={ev.id} value={ev.id}>{ev.name} ({ev.status})</option>
        ))}
      </select>

      {selectedEvent && (
        <>
          <div className="border border-[#1A1A1A] p-3 bg-[#0D0D0D]">
            <p className="font-mono text-[#FF5500] text-xs mb-1">{selectedEvent.name}</p>
            <p className="font-mono text-[#444] text-xs">×{selectedEvent.pointsMultiplier} multiplier · {selectedEvent.arena}</p>
          </div>

          {/* Override mode toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={overrideMode} onChange={(e) => setOverrideMode(e.target.checked)} className="accent-[#FF5500]" />
            <span className="font-mono text-[#555] text-xs tracking-wider">OVERRIDE MODE (edit locked results)</span>
          </label>
          {overrideMode && (
            <input
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Override reason (required)"
              className="w-full bg-[#0D0D0D] border border-[#FF5500] text-[#F2F0EB] font-mono text-sm px-3 py-2 focus:outline-none"
            />
          )}

          {/* Placement grid */}
          <div className="grid grid-cols-1 gap-2">
            {TEAMS.map((team) => {
              const existing = resultMap[team];
              const color = TEAM_COLORS[team];
              const isLocked = existing?.locked;
              return (
                <div key={team} className="border border-[#1A1A1A] p-3 flex items-center gap-4">
                  <span className="font-mono text-sm tracking-widest uppercase w-16 flex-shrink-0" style={{ color }}>
                    {team}
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4].map((p) => {
                      const selected = placements[team] === p;
                      const pts = (BASE_POINTS[p] ?? 0) * selectedEvent.pointsMultiplier;
                      return (
                        <button
                          key={p}
                          onClick={() => setPlacements((prev) => ({ ...prev, [team]: p }))}
                          disabled={isLocked && !overrideMode}
                          className={`font-mono text-xs px-3 py-2 border transition-colors ${
                            selected
                              ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                              : "border-[#222] text-[#555] hover:border-[#333] hover:text-[#888]"
                          } disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          {PLACEMENT_LABELS[p]} ({pts}pts)
                        </button>
                      );
                    })}
                  </div>
                  {existing && (
                    <div className="ml-auto text-right flex-shrink-0">
                      <p className="font-mono text-xs" style={{ color: isLocked ? "#4488FF" : "#FF8800" }}>
                        {isLocked ? "🔒 LOCKED" : "⏳ DRAFT"}
                      </p>
                      <p className="font-mono text-xs text-[#444]">
                        {PLACEMENT_LABELS[existing.placement ?? 0]} · {existing.finalPoints}pts
                      </p>
                    </div>
                  )}
                  {overrideMode && existing?.locked && placements[team] && (
                    <button
                      onClick={() => handleOverride(team)}
                      className="ml-2 font-mono text-xs px-3 py-2 border border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500]/10 transition-colors"
                    >
                      OVERRIDE
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSaveAll}
              disabled={enterResult.isPending || Object.keys(placements).length === 0}
              className="flex-1 bg-[#1A1A1A] text-[#F2F0EB] font-mono text-xs tracking-widest py-3 hover:bg-[#222] disabled:opacity-40 transition-colors"
            >
              SAVE DRAFT
            </button>
            <button
              onClick={handleLock}
              disabled={lockResults.isPending}
              className="flex-1 bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest py-3 hover:bg-[#F2F0EB] disabled:opacity-40 transition-colors"
            >
              🔒 LOCK & PUSH TO LEADERBOARD
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Audit Log ────────────────────────────────────────────────────────────────
function AuditLog() {
  const { data: log } = trpc.scoring.getAuditLog.useQuery({ limit: 200 });

  const REASON_LABELS: Record<string, string> = {
    event_result: "EVENT",
    double_down: "DOUBLE DOWN",
    all_in: "ALL IN",
    sabotage: "SABOTAGE",
    admin_override: "OVERRIDE",
  };

  if (!log?.length) return <div className="font-mono text-[#555] text-sm">No audit entries yet.</div>;

  return (
    <div className="space-y-2">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-4">POINTS AUDIT LOG ({log.length})</p>
      <div className="max-h-[500px] overflow-y-auto space-y-1">
        {log.map((entry) => {
          const color = TEAM_COLORS[entry.team as Team];
          const isPositive = entry.delta >= 0;
          return (
            <div key={entry.id} className="border border-[#1A1A1A] px-3 py-2 flex items-center gap-3 text-xs font-mono">
              <span className="text-[#444] w-32 flex-shrink-0">
                {new Date(entry.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
              <span className="uppercase tracking-wider w-16 flex-shrink-0" style={{ color }}>
                {entry.team}
              </span>
              <span className={`w-14 flex-shrink-0 font-display text-base ${isPositive ? "text-[#00FF88]" : "text-[#FF4444]"}`}>
                {isPositive ? "+" : ""}{entry.delta}
              </span>
              <span className="text-[#555] w-24 flex-shrink-0">
                {REASON_LABELS[entry.reason] ?? entry.reason}
              </span>
              <span className="text-[#333] truncate">{entry.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Manual Points Adjustment ─────────────────────────────────────────────────
function ManualAdjust() {
  const [team, setTeam] = useState<Team>("red");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState<"admin_override" | "sabotage">("admin_override");
  const [note, setNote] = useState("");

  const adjust = trpc.scoring.adminAdjustPoints.useMutation({
    onSuccess: () => { toast.success("Points adjusted"); setDelta(""); setNote(""); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="border border-[#1A1A1A] p-4 bg-[#0D0D0D] space-y-3">
      <p className="font-mono text-[#555] text-xs tracking-[0.3em]">MANUAL POINTS ADJUSTMENT</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-mono text-[#444] text-xs block mb-1">TEAM</label>
          <select
            value={team}
            onChange={(e) => setTeam(e.target.value as Team)}
            className="w-full bg-[#0A0A0A] border border-[#222] text-[#F2F0EB] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[#FF5500]"
          >
            {TEAMS.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
          </select>
        </div>
        <div>
          <label className="font-mono text-[#444] text-xs block mb-1">DELTA (±)</label>
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="+10 or -5"
            className="w-full bg-[#0A0A0A] border border-[#222] text-[#F2F0EB] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[#FF5500]"
          />
        </div>
      </div>
      <div>
        <label className="font-mono text-[#444] text-xs block mb-1">REASON</label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value as "admin_override" | "sabotage")}
          className="w-full bg-[#0A0A0A] border border-[#222] text-[#F2F0EB] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[#FF5500]"
        >
          <option value="admin_override">Admin Override</option>
          <option value="sabotage">Sabotage</option>
        </select>
      </div>
      <div>
        <label className="font-mono text-[#444] text-xs block mb-1">NOTE (optional)</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Brief explanation"
          className="w-full bg-[#0A0A0A] border border-[#222] text-[#F2F0EB] font-mono text-sm px-3 py-2 focus:outline-none focus:border-[#FF5500]"
        />
      </div>
      <button
        onClick={() => {
          const d = parseInt(delta);
          if (isNaN(d)) { toast.error("Enter a valid number"); return; }
          adjust.mutate({ team, delta: d, reason, note: note || undefined });
        }}
        disabled={adjust.isPending || !delta}
        className="w-full bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest py-3 hover:bg-[#F2F0EB] disabled:opacity-40 transition-colors"
      >
        APPLY ADJUSTMENT
      </button>
    </div>
  );
}

// ─── Main AdminScoring ────────────────────────────────────────────────────────
export default function AdminScoring() {
  const [view, setView] = useState<ScoringView>("leaderboard");

  const tabs: { id: ScoringView; label: string }[] = [
    { id: "leaderboard", label: "LEADERBOARD" },
    { id: "events", label: "EVENTS" },
    { id: "entry", label: "RESULT ENTRY" },
    { id: "audit", label: "AUDIT LOG" },
    { id: "wildcards", label: "⚡ WILDCARDS" },
  ];

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#1A1A1A]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`font-mono text-xs tracking-widest px-4 py-3 border-b-2 transition-colors ${
              view === t.id
                ? "border-[#FF5500] text-[#FF5500]"
                : "border-transparent text-[#444] hover:text-[#888]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Views */}
      {view === "leaderboard" && (
        <div className="space-y-6">
          <LiveLeaderboard />
          <ManualAdjust />
        </div>
      )}
      {view === "events" && <EventControl />}
      {view === "entry" && <ResultEntry />}
      {view === "audit" && <AuditLog />}
      {view === "wildcards" && <AdminWildcardMonitor />}
    </div>
  );
}
