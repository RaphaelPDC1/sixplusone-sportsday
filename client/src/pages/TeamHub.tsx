import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { NowHappening } from "@/components/ui/now-happening";
import { BackNav } from "@/components/ui/back-nav";
import { EntrySplash } from "@/components/ui/entry-splash";
import { HeroWave } from "@/components/ui/hero-wave";
import { TeamLiveFeatures } from "@/components/ui/team-live-features";
import { resetRevealJourneyForReplay } from "@/lib/revealJourney";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const TEAM_SHIRT_URLS: Record<string, string> = {
  red:    "/manus-storage/sportsday002-tee-red_c745a665.png",
  blue:   "/manus-storage/sportsday002-tee-blue_1d791365.png",
  pink:   "/manus-storage/sportsday002-tee-pink_7dd53e63.png",
  orange: "/manus-storage/sportsday002-tee-orange_64940495.png",
};

const TEAM_COLORS: Record<string, { bg: string; text: string; border: string; glow: string; hex: string }> = {
  red:    { bg: "bg-[#B80000]",   text: "text-[#B80000]",   border: "border-[#B80000]",   glow: "rgba(184,0,0,0.4)",    hex: "#B80000" },
  blue:   { bg: "bg-[#1A4FE8]",   text: "text-[#1A4FE8]",   border: "border-[#1A4FE8]",   glow: "rgba(26,79,232,0.4)",  hex: "#1A4FE8" },
  pink:   { bg: "bg-[#F72B8C]",   text: "text-[#F72B8C]",   border: "border-[#F72B8C]",   glow: "rgba(247,43,140,0.4)", hex: "#F72B8C" },
  orange: { bg: "bg-[#FF6B00]",   text: "text-[#FF6B00]",   border: "border-[#FF6B00]",   glow: "rgba(255,107,0,0.4)",  hex: "#FF6B00" },
};

// RGB tint for each team colour (used by HeroWave background)
const TEAM_TINT: Record<string, { r: number; g: number; b: number }> = {
  red:    { r: 184, g: 0,   b: 0   },
  blue:   { r: 26,  g: 79,  b: 232 },
  pink:   { r: 247, g: 43,  b: 140 },
  orange: { r: 255, g: 107, b: 0   },
};

// Hardcoded co-captains per team (2 captains each)
const TEAM_CAPTAINS: Record<string, { squadName: string; captains: string[] }> = {
  red:    { squadName: "RELENTLESS",   captains: ["Queen", "Slew"] },
  blue:   { squadName: "THE VILLAINS", captains: ["Chigz", "Axel"] },
  pink:   { squadName: "UNRULY",       captains: ["Verity", "Henry"] },
  orange: { squadName: "CHAOS",        captains: ["Nahal", "George"] },
};

const EVENTS = [
  { id: "sprint",        name: "100M SPRINT",          icon: "💨", desc: "Pure speed. No excuses." },
  { id: "relay",         name: "4×100 RELAY",           icon: "🏃", desc: "Team timing is everything." },
  { id: "tug_of_war",   name: "TUG OF WAR",            icon: "💪", desc: "Strength meets strategy." },
  { id: "obstacle",     name: "OBSTACLE COURSE",       icon: "🧱", desc: "Chaos, controlled." },
  { id: "long_jump",    name: "LONG JUMP",              icon: "🦘", desc: "Commit or go home." },
  { id: "penalty_shoot",name: "PENALTY SHOOTOUT",      icon: "⚽", desc: "Nerves of steel required." },
  { id: "tiebreaker",   name: "MYSTERY TIEBREAKER",    icon: "❓", desc: "Nobody knows. Yet." },
];

const WILDCARDS = [
  { id: "double_points",   name: "DOUBLE POINTS",      desc: "One event, double the score. Use wisely.", icon: "×2" },
  { id: "steal_a_player",  name: "STEAL A PLAYER",     desc: "Borrow one player from another team for one event.", icon: "👤" },
  { id: "bonus_round",     name: "BONUS ROUND",        desc: "Trigger a secret bonus event for your team only.", icon: "⚡" },
];

const AWARD_CATEGORIES = [
  { id: "mvp",              label: "MVP",                   icon: "🏆" },
  { id: "funniest_moment",  label: "FUNNIEST MOMENT",       icon: "😂" },
  { id: "most_dramatic",    label: "MOST DRAMATIC",         icon: "🎭" },
  { id: "best_dressed",     label: "BEST DRESSED",          icon: "👑" },
  { id: "most_competitive", label: "MOST COMPETITIVE",      icon: "🔥" },
  { id: "biggest_surprise", label: "BIGGEST SURPRISE",      icon: "😱" },
  { id: "team_player",      label: "TEAM PLAYER",           icon: "🤝" },
] as const;

type AwardCategory = typeof AWARD_CATEGORIES[number]["id"];

// Location data is now served from hub.event (getTeamHub backend)

