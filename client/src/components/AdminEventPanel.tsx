/**
 * AdminEventPanel — Inline accordion referee scoring
 * Tap an event → placement form expands inline below that row
 * Fill 1ST/2ND/3RD/4TH for each team → SUBMIT & LOCK
 * Row turns green on success, accordion closes
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
  const [showAll, setShowAll] = useState(false);

  const { data: events, refetch: refetchEvents } = trpc.scoring.getEvents.useQuery(undefined, {
    refetchInterval: 20_000,
  });

  const enterResult = trpc.scoring.adminEnterResult.useMutation();
  const lockResults = trpc.scoring.adminLockEventResults.useMutation();
  const setStatus   = trpc.scoring.adminSetEventStatus.useMutation();

  // Show active events by default; show all when toggled
  const activeStatuses = ["armed", "briefing", "live", "delayed"];
  const visibleEvents = showAll
    ? (events ?? [])
    : (events ?? []).filter((e) => activeStatuses.includes(e.status));

  const handleSelectEvent = (id: number) => {
    // Toggle: tap same event to collapse
    if (selectedEventId === id) {
      setSelectedEventId(null);
      setPlacements({});
      setSubmitted(false);
      return;
    }
    setSelectedEventId(id);
    setPlacements({});
    setSubmitted(false);
  };

  const allSet = TEAMS.every((t) => placements[t] !== undefined);
  const isPending = enterResult.isPending || lockResults.isPending || setStatus.isPending;

  const handleSubmit = async (event: { id: number | string; name: string; pointsMultiplier?: number }) => {
    const eventId = Number(event.id);
    if (!allSet) { toast.error("Select a placement for every team"); return; }

    try {
      for (const team of TEAMS) {
        const placement = placements[team]!;
        await enterResult.mutateAsync({ eventId, team, placement });
      }
      await lockResults.mutateAsync({ eventId });
      await setStatus.mutateAsync({ eventId, status: "complete" });

      toast.success(`✓ ${event.name} — results locked & pushed`);
      setSubmitted(true);
      refetchEvents();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  };

  const handleNextEvent = () => {
    setSelectedEventId(null);
    setPlacements({});
    setSubmitted(false);
  };

  return (
    <div className="space-y-0 max-w-lg mx-auto">

      {/* ── Event list ── */}
      {!events ? (
        <p className="font-mono text-[#555] text-xs px-1 py-3">Loading…</p>
      ) : (
        <div>
          <p className="font-mono text-[#555] text-[10px] tracking-[0.35em] mb-3 px-1">SELECT EVENT</p>

          {visibleEvents.length === 0 && !showAll && (
            <p className="font-mono text-[#555] text-[10px] tracking-wider py-2 px-1">
              No active events — arm an event to start scoring
            </p>
          )}

          {visibleEvents.map((ev) => {
            const isSelected = Number(ev.id) === selectedEventId;
            const isDone = ev.status === "complete";
            const isLockedDone = isDone && !isSelected; // completed and not the one we just submitted
            const sc = isDone ? "#00FF88" : (STATUS_COLOR[ev.status] ?? "#555");

            return (
              <div key={ev.id}>
                {/* ── Event row ── */}
                <button
                  onClick={() => handleSelectEvent(Number(ev.id))}
                  disabled={isLockedDone}
                  className="w-full flex items-center justify-between px-4 py-3 border-b text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    borderColor: isSelected
                      ? "#FF5500"
                      : isDone
                      ? "#00FF8830"
                      : (STATUS_COLOR[ev.status] ?? "#555") + "30",
                    background: isSelected
                      ? "#FF550015"
                      : isDone
                      ? "#00FF8808"
                      : "transparent",
                    borderBottomWidth: "1px",
                    borderTopWidth: isSelected ? "1px" : "0",
                    borderLeftWidth: isSelected ? "1px" : "0",
                    borderRightWidth: isSelected ? "1px" : "0",
                    borderStyle: "solid",
                  }}
                >
                  <span
                    className="font-mono text-sm font-bold tracking-wide"
                    style={{ color: isSelected ? "#FF5500" : isDone ? "#00FF88" : "#F2F0EB" }}
                  >
                    {ev.name}
                    {ev.pointsMultiplier > 1 && (
                      <span className="ml-2 text-[10px] font-normal" style={{ color: "#FF8800" }}>
                        ×{ev.pointsMultiplier}
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className="font-mono text-[10px] tracking-widest px-2 py-0.5 border"
                      style={{ color: sc, borderColor: sc + "44", background: sc + "11" }}
                    >
                      {STATUS_LABEL[ev.status] ?? ev.status.toUpperCase()}
                    </span>
                    {!isDone && (
                      <span className="font-mono text-[#444] text-[10px]">
                        {isSelected ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </button>

                {/* ── Inline accordion: placement form ── */}
                {isSelected && !submitted && (
                  <div
                    className="border border-t-0 border-[#FF5500] px-4 pb-5 pt-4 space-y-4"
                    style={{ background: "#0D0D0D" }}
                  >
                    <p className="font-mono text-[#555] text-[10px] tracking-[0.3em]">
                      SELECT PLACEMENT FOR EACH TEAM
                      {ev.pointsMultiplier > 1 && ` · ×${ev.pointsMultiplier} MULTIPLIER`}
                    </p>

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
                              const pts = BASE_POINTS[p] * (ev.pointsMultiplier ?? 1);
                              const isSel = selected === p;
                              return (
                                <button
                                  key={p}
                                  onClick={() => setPlacements((prev) => ({ ...prev, [team]: p }))}
                                  className="py-4 border font-mono text-center transition-all active:scale-[0.97]"
                                  style={{
                                    background: isSel ? ts.hex : "transparent",
                                    color: isSel ? "#0A0A0A" : "#666",
                                    borderColor: isSel ? ts.hex : "#2A2A2A",
                                    fontWeight: isSel ? 700 : 400,
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

                    <button
                      onClick={() => handleSubmit(ev)}
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

                {/* ── Inline success state ── */}
                {isSelected && submitted && (
                  <div
                    className="border border-t-0 border-[#00FF8840] px-4 py-5 flex items-center justify-between"
                    style={{ background: "#00FF8808" }}
                  >
                    <div>
                      <p className="font-mono text-[#00FF88] text-sm font-bold tracking-widest">✓ LOCKED</p>
                      <p className="font-mono text-[#555] text-[10px] tracking-wider mt-0.5">Results pushed to leaderboard</p>
                    </div>
                    <button
                      onClick={handleNextEvent}
                      className="font-mono text-xs tracking-widest px-4 py-2.5 border border-[#FF5500] text-[#FF5500] hover:bg-[#FF5500]/10 transition-colors flex-shrink-0 ml-4"
                    >
                      NEXT →
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show all / collapse toggle */}
          <button
            onClick={() => setShowAll((v) => !v)}
            className="w-full py-2 font-mono text-[10px] tracking-widest text-[#555] hover:text-[#F2F0EB] transition-colors text-center border border-[#1A1A1A] mt-1"
          >
            {showAll ? `▲ SHOW ACTIVE ONLY` : `▼ SHOW ALL EVENTS (${(events ?? []).length})`}
          </button>
        </div>
      )}
    </div>
  );
}
