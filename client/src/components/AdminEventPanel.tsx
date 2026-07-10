/**
 * AdminEventPanel — Simple referee scoring screen
 * 1. Select event at the top
 * 2. Pick placement for each team (RED / BLUE / PINK / ORANGE)
 * 3. Hit SUBMIT — saves + locks in one tap
 * 4. Select next event
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type Team = "red" | "blue" | "pink" | "orange";
const TEAMS: Team[] = ["red", "blue", "pink", "orange"];

const TEAM_STYLE: Record<Team, { hex: string; label: string }> = {
  red:    { hex: "#FF4444", label: "RED" },
  blue:   { hex: "#4488FF", label: "BLUE" },
  pink:   { hex: "#FF66CC", label: "PINK" },
  orange: { hex: "#FF8800", label: "ORANGE" },
};

const BASE_POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 4, 4: 2 };

const STATUS_COLOR: Record<string, string> = {
  upcoming: "#555", armed: "#FF8800", briefing: "#FFCC00",
  live: "#00FF88", delayed: "#FF4444", complete: "#4488FF",
};
const STATUS_LABEL: Record<string, string> = {
  upcoming: "UPCOMING", armed: "ARMED", briefing: "BRIEFING",
  live: "● LIVE", delayed: "DELAYED", complete: "✓ DONE",
};

export function AdminEventPanel() {
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [placements, setPlacements] = useState<Partial<Record<Team, number>>>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: events } = trpc.scoring.getEvents.useQuery(undefined, {
    refetchInterval: 20_000,
  });

  const enterResult = trpc.scoring.adminEnterResult.useMutation();
  const lockResults = trpc.scoring.adminLockEventResults.useMutation();
  const setStatus   = trpc.scoring.adminSetEventStatus.useMutation();

  const selectedEvent = (events ?? []).find((e) => Number(e.id) === selectedEventId);

  const handleSelectEvent = (id: number) => {
    setSelectedEventId(id);
    setPlacements({});
    setSubmitted(false);
  };

  const allSet = TEAMS.every((t) => placements[t] !== undefined);

  const handleSubmit = async () => {
    if (!selectedEventId || !selectedEvent) return;
    if (!allSet) { toast.error("Select a placement for every team"); return; }

    try {
      // 1. Enter all placements
      for (const team of TEAMS) {
        const placement = placements[team]!;
        await enterResult.mutateAsync({ eventId: selectedEventId, team, placement });
      }
      // 2. Lock & push to leaderboard
      await lockResults.mutateAsync({ eventId: selectedEventId });
      // 3. Mark event as complete
      await setStatus.mutateAsync({ eventId: selectedEventId, status: "complete" });

      toast.success(`✓ ${selectedEvent.name} — results locked & pushed`);
      setSubmitted(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const isPending = enterResult.isPending || lockResults.isPending || setStatus.isPending;

  return (
    <div className="space-y-6 max-w-lg mx-auto">

      {/* ── Event selector ── */}
      <div>
        <p className="font-mono text-[#555] text-[10px] tracking-[0.35em] mb-3">SELECT EVENT</p>
        {!events ? (
          <p className="font-mono text-[#555] text-xs">Loading…</p>
        ) : (
          <div className="space-y-1.5">
            {events.map((ev) => {
              const isSelected = Number(ev.id) === selectedEventId;
              const sc = STATUS_COLOR[ev.status] ?? "#555";
              const isDone = ev.status === "complete";
              return (
                <button
                  key={ev.id}
                  onClick={() => handleSelectEvent(Number(ev.id))}
                  disabled={isDone}
                  className="w-full flex items-center justify-between px-4 py-3 border text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: isSelected ? "#FF5500" : isDone ? "#1A1A1A" : sc + "44",
                    background: isSelected ? "#FF550015" : isDone ? "transparent" : sc + "08",
                  }}
                >
                  <span
                    className="font-mono text-sm font-bold tracking-wide"
                    style={{ color: isSelected ? "#FF5500" : isDone ? "#444" : "#F2F0EB" }}
                  >
                    {ev.name}
                    {ev.pointsMultiplier > 1 && (
                      <span className="ml-2 text-[10px] font-normal" style={{ color: "#FF8800" }}>
                        ×{ev.pointsMultiplier}
                      </span>
                    )}
                  </span>
                  <span
                    className="font-mono text-[10px] tracking-widest px-2 py-0.5 border flex-shrink-0 ml-3"
                    style={{ color: sc, borderColor: sc + "44", background: sc + "11" }}
                  >
                    {STATUS_LABEL[ev.status] ?? ev.status.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Placement entry ── */}
      {selectedEvent && !submitted && (
        <div className="space-y-4">
          <div className="border-t border-[#1A1A1A] pt-4">
            <p className="font-mono text-[#F2F0EB] text-base font-bold tracking-wide mb-0.5">
              {selectedEvent.name}
            </p>
            <p className="font-mono text-[#555] text-[10px] tracking-[0.3em]">
              SELECT PLACEMENT FOR EACH TEAM
              {selectedEvent.pointsMultiplier > 1 && ` · ×${selectedEvent.pointsMultiplier} MULTIPLIER`}
            </p>
          </div>

          {TEAMS.map((team) => {
            const ts = TEAM_STYLE[team];
            const selected = placements[team];
            return (
              <div key={team}>
                <p className="font-mono text-sm font-bold tracking-widest mb-2" style={{ color: ts.hex }}>
                  TEAM {ts.label}
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((p) => {
                    const pts = BASE_POINTS[p] * (selectedEvent.pointsMultiplier ?? 1);
                    const isSelected = selected === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPlacements((prev) => ({ ...prev, [team]: p }))}
                        className="py-4 border font-mono text-center transition-all"
                        style={{
                          background: isSelected ? ts.hex : "transparent",
                          color: isSelected ? "#0A0A0A" : "#666",
                          borderColor: isSelected ? ts.hex : "#2A2A2A",
                          fontWeight: isSelected ? 700 : 400,
                        }}
                      >
                        <div className="text-sm tracking-widest">
                          {p === 1 ? "1ST" : p === 2 ? "2ND" : p === 3 ? "3RD" : "4TH"}
                        </div>
                        <div className="text-[10px] mt-0.5 opacity-70">{pts}pts</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isPending || !allSet}
            className="w-full py-5 font-mono text-base tracking-widest font-bold transition-all disabled:cursor-not-allowed mt-2"
            style={{
              background: allSet && !isPending ? "#FF5500" : "#1A1A1A",
              color: allSet && !isPending ? "#0A0A0A" : "#444",
              border: allSet && !isPending ? "2px solid #FF5500" : "2px solid #2A2A2A",
            }}
          >
            {isPending ? "SUBMITTING…" : "SUBMIT & LOCK"}
          </button>

          {!allSet && (
            <p className="font-mono text-[#444] text-[10px] text-center tracking-wider">
              Select a placement for all 4 teams to submit
            </p>
          )}
        </div>
      )}

      {/* ── Success state ── */}
      {selectedEvent && submitted && (
        <div className="border border-[#00FF8840] bg-[#00FF8808] px-4 py-6 text-center space-y-3">
          <p className="font-mono text-[#00FF88] text-lg font-bold tracking-widest">✓ LOCKED</p>
          <p className="font-mono text-[#F2F0EB] text-sm">{selectedEvent.name}</p>
          <p className="font-mono text-[#555] text-[10px] tracking-wider">
            Results pushed to leaderboard
          </p>
          <button
            onClick={() => { setSelectedEventId(null); setPlacements({}); setSubmitted(false); }}
            className="mt-2 font-mono text-xs tracking-widest px-6 py-3 border border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500]/10 transition-colors"
          >
            NEXT EVENT →
          </button>
        </div>
      )}
    </div>
  );
}