export default function TeamHub() {
  const [, navigate] = useLocation();
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem("teamhub_splash_seen") !== "true"
  );
  const userId = typeof window !== "undefined" ? localStorage.getItem("sd_user_id") ?? "" : "";
  const [activeTab, setActiveTab] = useState<"team" | "events" | "leaderboard" | "wildcards" | "awards" | "sponsors" | "location">("team");
  const [votingFor, setVotingFor] = useState<AwardCategory | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedCaptain, setSelectedCaptain] = useState<string | null>(null);
  const [squadExpanded, setSquadExpanded] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: hub, isLoading, error: hubError, refetch } = trpc.sportsday.getTeamHub.useQuery(
    { registrationId: userId },
    { enabled: !!userId, retry: false }
  );

  const { data: awardData, refetch: refetchAwards } = trpc.sportsday.getAwardVotes.useQuery(
    { registrationId: userId },
    { enabled: !!userId }
  );

  const castVoteMutation = trpc.sportsday.castAwardVote.useMutation({
    onSuccess: () => {
      toast.success("Vote cast!");
      refetchAwards();
      setVotingFor(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const wildcardMutation = trpc.sportsday.castWildcardVote.useMutation({
    onSuccess: () => {
      toast.success("Wildcard vote locked in!");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadPhotoMutation = trpc.sportsday.uploadProfilePhoto.useMutation({
    onSuccess: () => {
      toast.success("Profile photo updated!");
      setPhotoUploading(false);
      refetch();
    },
    onError: (e) => {
      toast.error(e.message);
      setPhotoUploading(false);
    },
  });

  const handlePhotoSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5MB)"); return; }
    setPhotoUploading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      await uploadPhotoMutation.mutateAsync({ registrationId: userId, imageDataUrl: dataUrl });
    };
    reader.readAsDataURL(file);
  }, [userId, uploadPhotoMutation]);

  // On FORBIDDEN (team locked) → go back to holding WITHOUT clearing localStorage
  // On NOT_FOUND (invalid ID) → clear localStorage and send to holding
  if (hubError) {
    const code = (hubError as { data?: { code?: string } }).data?.code;
    if (code === "NOT_FOUND" && typeof window !== "undefined") {
      localStorage.removeItem("sd_user_id");
    }
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-5 px-6">
          <img src={LOGO_URL} alt="6+1" className="h-8 w-auto mx-auto opacity-40" style={{ filter: "invert(1)" }} />
          <p className="font-mono text-white/40 text-sm">
            {code === "FORBIDDEN" ? "Your team is locked. Complete payment to get in." : "No registration found."}
          </p>
          <button
            onClick={() => navigate("/holding")}
            className="block font-display text-[#FF5500] text-xl tracking-widest hover:opacity-80 transition-opacity"
          >
            ← BACK TO HOLDING
          </button>
          <button
            onClick={() => navigate("/enter")}
            className="block font-mono text-white/25 text-xs tracking-widest hover:text-white/50 transition-colors mx-auto"
          >
            REGISTER →
          </button>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-5 px-6">
          <img src={LOGO_URL} alt="6+1" className="h-8 w-auto mx-auto opacity-40" style={{ filter: "invert(1)" }} />
          <p className="font-mono text-white/40 text-sm">We don't recognise this registration.</p>
          <button onClick={() => navigate("/holding")} className="block font-display text-[#FF5500] text-xl tracking-widest hover:opacity-80 transition-opacity">
            ← BACK TO HOLDING
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-mono text-white/30 text-xs tracking-widest">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="font-mono text-white/40 text-sm">Team not unlocked yet. Unlock to get in.</p>
          <button onClick={() => navigate("/holding")} className="font-display text-[#FF5500] text-xl tracking-widest">
            ← BACK TO HOLDING
          </button>
        </div>
      </div>
    );
  }

  const tc = TEAM_COLORS[hub.team ?? "red"] ?? TEAM_COLORS.red;
  const myMember = hub.members.find((m) => m.id === userId);
  const myPhoto = hub.members.find((m) => m.id === userId)?.photoUrl;

  // Leaderboard: aggregate points per team
  const teamPoints: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
  hub.leaderboard.forEach((entry) => {
    if (!entry.dnf && entry.points) {
      teamPoints[entry.team] = (teamPoints[entry.team] ?? 0) + entry.points;
    }
  });
  const sortedTeams = Object.entries(teamPoints).sort((a, b) => b[1] - a[1]);

  const TABS = [
    { id: "team" as const,           label: "TEAM",           icon: "👥" },
    { id: "events" as const,         label: "EVENTS",         icon: "🏃" },
    { id: "leaderboard" as const,    label: "LEADERBOARD",    icon: "📊" },
    { id: "wildcards" as const,      label: "WILDCARDS",      icon: "⚡" },
    { id: "awards" as const,         label: "AWARDS",         icon: "🏆" },
    { id: "sponsors" as const,       label: "SPONSORS",       icon: "🤟" },
    { id: "location" as const,       label: "LOCATION",       icon: "📍" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB] relative overflow-hidden">
      {/* Full-page wave background tinted to team colour */}
      <HeroWave
        tint={TEAM_TINT[hub.team ?? "red"] ?? TEAM_TINT.red}
        className="fixed inset-0 w-full h-full pointer-events-none"
      />
      {/* Subtle dark veil over the whole page so content stays readable */}
      <div className="fixed inset-0 bg-black/65 pointer-events-none" style={{ zIndex: 0 }} />
      {showSplash && <EntrySplash onComplete={() => { sessionStorage.setItem("teamhub_splash_seen", "true"); setShowSplash(false); }} />}
      {/* Live event indicator */}
      <div className="relative z-10 px-5 pt-4">
        <NowHappening />
      </div>
      {/* Header */}
      <div
        className="relative z-10 overflow-hidden"
        style={{
          background: "transparent",
        }}
      >

        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-5">
            <BackNav
              to="/reveal"
              inline
              label="REPLAY REVEAL"
              onBeforeNavigate={() => {
                // Reset reveal journey flags so the full sequence replays from the start
                // Paid: /reveal → /unlock-reveal → /team-hub
                // Free: /reveal → /team-hub
                const regId = localStorage.getItem("sd_user_id") ?? "";
                resetRevealJourneyForReplay(regId, hub?.accessType);
                // Clear reveal splash so it plays fresh
                sessionStorage.removeItem("reveal_splash_seen");
              }}
            />
            <img src={LOGO_URL} alt="6+1" className="h-10 w-auto" style={{ filter: "invert(1)" }} />
          </div>

          {/* Team identity */}
          <div className="flex items-center gap-4">

            {/* Profile photo */}
            <div className="relative flex-shrink-0">
              <div
                className="w-16 h-16 rounded-full overflow-hidden border-2 flex items-center justify-center"
                style={{ borderColor: tc.hex, boxShadow: `0 0 20px ${tc.glow}` }}
              >
                {myPhoto ? (
                  <img src={myPhoto} alt="You" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-opacity"
                style={{ background: tc.hex }}
                title="Upload photo"
              >
                {photoUploading ? "⏳" : "📷"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </div>

            <div className="min-w-0">
              <div
                className="font-display text-4xl tracking-widest leading-none"
                style={{ color: tc.hex, textShadow: `0 0 30px ${tc.glow}` }}
              >
                TEAM {(hub.team ?? "red").toUpperCase()}
              </div>
              {myMember?.profileTagline && (
                <p className="font-mono text-white/40 text-xs tracking-wider mt-1 truncate">
                  {myMember.profileTagline}
                </p>
              )}
              <p className="font-mono text-white/25 text-xs mt-1">
                {hub.totalMembers} MEMBERS
              </p>
            </div>
          </div>

          {/* Live leaderboard strip */}
          {sortedTeams.some(([, pts]) => pts > 0) && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {sortedTeams.map(([team, pts], i) => (
                <div
                  key={team}
                  className="flex-shrink-0 flex items-center gap-2 px-3 py-2 border"
                  style={{
                    borderColor: team === hub.team ? tc.hex : "rgba(255,255,255,0.1)",
                    background: team === hub.team ? `${tc.hex}15` : "transparent",
                  }}
                >
                  <span className="font-mono text-white/30 text-xs">{i + 1}</span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: TEAM_COLORS[team]?.hex ?? "#fff" }}
                  />
                  <span
                    className="font-display text-sm tracking-widest"
                    style={{ color: team === hub.team ? tc.hex : "rgba(242,240,235,0.6)" }}
                  >
                    {team.toUpperCase()}
                  </span>
                  <span className="font-mono text-white/50 text-xs">{pts}pts</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-white/10 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 py-3 px-2 font-mono text-[10px] tracking-widest transition-all ${
                activeTab === tab.id
                  ? "text-[#F2F0EB]"
                  : "text-white/30 hover:text-white/50"
              }`}
              style={activeTab === tab.id ? { borderBottom: `2px solid ${tc.hex}` } : {}}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="relative z-10 px-5 py-6 max-w-2xl mx-auto">

        {/* ─── TEAM TAB ─── */}
        {activeTab === "team" && (
          <div className="space-y-4">
            <SectionHeader label="YOUR SQUAD" />
            
            {/* Team Co-Captains */}
            {(() => {
              const teamKey = hub.team ?? "red";
              const capData = TEAM_CAPTAINS[teamKey] ?? TEAM_CAPTAINS.red;
              return (
                <div className="mb-6">
                  <div
                    className="relative p-6 border-2 overflow-hidden"
                    style={{
                      borderColor: tc.hex,
                      background: `linear-gradient(135deg, ${tc.hex}1A 0%, transparent 70%)`,
                      boxShadow: `0 0 40px ${tc.glow}`,
                    }}
                  >
                    {/* top accent bar */}
                    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: tc.hex }} />

                    <div className="flex items-center justify-between mb-5">
                      <span className="font-mono text-xs tracking-[0.3em]" style={{ color: tc.hex }}>
                        TEAM CAPTAINS
                      </span>
                      <span className="font-display text-sm tracking-widest text-white/40">
                        {capData.squadName}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {capData.captains.map((cap) => {
                        const capMember = hub.members.find(
                          (m) => m.fullName?.toLowerCase().includes(cap.toLowerCase())
                        );
                        return (
                          <button
                            key={cap}
                            onClick={() => setSelectedCaptain(cap)}
                            className="flex flex-col items-center text-center p-4 border transition-all active:scale-95 hover:opacity-80 w-full"
                            style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
                          >
                            <div
                              className="w-14 h-14 rounded-full border-2 overflow-hidden flex-shrink-0 flex items-center justify-center mb-3"
                              style={{ borderColor: tc.hex, boxShadow: `0 0 16px ${tc.glow}` }}
                            >
                              {capMember?.photoUrl ? (
                                <img src={capMember.photoUrl} alt={cap} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-2xl font-display" style={{ color: tc.hex }}>C</span>
                              )}
                            </div>
                            <div
                              className="font-display text-2xl tracking-widest leading-none"
                              style={{ color: tc.hex, textShadow: `0 0 20px ${tc.glow}` }}
                            >
                              {cap.toUpperCase()}
                            </div>
                            <div className="font-mono text-[10px] tracking-[0.25em] text-white/40 mt-2">
                              CO-CAPTAIN
                            </div>
                            <div className="font-mono text-[9px] tracking-widest text-white/20 mt-1">
                              TAP TO VIEW →
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
            
            {hub.members.length === 0 ? (
              <p className="font-mono text-white/30 text-sm text-center py-8">
                First one in. Your teammates are on their way.
              </p>
            ) : (
              <>
                {/* Collapsible squad header */}
                <button
                  onClick={() => setSquadExpanded((v) => !v)}
                  className="w-full flex items-center justify-between py-3 px-4 border border-white/10 bg-white/[0.02] transition-all hover:border-white/20 mt-2"
                >
                  <span className="font-mono text-xs tracking-[0.25em] text-white/50">
                    {hub.members.length} TEAMMATES
                  </span>
                  <span className="font-mono text-xs tracking-widest" style={{ color: tc.hex }}>
                    {squadExpanded ? "COLLAPSE ▲" : "VIEW SQUAD ▼"}
                  </span>
                </button>

                {squadExpanded && (
                <div className="space-y-3 mt-2">
                {hub.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 border border-white/10 bg-white/[0.02] cursor-pointer transition-all hover:border-white/30"
                    style={member.id === userId ? { borderColor: `${tc.hex}50`, background: `${tc.hex}08` } : {}}
                    onClick={() => setSelectedMember(member)}
                  >
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center"
                      style={{ borderColor: member.id === userId ? tc.hex : "rgba(255,255,255,0.15)" }}
                    >
                      {member.photoUrl ? (
                        <img src={member.photoUrl} alt={member.fullName ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                          <span className="text-xl">
                            {member.teammateType === "motivator" ? "📣"
                              : member.teammateType === "strategist" ? "🧠"
                              : member.teammateType === "wildcard" ? "🃏"
                              : member.teammateType === "silent_assassin" ? "🎯"
                              : "⚡"}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg tracking-widest truncate">
                          {member.fullName}
                        </span>
                        {member.id === userId && (
                          <span
                            className="font-mono text-[10px] tracking-widest px-2 py-0.5"
                            style={{ background: `${tc.hex}20`, color: tc.hex }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                      {member.instagramHandle && (
                         <a
                           href={`https://instagram.com/${member.instagramHandle.replace(/^@/, '')}`}
                           target="_blank"
                           rel="noopener noreferrer"
                           className="font-mono text-white/30 text-xs hover:text-white/60 transition-colors"
                           onClick={(e) => e.stopPropagation()}
                         >@{member.instagramHandle}</a>
                       )}
                      {member.profileTagline && (
                        <p className="font-mono text-white/40 text-xs mt-0.5 truncate italic">
                          "{member.profileTagline}"
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono text-white/20 text-[10px] tracking-wider">
                        {member.strongestEvent?.toUpperCase() ?? "—"}
                      </div>
                    </div>
                     </div>
                ))}
              </div>
                )}
            </>
            )}
            {/* Photo upload prompt if no photo */}
            {!myPhoto && (
              <div
                className="p-4 border border-dashed border-white/20 text-center cursor-pointer hover:border-white/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="font-mono text-white/40 text-xs tracking-wider">
                  📷 ADD YOUR PROFILE PHOTO
                </p>
                <p className="font-mono text-white/20 text-[10px] mt-1">
                  Shows up in the awards vote
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── EVENTS TAB ─── */}
        {activeTab === "events" && (() => {
          // Build AI recs from member data
          const members = hub.members;
          const teammateTypes: string[] = members.map((m) => m.teammateType).filter((x) => x != null) as string[];
          const strongestEvents: string[] = members.map((m) => m.strongestEvent).filter((x) => x != null) as string[];
          const countOf = (arr: string[], val: string) => arr.filter((x) => x === val).length;

          // Map event ID → AI insight for that event
          const eventInsights: Record<string, string> = {};
          // Backend enums: strongestEvent = speed | strength | endurance | coordination | vibes
          //                 teammateType  = motivator | strategist | wildcard | silent_assassin | energy_bringer
          const speedCount = countOf(strongestEvents, "speed");
          if (speedCount >= 3) {
            eventInsights["sprint"] = `${speedCount} of your squad are strongest in speed. Push hard here — this is your edge.`;
            eventInsights["relay"] = `${speedCount} speed-focused members. Relay timing is your weapon — coordinate your fastest runners.`;
          }
          const strengthCount = countOf(strongestEvents, "strength");
          if (strengthCount >= 3) {
            eventInsights["tug_of_war"] = `${strengthCount} of your squad are strongest in strength. Tug of War is built for you — go all in.`;
          }
          const coordCount = countOf(strongestEvents, "coordination");
          if (coordCount >= 3) {
            eventInsights["obstacle"] = `${coordCount} coordination-focused players. The Obstacle Course rewards precision and timing — your squad has the edge.`;
          }
          const strategistCount = countOf(teammateTypes, "strategist");
          if (strategistCount >= 3 && !eventInsights["tug_of_war"]) {
            eventInsights["tug_of_war"] = `${strategistCount} strategists on your team. Tug of War is won by coordination, not just strength — you have the advantage.`;
          }
          const wildcardCount = countOf(teammateTypes, "wildcard");
          if (wildcardCount >= 3 && !eventInsights["obstacle"]) {
            eventInsights["obstacle"] = `${wildcardCount} wildcards in your squad. Unpredictable players thrive in chaos — this course is built for you.`;
          }
          const motivatorCount = countOf(teammateTypes, "motivator");
          if (motivatorCount >= 3 && !eventInsights["relay"]) {
            eventInsights["relay"] = `${motivatorCount} motivators on your team. Use that crowd energy in the Relay — momentum is contagious.`;
          }
          const energyCount = countOf(teammateTypes, "energy_bringer");
          if (energyCount >= 3 && !eventInsights["penalty_shoot"]) {
            eventInsights["penalty_shoot"] = `${energyCount} energy bringers on your team. Penalty shootout is a crowd moment — your energy will be the difference.`;
          }
          const enduranceCount = countOf(strongestEvents, "endurance");
          if (enduranceCount >= 2) {
            eventInsights["long_jump"] = `${enduranceCount} endurance-focused players. Long Jump rewards explosive power and consistency — push your best athletes here.`;
          }

          // Top-level recs (events with insights)
          const topRecs = EVENTS.filter((e) => eventInsights[e.id]);

          return (
          <div className="space-y-4">
            {/* ─── AI RECOMMENDATIONS (top) ─── */}
            <div
              className="p-4 border"
              style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">⚡</span>
                <span className="font-display text-sm tracking-widest" style={{ color: tc.hex }}>AI TEAM INTEL</span>
              </div>
              <p className="font-mono text-white/35 text-[10px] leading-relaxed mb-3">
                Based on your squad's questionnaire — tap any event to see your team's AI-powered strategy.
              </p>
              {topRecs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {topRecs.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setExpandedEvent(expandedEvent === e.id ? null : e.id)}
                      className="font-mono text-[10px] tracking-wider px-2 py-1 border transition-all"
                      style={{
                        borderColor: `${tc.hex}50`,
                        background: expandedEvent === e.id ? `${tc.hex}20` : "transparent",
                        color: expandedEvent === e.id ? tc.hex : "rgba(255,255,255,0.4)",
                      }}
                    >
                      {e.icon} {e.name}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-white/20 text-[10px]">
                  Fill in your squad profiles to unlock personalised event recommendations.
                </p>
              )}
            </div>

            <SectionHeader label="THE EVENTS" />
            <div className="space-y-3">
              {EVENTS.map((event) => {
                const eventResults = hub.leaderboard.filter((e) => e.eventName === event.id);
                const myTeamResult = eventResults.find((e) => e.team === hub.team);
                const isExpanded = expandedEvent === event.id;
                const aiInsight = eventInsights[event.id];
                return (
                  <div
                    key={event.id}
                    className="border transition-all cursor-pointer"
                    style={{
                      borderColor: isExpanded ? `${tc.hex}50` : "rgba(255,255,255,0.08)",
                      background: isExpanded ? `${tc.hex}06` : "rgba(255,255,255,0.01)",
                    }}
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{event.icon}</span>
                          <div>
                            <div className="font-display text-lg tracking-widest">{event.name}</div>
                            <div className="font-mono text-white/30 text-xs mt-0.5">{event.desc}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {myTeamResult && (
                            <div className="text-right">
                              {myTeamResult.dnf ? (
                                <span className="font-mono text-red-500/70 text-xs tracking-wider">DNF</span>
                              ) : (
                                <div>
                                  <div className="font-display text-xl tracking-widest" style={{ color: tc.hex }}>
                                    {myTeamResult.position ? `${myTeamResult.position}${ordinal(myTeamResult.position)}` : "—"}
                                  </div>
                                  <div className="font-mono text-white/30 text-xs">{myTeamResult.points ?? 0}pts</div>
                                </div>
                              )}
                            </div>
                          )}
                          <span className="font-mono text-white/20 text-xs">{isExpanded ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded: AI insight + mini leaderboard */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t" style={{ borderColor: `${tc.hex}20` }}>
                        {aiInsight && (
                          <div className="mt-3 flex items-start gap-2">
                            <span className="text-sm mt-0.5">⚡</span>
                            <p className="font-mono text-xs leading-relaxed" style={{ color: tc.hex }}>
                              {aiInsight}
                            </p>
                          </div>
                        )}
                        {/* Mini leaderboard for this event */}
                        {eventResults.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-4 gap-2">
                            {(["red","blue","pink","orange"] as const).map((team) => {
                              const r = eventResults.find((e) => e.team === team);
                              return (
                                <div key={team} className="text-center">
                                  <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: TEAM_COLORS[team]?.hex ?? "#fff" }} />
                                  <div className="font-mono text-white/30 text-[9px]">
                                    {r?.dnf ? "DNF" : r ? `${r.position ?? "—"}` : "—"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!aiInsight && eventResults.length === 0 && (
                          <p className="font-mono text-white/20 text-[10px] mt-3">No results yet. Check back on the day.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

          </div>
          );
        })()}

        {/* ─── LEADERBOARD TAB ─── */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <SectionHeader label="TEAM STANDINGS" />
            {sortedTeams.length === 0 ? (
              <p className="font-mono text-white/30 text-xs tracking-wider">
              No results yet. Check back on the day.
            </p>
            ) : (
              <>
                <div className="space-y-3">
                  {sortedTeams.map(([team, points], index) => {
                    const teamColor = TEAM_COLORS[team as keyof typeof TEAM_COLORS];
                    const teamEventCount = hub.leaderboard.filter((e) => e.team === team && !e.dnf).length;
                    return (
                      <div
                        key={team}
                        className="p-4 border transition-all"
                        style={{
                          borderColor: team === hub.team ? `${teamColor?.hex}50` : "rgba(255,255,255,0.1)",
                          background: team === hub.team ? `${teamColor?.hex}08` : "rgba(255,255,255,0.01)",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ background: teamColor?.hex }}
                            />
                            <div>
                              <div className="font-display text-lg tracking-widest uppercase">
                                {index + 1}. {team} TEAM
                              </div>
                              <div className="font-mono text-white/40 text-xs mt-0.5">
                                {teamEventCount} event{teamEventCount !== 1 ? 's' : ''} done
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div
                              className="font-bebas text-3xl tracking-widest"
                              style={{ color: teamColor?.hex }}
                            >
                              {points}
                            </div>
                            <div className="font-mono text-white/30 text-xs">POINTS</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 space-y-4">
                  <SectionHeader label="EVENT RESULTS" />
                  <div className="space-y-3">
                    {EVENTS.map((event) => {
                      const eventResults = hub.leaderboard.filter((e) => e.eventName === event.id);
                      if (eventResults.length === 0) return null;
                      return (
                        <div key={event.id} className="border border-white/10 bg-white/[0.02] p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{event.icon}</span>
                            <div>
                              <div className="font-display text-base tracking-widest">{event.name}</div>
                              <div className="font-mono text-white/30 text-xs">{event.desc}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {(["red", "blue", "pink", "orange"] as const).map((team) => {
                              const r = eventResults.find((e) => e.team === team);
                              const teamColor = TEAM_COLORS[team];
                              return (
                                <div key={team} className="text-center p-2 border border-white/5 bg-white/[0.01]">
                                  <div
                                    className="w-2 h-2 rounded-full mx-auto mb-1"
                                    style={{ background: teamColor?.hex }}
                                  />
                                  <div className="font-mono text-[9px] text-white/50 mb-1">{team}</div>
                                  <div className="font-display text-sm tracking-widest" style={{ color: teamColor?.hex }}>
                                    {r?.dnf ? "DNF" : r?.position ? `${r.position}${ordinal(r.position)}` : "—"}
                                  </div>
                                  <div className="font-mono text-[9px] text-white/40">{r?.points ?? 0}pts</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-6 p-4 border border-white/10 bg-white/[0.02]">
                  <div className="font-mono text-xs text-white/40 tracking-wider mb-2">SCORING</div>
                  <div className="space-y-1 font-mono text-xs text-white/50">
                    <div>1st Place: 5 points</div>
                    <div>2nd Place: 3 points</div>
                    <div>3rd Place: 1 point</div>
                    <div>DNF: 0 points</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── WILDCARDS TAB ─── */}
        {activeTab === "wildcards" && (
          <div className="space-y-4">
            <SectionHeader label="TEAM WILDCARDS" />
            <p className="font-mono text-white/30 text-xs tracking-wider">
              3 wildcards. Vote to activate one. Majority rules.
            </p>
            <div className="space-y-3">
              {WILDCARDS.map((wc) => {
                const votes = hub.wildcardCounts[wc.id] ?? 0;
                const hasVoted = hub.myWildcardVotes.includes(wc.id);
                const totalVotes = Object.values(hub.wildcardCounts).reduce((a, b) => a + b, 0);
                const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                return (
                  <div
                    key={wc.id}
                    className="p-5 border transition-all"
                    style={{
                      borderColor: hasVoted ? tc.hex : "rgba(255,255,255,0.1)",
                      background: hasVoted ? `${tc.hex}08` : "rgba(255,255,255,0.01)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span
                          className="font-display text-2xl tracking-widest"
                          style={{ color: tc.hex }}
                        >
                          {wc.icon}
                        </span>
                        <div>
                          <div className="font-display text-lg tracking-widest">{wc.name}</div>
                          <div className="font-mono text-white/30 text-xs mt-0.5">{wc.desc}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div
                          className="font-display text-2xl tracking-widest"
                          style={{ color: hasVoted ? tc.hex : "rgba(255,255,255,0.3)" }}
                        >
                          {votes}
                        </div>
                        <div className="font-mono text-white/20 text-[10px]">VOTES</div>
                      </div>
                    </div>
                    {/* Vote bar */}
                    <div className="h-1 bg-white/10 mb-3">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: tc.hex }}
                      />
                    </div>
                    {!hasVoted ? (
                      <button
                        onClick={() =>
                          wildcardMutation.mutate({
                            voterId: userId,
                            team: hub.team as "red" | "blue" | "pink" | "orange",
                            wildcardId: wc.id,
                          })
                        }
                        disabled={wildcardMutation.isPending}
                        className="w-full py-3 font-display text-lg tracking-widest transition-all active:scale-[0.99]"
                        style={{ background: `${tc.hex}20`, color: tc.hex, border: `1px solid ${tc.hex}40` }}
                      >
                        VOTE FOR THIS →
                      </button>
                    ) : (
                      <div className="text-center font-mono text-xs tracking-wider" style={{ color: tc.hex }}>
                        ✓ YOUR VOTE IS IN
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── AWARDS TAB ─── */}
        {activeTab === "awards" && (
          <div className="space-y-4">
            <SectionHeader label="FUN AWARDS" />
            <p className="font-mono text-white/30 text-xs tracking-wider">
              One vote per category. Make it count.
            </p>

            {AWARD_CATEGORIES.map((cat) => {
              const myVote = awardData?.myVotes.find((v) => v.category === cat.id);
              const votedFor = myVote ? hub.members.find((m) => m.id === myVote.nomineeId) : null;

              return (
                <div key={cat.id} className="border border-white/10 bg-white/[0.02]">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-display text-base tracking-widest">{cat.label}</span>
                    </div>
                    {votedFor ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full overflow-hidden border"
                          style={{ borderColor: tc.hex }}
                        >
                          {votedFor.photoUrl ? (
                            <img src={votedFor.photoUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center text-xs">👤</div>
                          )}
                        </div>
                        <span className="font-mono text-xs" style={{ color: tc.hex }}>
                          {votedFor.fullName?.split(" ")[0]}
                        </span>
                        <button
                          onClick={() => setVotingFor(cat.id)}
                          className="font-mono text-white/20 text-[10px] hover:text-white/50 transition-colors"
                        >
                          CHANGE
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setVotingFor(cat.id)}
                        className="font-mono text-xs tracking-wider transition-colors"
                        style={{ color: tc.hex }}
                      >
                        VOTE →
                      </button>
                    )}
                  </div>

                  {/* Expanded voting panel */}
                  {votingFor === cat.id && (
                    <div className="border-t border-white/10 p-4 space-y-2">
                      <p className="font-mono text-white/30 text-[10px] tracking-widest mb-3">
                        SELECT A TEAMMATE
                      </p>
                      {hub.members
                        .filter((m) => m.id !== userId)
                        .map((member) => (
                          <button
                            key={member.id}
                            onClick={() =>
                              castVoteMutation.mutate({
                                voterId: userId,
                                nomineeId: member.id,
                                category: cat.id,
                              })
                            }
                            disabled={castVoteMutation.isPending}
                            className="w-full flex items-center gap-3 p-3 border border-white/10 hover:border-white/30 transition-all text-left active:scale-[0.99]"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 flex-shrink-0 flex items-center justify-center">
                              {member.photoUrl ? (
                                <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm">👤</span>
                              )}
                            </div>
                            <div>
                              <div className="font-display text-sm tracking-widest">{member.fullName}</div>
                              {member.profileTagline && (
                                <div className="font-mono text-white/25 text-[10px] truncate italic">
                                  "{member.profileTagline}"
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      <button
                        onClick={() => setVotingFor(null)}
                        className="w-full font-mono text-white/20 text-xs py-2 hover:text-white/40 transition-colors"
                      >
                        CANCEL
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}



        {/* ─── SPONSORS TAB ─── */}
        {activeTab === "sponsors" && (
          <div className="space-y-4">
            <SectionHeader label="SPONSORS & VENDORS" />
            <p className="font-mono text-white/30 text-xs tracking-wider">
              The people making the day happen.
            </p>
            <div className="space-y-3">
              {[
                { name: "TBC", desc: "Sponsor details coming soon" },
                { name: "TBC", desc: "Sponsor details coming soon" },
                { name: "TBC", desc: "Sponsor details coming soon" },
                { name: "TBC", desc: "Sponsor details coming soon" },
              ].map((sponsor) => (
                <div
                  key={sponsor.name}
                  className="p-4 border border-white/10 bg-white/[0.02]"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-display text-base tracking-widest">{sponsor.name}</div>
                      <div className="font-mono text-white/30 text-xs mt-0.5">{sponsor.desc}</div>
                    </div>
                    <div
                      className="w-12 h-12 rounded border flex items-center justify-center text-2xl"
                      style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
                    >
                      🏢
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── LOCATION TAB ─── */}
        {activeTab === "location" && (
          <div className="space-y-4">
            <SectionHeader label="THE VENUE" />
            <div
              className="p-6 border"
              style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
            >
              <div
                className="font-display text-4xl tracking-widest mb-1"
                style={{ color: tc.hex }}
              >
                {hub?.event?.location?.toUpperCase() ?? "ENDCLIFFE PARK"}
              </div>
              <p className="font-mono text-white/40 text-sm">{hub?.event?.fullAddress ?? "Endcliffe Park, Sheffield, S11 7AB"}</p>
              <p className="font-mono text-white/40 text-sm mt-1">{hub?.event?.date ?? "Saturday 11 July 2026"}</p>
              <a
                href={hub?.event?.mapsUrl ?? "https://maps.google.com/?q=Endcliffe+Park+Sheffield+S11+7AB"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 font-mono text-xs tracking-widest underline underline-offset-4 transition-opacity hover:opacity-70"
                style={{ color: tc.hex }}
              >
                OPEN IN MAPS →
              </a>
            </div>

            <div className="space-y-2">
              {["Gates open 9:30AM", "Events start 10:00AM sharp", "Bring water + trainers", "Wear your team colour"].map((detail) => (
                <div
                  key={detail}
                  className="flex items-center gap-3 p-4 border border-white/10"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: tc.hex }}
                  />
                  <span className="font-mono text-sm tracking-wider">{detail}</span>
                </div>
              ))}
            </div>

            {/* Static map placeholder */}
            <div
              className="relative overflow-hidden border border-white/10"
              style={{ height: 200 }}
            >
              <iframe
                title="Venue map"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(hub?.event?.fullAddress ?? "Endcliffe Park Sheffield S11 7AB")}&output=embed`}
                className="w-full h-full"
                style={{ filter: "grayscale(1) invert(1) brightness(0.8)" }}
                loading="lazy"
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(to top, ${tc.hex}20, transparent)` }}
              />
            </div>
          </div>
         )}
        {/* ─── Account / Logout ─── */}
        <div className="relative z-10 mt-8 pb-10 px-0">
          <div className="border-t border-white/8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-white/25 text-[10px] tracking-[0.3em] mb-0.5">REGISTERED AS</p>
                <p className="font-mono text-white/50 text-xs tracking-wider">{typeof window !== "undefined" ? localStorage.getItem("userEmail") ?? "" : ""}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem("sd_user_id");
                  localStorage.removeItem("userEmail");
                  sessionStorage.setItem("came_from_teamhub", "1");
                  window.location.href = "/";
                }}
                className="font-mono text-white/25 text-xs tracking-[0.2em] hover:text-[#FF5500] transition-colors border border-white/10 hover:border-[#FF5500]/40 px-4 py-2"
              >
                LOG OUT
              </button>
            </div>
          </div>
        </div>
        
        {/* Member Profile Modal */}
        {selectedMember && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedMember(null)}
          >
            <div
              className="bg-[#0A0A0A] border-2 rounded-lg p-8 max-w-sm w-full"
              style={{
                borderColor: tc.hex,
                boxShadow: `0 0 40px ${tc.glow}`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
              >
                ✕
              </button>
              
              {/* Profile photo */}
              <div className="flex justify-center mb-6">
                <div
                  className="w-32 h-32 rounded-full overflow-hidden border-2 flex items-center justify-center"
                  style={{ borderColor: tc.hex }}
                >
                  {selectedMember.photoUrl ? (
                    <img src={selectedMember.photoUrl} alt={selectedMember.fullName ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center text-5xl">👤</div>
                  )}
                </div>
              </div>
              
              {/* Name */}
              <div className="text-center mb-2">
                <div className="font-display text-2xl tracking-widest" style={{ color: tc.hex }}>
                  {selectedMember.fullName}
                </div>
              </div>
              
              {/* Instagram handle */}
              {selectedMember.instagramHandle && (
                <div className="text-center mb-4">
                   <a
                     href={`https://instagram.com/${selectedMember.instagramHandle.replace(/^@/, '')}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="font-mono text-white/50 text-sm hover:text-white/80 transition-colors underline underline-offset-2"
                   >@{selectedMember.instagramHandle}</a>
                 </div>
              )}
              
              {/* Tagline */}
              {selectedMember.profileTagline && (
                <div className="text-center mb-4 border-t border-white/10 pt-4">
                  <p className="font-mono text-white/40 text-xs italic">"{selectedMember.profileTagline}"</p>
                </div>
              )}
              
              {/* Teammate type */}
              {selectedMember.teammateType && (
                <div className="text-center mb-4">
                  <span className="font-mono text-[10px] tracking-widest px-3 py-1 border" style={{ borderColor: tc.hex, color: tc.hex }}>
                    {selectedMember.teammateType.toUpperCase().replace(/_/g, " ")}
                  </span>
                </div>
              )}
              

              
              {/* Close button */}
              <button
                onClick={() => setSelectedMember(null)}
                className="w-full mt-6 font-mono text-xs tracking-widest py-2 border transition-colors"
                style={{
                  borderColor: tc.hex,
                  color: tc.hex,
                }}
              >
                CLOSE
              </button>
            </div>
          </div>
        )}

        {/* Captain Detail Modal */}
        {selectedCaptain && (() => {
          const teamKey = hub?.team ?? "red";
          const capData = TEAM_CAPTAINS[teamKey] ?? TEAM_CAPTAINS.red;
          const capMember = hub?.members.find(
            (m) => m.fullName?.toLowerCase().includes(selectedCaptain.toLowerCase())
          );
          return (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedCaptain(null)}
            >
              <div
                className="relative bg-[#0A0A0A] border-2 rounded-lg p-8 max-w-sm w-full"
                style={{ borderColor: tc.hex, boxShadow: `0 0 40px ${tc.glow}` }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" style={{ background: tc.hex }} />

                {/* Close */}
                <button
                  onClick={() => setSelectedCaptain(null)}
                  className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
                >
                  ✕
                </button>

                {/* Photo */}
                <div className="flex justify-center mb-6 mt-2">
                  <div
                    className="w-32 h-32 rounded-full overflow-hidden border-2 flex items-center justify-center"
                    style={{ borderColor: tc.hex, boxShadow: `0 0 24px ${tc.glow}` }}
                  >
                    {capMember?.photoUrl ? (
                      <img src={capMember.photoUrl} alt={selectedCaptain} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-white/5 flex items-center justify-center">
                        <span className="font-display text-4xl" style={{ color: tc.hex }}>C</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Name */}
                <div className="text-center mb-1">
                  <div className="font-display text-3xl tracking-widest" style={{ color: tc.hex, textShadow: `0 0 20px ${tc.glow}` }}>
                    {selectedCaptain.toUpperCase()}
                  </div>
                </div>

                {/* CO-CAPTAIN badge */}
                <div className="flex justify-center mb-3">
                  <span className="font-mono text-[10px] tracking-[0.3em] px-3 py-1 border" style={{ borderColor: tc.hex, color: tc.hex }}>
                    CO-CAPTAIN · {capData.squadName}
                  </span>
                </div>

                {/* IG handle if found */}
                {capMember?.instagramHandle && (
                   <div className="text-center mb-4">
                     <a
                       href={`https://instagram.com/${capMember.instagramHandle.replace(/^@/, '')}`}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="font-mono text-white/50 text-sm hover:text-white/80 transition-colors underline underline-offset-2"
                     >@{capMember.instagramHandle}</a>
                   </div>
                 )}

                {/* Tagline if found */}
                {capMember?.profileTagline && (
                  <div className="text-center mb-4 border-t border-white/10 pt-4">
                    <p className="font-mono text-white/40 text-xs italic">"{capMember.profileTagline}"</p>
                  </div>
                )}

                {/* Close */}
                <button
                  onClick={() => setSelectedCaptain(null)}
                  className="w-full mt-6 font-mono text-xs tracking-widest py-2 border transition-colors hover:opacity-80"
                  style={{ borderColor: tc.hex, color: tc.hex }}
                >
                  CLOSE
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="flex-1 h-[1px] bg-white/10" />
      <span className="font-mono text-white/30 text-[10px] tracking-[0.3em]">{label}</span>
      <div className="flex-1 h-[1px] bg-white/10" />
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
