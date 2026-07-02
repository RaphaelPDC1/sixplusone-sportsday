import { useState, useRef, useCallback, useEffect } from "react";
import { MapView } from "@/components/Map";
import { useSEO } from "@/hooks/useSEO";
import { useHapticSound } from "@/hooks/useHapticSound";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { NowHappening } from "@/components/ui/now-happening";
import { BackNav } from "@/components/ui/back-nav";
import { EntrySplash } from "@/components/ui/entry-splash";
import { HeroWave } from "@/components/ui/hero-wave";
import { TeamLiveFeatures } from "@/components/ui/team-live-features";
import { resetRevealJourneyForReplay } from "@/lib/revealJourney";
import { TeamFairnessBot } from "@/components/TeamFairnessBot";

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

// Unique emoji per event name (maps sd_events.name → emoji)
const EVENT_EMOJI: Record<string, string> = {
  "100M SPRINT":          "💨",
  "4×100 RELAY":          "🏃",
  "4x100 RELAY":          "🏃",
  "TUG OF WAR":           "💪",
  "OBSTACLE COURSE":      "🧱",
  "LONG JUMP":            "🦘",
  "PENALTY SHOOTOUT":     "⚽",
  "MYSTERY TIEBREAKER":   "❓",
  "SPRINT":               "💨",
  "RELAY":                "🏃",
  "TUG OF WAR (FINALE)":  "🏆",
  "JAVELIN":              "🎯",
  "HIGH JUMP":            "🏋️",
  "SHOT PUT":             "🪨",
  "EGG AND SPOON":        "🥚",
  "SACK RACE":            "🎒",
  "THREE-LEGGED RACE":    "🦵",
};
function getEventEmoji(name: string, arena?: string): string {
  const upper = name.toUpperCase();
  if (EVENT_EMOJI[upper]) return EVENT_EMOJI[upper];
  // Partial match fallback
  for (const [key, emoji] of Object.entries(EVENT_EMOJI)) {
    if (upper.includes(key) || key.includes(upper)) return emoji;
  }
  // Arena fallback
  if (arena === "Arena A") return "🏟️";
  if (arena === "Arena B") return "⚡";
  return "🏃";
}

const EVENTS = [
  { id: "sprint",        name: "100M SPRINT",          icon: "💨", desc: "Pure speed. No excuses." },
  { id: "relay",         name: "4×100 RELAY",           icon: "🏃", desc: "Team timing is everything." },
  { id: "tug_of_war",   name: "TUG OF WAR",            icon: "💪", desc: "Strength meets strategy." },
  { id: "obstacle",     name: "OBSTACLE COURSE",       icon: "🧱", desc: "Chaos, controlled." },
  { id: "long_jump",    name: "LONG JUMP",              icon: "🦘", desc: "Commit or go home." },
  { id: "penalty_shoot",name: "PENALTY SHOOTOUT",      icon: "⚽", desc: "Nerves of steel required." },
  { id: "tiebreaker",   name: "MYSTERY TIEBREAKER",    icon: "❓", desc: "Nobody knows. Yet." },
];

const POWER_UPS = [
  { id: "boost",       name: "BOOST",        short: "Add +3 points to your next event score.",    desc: "Add +3 points to your next event score. No target needed — captain initiates and team votes YES to confirm.",    icon: "⚡", captainOnly: true, needsTarget: false },
  { id: "sabotage",    name: "SABOTAGE",     short: "Deduct 5 points from a rival team.",     desc: "Choose a rival team. If your team votes YES and the Power Up activates, that team loses 5 points.",     icon: "💣", captainOnly: true, needsTarget: true },
  { id: "block",       name: "BLOCK",        short: "Cancel a power up that another team just played.",     desc: "Cancel a power up that another team just played.",     icon: "🛡️", captainOnly: true, needsTarget: true },
  { id: "double_down", name: "DOUBLE DOWN",  short: "Double your points for the next event.",              desc: "Double your points for the next event.",              icon: "×2", captainOnly: true, needsTarget: false },
  { id: "all_in",      name: "ALL IN",       short: "Stake everything on one event: win = double points, lose = zero.", desc: "Stake everything on one event: win = double points, lose = zero.", icon: "🎲", captainOnly: true, needsTarget: false },
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
  useSEO({
    title: "Team Hub — 6+1 Sports Day 002 Squad Dashboard",
    description: "View your team, squad members, event line-up, leaderboard and awards for 6+1 Sports Day 002 on 11 July 2026 in Sheffield.",
    keywords: "sports day team hub, squad dashboard, team events, leaderboard, 6+1 sports day 002",
  });

  const [, navigate] = useLocation();
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem("teamhub_splash_seen") !== "true"
  );
  const userId = typeof window !== "undefined" ? localStorage.getItem("sd_user_id") ?? "" : "";
  const [activeTab, setActiveTab] = useState<"team" | "events" | "leaderboard" | "power-ups" | "awards" | "sponsors" | "location">("team");
  const [votingFor, setVotingFor] = useState<AwardCategory | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [selectedCaptain, setSelectedCaptain] = useState<string | null>(null);
  const [squadExpanded, setSquadExpanded] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hs = useHapticSound();

  const { data: hub, isLoading, error: hubError, refetch } = trpc.sportsday.getTeamHub.useQuery(
    { registrationId: userId },
    { enabled: !!userId, retry: false }
  );

  // Captains of all teams (Red/Blue/Pink/Orange) can see the roster
  const isCaptainUser = !!hub?.isCaptain;
  const { data: rosterData } = trpc.sportsday.getTeamRoster.useQuery(
    { registrationId: userId },
    { enabled: !!userId && isCaptainUser, retry: false, throwOnError: false }
  );

  const { data: awardData, refetch: refetchAwards } = trpc.sportsday.getAwardVotes.useQuery(
    { registrationId: userId },
    { enabled: !!userId }
  );

  // Day-of voting gate
  const { data: votingGate } = trpc.sportsday.getVotingEnabled.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const votingEnabled = votingGate?.enabled ?? false;

  // Voting opens at 10am BST on 11 July 2026 (09:00 UTC)
  const VOTING_OPEN_TIME = new Date("2026-07-11T09:00:00Z");
  const [votingCountdown, setVotingCountdown] = useState(() => Math.max(0, VOTING_OPEN_TIME.getTime() - Date.now()));
  const votingTimeReached = votingCountdown <= 0;
  useEffect(() => {
    if (votingTimeReached) return;
    const id = setInterval(() => {
      setVotingCountdown(Math.max(0, VOTING_OPEN_TIME.getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, [votingTimeReached]);
  // canVote = time has passed AND admin has enabled voting
  const canVote = votingTimeReached && votingEnabled;
  const votingDaysLeft = Math.floor(votingCountdown / 86400000);
  const votingHoursLeft = Math.floor((votingCountdown % 86400000) / 3600000);
  const votingMinsLeft = Math.floor((votingCountdown % 3600000) / 60000);
  const votingSecsLeft = Math.floor((votingCountdown % 60000) / 1000);
  const votingCountdownStr = votingDaysLeft > 0
    ? `${votingDaysLeft}D ${String(votingHoursLeft).padStart(2,'0')}H ${String(votingMinsLeft).padStart(2,'0')}M`
    : `${String(votingHoursLeft).padStart(2,'0')}:${String(votingMinsLeft).padStart(2,'0')}:${String(votingSecsLeft).padStart(2,'0')}`;

  // Power Up initiation state
  const [powerUpInitiating, setWildcardInitiating] = useState<string | null>(null);
  const [powerUpTarget, setWildcardTarget] = useState<string | null>(null);

  const initiatePowerUpMutation = trpc.sportsday.initiatePowerUp.useMutation({
    onSuccess: () => {
      toast.success("Power Up initiated! Your team is now voting.");
      setWildcardInitiating(null);
      setWildcardTarget(null);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Live scoring data from the new scoring system ──────────────────────────
  const { data: liveLeaderboard } = trpc.scoring.getLiveLeaderboard.useQuery(undefined, {
    refetchInterval: 15_000, // refresh every 15s on sports day
  });
  const { data: sdEventsData } = trpc.scoring.getEvents.useQuery();
  const { data: publicEventResults } = trpc.scoring.getPublicEventResults.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  const castVoteMutation = trpc.sportsday.castAwardVote.useMutation({
    onSuccess: () => {
      toast.success("Vote cast!");
      refetchAwards();
      setVotingFor(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const powerUpMutation = trpc.sportsday.castPowerUpVote.useMutation({
    onSuccess: () => {
      toast.success("Power Up vote locked in!");
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

  // Leaderboard: use live scoring data (falls back to legacy hub.leaderboard if scoring not yet active)
  const teamPoints: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
  if (liveLeaderboard && liveLeaderboard.length > 0) {
    // Use real scoring system data
    liveLeaderboard.forEach((entry) => {
      teamPoints[entry.team] = entry.points;
    });
  } else {
    // Fallback: legacy leaderboard from hub (empty — scoring system not yet active)
    (hub.leaderboard as any[]).forEach((entry: any) => {
      if (!entry.dnf && entry.points) {
        teamPoints[entry.team] = (teamPoints[entry.team] ?? 0) + entry.points;
      }
    });
  }
  const sortedTeams = Object.entries(teamPoints).sort((a, b) => b[1] - a[1]);

  // Events: use live sd_events data (falls back to hardcoded EVENTS)
  const liveEvents = sdEventsData && sdEventsData.length > 0
    ? sdEventsData.map((e) => ({
        id: String(e.id),
        name: e.name,
        icon: getEventEmoji(e.name, e.arena ?? undefined),
        desc: e.arena ? `${e.arena} · ${e.startTime ?? "TBC"}` : (e.startTime ?? "TBC"),
        arena: e.arena,
        startTime: e.startTime,
        endTime: e.endTime,
        status: e.status,
        pointsMultiplier: e.pointsMultiplier,
        wildcardsEnabled: e.wildcardsEnabled,
      }))
    : EVENTS.map((e) => ({ ...e, arena: undefined, startTime: undefined, endTime: undefined, status: "upcoming" as const, pointsMultiplier: 1, wildcardsEnabled: false }));

  const TABS = [
    { id: "team" as const,           label: "TEAM",           icon: "👥" },
    { id: "events" as const,         label: "EVENTS",         icon: "🏃" },
    { id: "leaderboard" as const,    label: "LEADERBOARD",    icon: "📊" },
    { id: "power-ups" as const,      label: "POWER UPS",      icon: "⚡" },
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
              {/* Player first name in team colour */}
              <div
                className="font-display text-4xl tracking-widest leading-none"
                style={{ color: tc.hex, textShadow: `0 0 30px ${tc.glow}` }}
              >
                {myMember?.fullName?.split(" ")[0]?.toUpperCase() ?? (hub.team ?? "red").toUpperCase()}
              </div>
              {/* Team name as subtitle */}
              <div className="font-mono text-white/40 text-xs tracking-[0.25em] mt-1">
                TEAM {(hub.team ?? "red").toUpperCase()}
              </div>
              {myMember?.profileTagline && (
                <div className="mt-1 overflow-hidden w-full" style={{ maxWidth: '100%' }}>
                  <div
                    className="font-mono text-white/30 text-[10px] tracking-wider italic whitespace-nowrap"
                    style={{
                      display: 'inline-block',
                      animation: 'marqueeScroll 18s linear infinite',
                    }}
                  >
                    “{myMember.profileTagline}” &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; “{myMember.profileTagline}”
                  </div>
                </div>
              )}
              <p className="font-mono text-white/20 text-[10px] mt-1">
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
        <div className="flex border-t border-white/10 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-3 font-mono text-[10px] tracking-widest transition-all ${
                activeTab === tab.id
                  ? "text-[#F2F0EB]"
                  : "text-white/30 hover:text-white/50"
              }`}
              style={{
                minWidth: '60px',
                paddingLeft: '10px',
                paddingRight: '10px',
                ...(activeTab === tab.id ? { borderBottom: `2px solid ${tc.hex}` } : {})
              }}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="text-center leading-tight">{tab.label}</span>
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

                    <div className="flex items-center justify-between mb-5 gap-2">
                      <span className="font-mono text-xs tracking-[0.3em] flex-shrink-0" style={{ color: tc.hex }}>
                        TEAM CAPTAINS
                      </span>
                      <span className="font-display text-sm tracking-widest text-white/40 truncate text-right">
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
            
            {/* ─── LIVE EVENT STRIP ─── */}
            {(() => {
              const liveEvt = liveEvents?.find((e) => e.status === "live");
              const upNextEvt = liveEvents?.find((e) => e.status === "armed" || e.status === "upcoming");
              if (!liveEvt && !upNextEvt) return null;
              return (
                <div
                  className="p-4 border mb-2"
                  style={{
                    borderColor: liveEvt ? tc.hex : "rgba(255,255,255,0.15)",
                    background: liveEvt ? `${tc.hex}10` : "rgba(255,255,255,0.02)",
                  }}
                >
                  {liveEvt && (
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: tc.hex }}
                      />
                      <span className="font-mono text-[10px] tracking-[0.3em]" style={{ color: tc.hex }}>NOW HAPPENING</span>
                    </div>
                  )}
                  {liveEvt && (
                    <div className="font-display text-xl tracking-widest truncate" style={{ color: tc.hex }}>
                      {getEventEmoji(liveEvt.name)} {liveEvt.name.toUpperCase()}
                    </div>
                  )}
                  {liveEvt?.arena && (
                    <div className="font-mono text-xs text-white/40 mt-1">{liveEvt.arena}</div>
                  )}
                  {upNextEvt && (
                    <div className={`${liveEvt ? "mt-3 pt-3 border-t border-white/10" : ""}`}>
                      <div className="font-mono text-[9px] tracking-[0.25em] text-white/30 mb-1">UP NEXT</div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{getEventEmoji(upNextEvt.name)}</span>
                        <span className="font-display text-base tracking-widest text-white/80">{upNextEvt.name.toUpperCase()}</span>
                        {upNextEvt.startTime && (
                          <span
                            className="ml-auto font-mono text-xs px-2 py-0.5 flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                          >
                            {upNextEvt.startTime}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {(() => {
              // Captains use rosterData (all members incl. locked); regular members use hub.members (unlocked only)
              const displayMembers = rosterData
                ? rosterData.members.map((m) => ({ ...m, isLocked: m.isLocked }))
                : hub.members.map((m) => ({ ...m, isLocked: false }));
              const totalCount = rosterData ? rosterData.totalMembers : hub.members.length;
              const unlockedCount = rosterData ? rosterData.unlockedCount : hub.members.length;

              if (displayMembers.length === 0) return (
                <p className="font-mono text-white/30 text-sm text-center py-8">
                  First one in. Your teammates are on their way.
                </p>
              );

              return (
                <>
                  {/* Collapsible squad header */}
                  <button
                    onClick={() => setSquadExpanded((v) => !v)}
                    className="w-full flex items-center justify-between py-3 px-4 border border-white/10 bg-white/[0.02] transition-all hover:border-white/20 mt-2"
                  >
                    <span className="font-mono text-xs tracking-[0.25em] text-white/50">
                      {rosterData ? `${unlockedCount}/${totalCount} UNLOCKED` : `${totalCount} TEAMMATES`}
                    </span>
                    <span className="font-mono text-xs tracking-widest" style={{ color: tc.hex }}>
                      {squadExpanded ? "COLLAPSE ▲" : "VIEW SQUAD ▼"}
                    </span>
                  </button>

                  {squadExpanded && (
                    <div className="space-y-3 mt-2">
                      {displayMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-4 p-4 border border-white/10 bg-white/[0.02] transition-all"
                          style={{
                            opacity: member.isLocked ? 0.35 : 1,
                            cursor: member.isLocked ? "default" : "pointer",
                            ...(member.id === userId
                              ? { borderColor: `${tc.hex}50`, background: `${tc.hex}08` }
                              : member.isLocked
                              ? { borderColor: "rgba(255,255,255,0.04)", background: "rgba(255,255,255,0.01)" }
                              : {}),
                          }}
                          onClick={() => !member.isLocked && setSelectedMember(member)}
                        >
                          <div
                            className="w-12 h-12 rounded-full overflow-hidden border flex-shrink-0 flex items-center justify-center"
                            style={{ borderColor: member.isLocked ? "rgba(255,255,255,0.08)" : member.id === userId ? tc.hex : "rgba(255,255,255,0.15)" }}
                          >
                            {member.photoUrl ? (
                              <img src={member.photoUrl} alt={member.fullName ?? ""} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <span className="text-xl">
                                  {member.isLocked ? "🔒"
                                    : member.teammateType === "motivator" ? "📣"
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
                              <span className="font-display text-lg tracking-widest truncate" style={{ color: member.isLocked ? "rgba(255,255,255,0.3)" : "white" }}>
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
                              {member.isLocked && (
                                <span className="font-mono text-[9px] tracking-widest text-white/25">NOT UNLOCKED</span>
                              )}
                            </div>
                            {!member.isLocked && member.instagramHandle && (
                              <a
                                href={`https://instagram.com/${member.instagramHandle.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-white/30 text-xs hover:text-white/60 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >@{member.instagramHandle}</a>
                            )}
                            {!member.isLocked && member.profileTagline && (
                              <p className="font-mono text-white/40 text-xs mt-0.5 truncate italic">
                                "{member.profileTagline}"
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-mono text-white/20 text-[10px] tracking-wider">
                              {member.isLocked ? "" : (member.strongestEvent?.toUpperCase() ?? "—")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
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
          // Build AI insights from member data — always-on, scales from 1 member upward
          const members = hub.members;
          const teammateTypes: string[] = members.map((m) => m.teammateType).filter((x) => x != null) as string[];
          const strongestEvents: string[] = members.map((m) => m.strongestEvent).filter((x) => x != null) as string[];
          const countOf = (arr: string[], val: string) => arr.filter((x) => x === val).length;
          const totalResponses = strongestEvents.length;

          // Helper: pick the right language tier based on count
          const tier = (n: number) => {
            if (n === 0) return null;
            if (n === 1) return "1 member";
            if (n === 2) return "2 members";
            if (n <= 4) return `${n} members`;
            return `${n} members`;
          };

          // Helper: confidence prefix based on count vs squad size
          const confidence = (n: number) => {
            if (n === 1) return "Early signal";
            if (n === 2) return "Growing edge";
            if (n <= 4) return "Strong advantage";
            return "Dominant strength";
          };

          // Backend enums: strongestEvent = speed | strength | endurance | coordination | vibes
          //                 teammateType  = motivator | strategist | wildcard | silent_assassin | energy_bringer
          const speedCount      = countOf(strongestEvents, "speed");
          const strengthCount   = countOf(strongestEvents, "strength");
          const coordCount      = countOf(strongestEvents, "coordination");
          const enduranceCount  = countOf(strongestEvents, "endurance");
          const vibesCount      = countOf(strongestEvents, "vibes");
          const motivatorCount  = countOf(teammateTypes, "motivator");
          const strategistCount = countOf(teammateTypes, "strategist");
          const wildcardCount   = countOf(teammateTypes, "wildcard");
          const silentCount     = countOf(teammateTypes, "silent_assassin");
          const energyCount     = countOf(teammateTypes, "energy_bringer");

          // Map event ID → best-fit member IDs for that event
          const eventBestFit: Record<string, { member: typeof members[0]; reason: string }[]> = {};

          // For each event, find members whose questionnaire answers make them a good fit
          const addFit = (eventId: string, member: typeof members[0], reason: string) => {
            if (!eventBestFit[eventId]) eventBestFit[eventId] = [];
            // Avoid duplicates
            if (!eventBestFit[eventId].some((f) => f.member.id === member.id)) {
              eventBestFit[eventId].push({ member, reason });
            }
          };

          members.forEach((m) => {
            const se = m.strongestEvent;
            const tt = m.teammateType;
            // Sprint: speed or motivator
            if (se === "speed")      addFit("sprint", m, "Speed specialist");
            if (tt === "motivator")  addFit("sprint", m, "Crowd energy carrier");
            // Relay: speed or motivator
            if (se === "speed")      addFit("relay", m, "Speed specialist");
            if (tt === "motivator")  addFit("relay", m, "Momentum driver");
            // Tug of War: strength or strategist
            if (se === "strength")   addFit("tug_of_war", m, "Strength specialist");
            if (tt === "strategist") addFit("tug_of_war", m, "Tactical anchor");
            // Obstacle Course: coordination or wildcard
            if (se === "coordination") addFit("obstacle", m, "Coordination specialist");
            if (tt === "wildcard")     addFit("obstacle", m, "Chaos navigator");
            // Long Jump: endurance or silent assassin
            if (se === "endurance")       addFit("long_jump", m, "Endurance specialist");
            if (tt === "silent_assassin") addFit("long_jump", m, "Clutch performer");
            // Penalty Shootout: energy bringer or vibes
            if (tt === "energy_bringer") addFit("penalty_shoot", m, "Energy bringer");
            if (se === "vibes")          addFit("penalty_shoot", m, "Vibes specialist");
            // Mystery Tiebreaker: wildcards always, then everyone else
            if (tt === "wildcard")    addFit("tiebreaker", m, "Born for the unexpected");
          });
          // Tiebreaker fallback: if no wildcards, include all members
          if (!eventBestFit["tiebreaker"] || eventBestFit["tiebreaker"].length === 0) {
            members.forEach((m) => addFit("tiebreaker", m, "Ready for anything"));
          }

          // Map event ID → AI insight — always generated, never empty
          const eventInsights: Record<string, string> = {};

          // SPRINT — speed is the primary signal, motivators add crowd energy
          if (speedCount > 0) {
            eventInsights["sprint"] = `${confidence(speedCount)}: ${tier(speedCount)} rated speed as their strongest attribute. ${speedCount === 1 ? "That's your anchor — put them in the blocks." : "Line them up and let them fly — this is your event to own."}`;
          } else if (motivatorCount > 0) {
            eventInsights["sprint"] = `${tier(motivatorCount)} ${motivatorCount === 1 ? "is a natural motivator" : "are natural motivators"} — use that energy to push your sprinters past their limits.`;
          } else {
            eventInsights["sprint"] = `No speed specialists identified yet — but any team can win the sprint with the right mindset. Pick your fastest and back them fully.`;
          }

          // RELAY — speed + motivators are the key signals
          const relaySignal = speedCount + motivatorCount;
          if (speedCount > 0 && motivatorCount > 0) {
            eventInsights["relay"] = `${tier(speedCount)} speed-focused + ${tier(motivatorCount)} motivator${motivatorCount === 1 ? "" : "s"} — relay is where your team chemistry becomes a weapon. Nail the handoffs.`;
          } else if (speedCount > 0) {
            eventInsights["relay"] = `${confidence(speedCount)}: ${tier(speedCount)} built for speed. Relay rewards your fastest legs — coordinate the order and trust the baton.`;
          } else if (motivatorCount > 0) {
            eventInsights["relay"] = `${tier(motivatorCount)} motivator${motivatorCount === 1 ? "" : "s"} on your squad — relay is a team moment. Use that crowd energy to carry each other through.`;
          } else {
            eventInsights["relay"] = `Relay is about trust and timing above all else. No data yet, but the team that communicates best wins this one.`;
          }

          // TUG OF WAR — strength + strategists
          if (strengthCount > 0 && strategistCount > 0) {
            eventInsights["tug_of_war"] = `${tier(strengthCount)} strength-focused + ${tier(strategistCount)} strategist${strategistCount === 1 ? "" : "s"} — Tug of War is yours to dominate. Raw power meets smart anchoring.`;
          } else if (strengthCount > 0) {
            eventInsights["tug_of_war"] = `${confidence(strengthCount)}: ${tier(strengthCount)} rated strength as their top attribute. ${strengthCount === 1 ? "Build your line around them — they're your anchor." : "Stack them at the back and dig in — this is your event."}`;
          } else if (strategistCount > 0) {
            eventInsights["tug_of_war"] = `${tier(strategistCount)} strategist${strategistCount === 1 ? "" : "s"} on your team — Tug of War is won by coordination and timing, not just brute force. Outsmart them.`;
          } else {
            eventInsights["tug_of_war"] = `No strength specialists flagged yet — but positioning and timing win this. Get low, stay tight, and hold the line together.`;
          }

          // OBSTACLE COURSE — coordination + wildcards
          if (coordCount > 0 && wildcardCount > 0) {
            eventInsights["obstacle"] = `${tier(coordCount)} coordination-focused + ${tier(wildcardCount)} wildcard${wildcardCount === 1 ? "" : "s"} — Obstacle Course was made for this mix. Precision meets chaos.`;
          } else if (coordCount > 0) {
            eventInsights["obstacle"] = `${confidence(coordCount)}: ${tier(coordCount)} rated coordination as their strength. ${coordCount === 1 ? "Lead with them on the technical sections." : "The Obstacle Course rewards exactly this — precision and timing."}`;
          } else if (wildcardCount > 0) {
            eventInsights["obstacle"] = `${tier(wildcardCount)} wildcard${wildcardCount === 1 ? "" : "s"} in your squad — unpredictable players thrive in chaos. This course is built for them.`;
          } else {
            eventInsights["obstacle"] = `Obstacle Course rewards adaptability over raw fitness. No specialists flagged yet — but a team that communicates through the chaos will always have the edge.`;
          }

          // LONG JUMP — endurance + silent assassins (consistent performers)
          if (enduranceCount > 0) {
            eventInsights["long_jump"] = `${confidence(enduranceCount)}: ${tier(enduranceCount)} built for endurance. Long Jump rewards explosive consistency — ${enduranceCount === 1 ? "they're your best bet here." : "rotate your strongest athletes and keep the pressure on."}`;
          } else if (silentCount > 0) {
            eventInsights["long_jump"] = `${tier(silentCount)} silent assassin${silentCount === 1 ? "" : "s"} on your team — they perform when it matters most. Long Jump is a quiet event. Let them do their thing.`;
          } else {
            eventInsights["long_jump"] = `Long Jump is about commitment — no hesitation at the line. No specialists flagged yet, but the athlete who backs themselves fully will go furthest.`;
          }

          // PENALTY SHOOTOUT — energy bringers + vibes
          if (energyCount > 0 && vibesCount > 0) {
            eventInsights["penalty_shoot"] = `${tier(energyCount)} energy bringer${energyCount === 1 ? "" : "s"} + ${tier(vibesCount)} vibes-focused — Penalty Shootout is a crowd moment. Your team's energy is a genuine advantage here.`;
          } else if (energyCount > 0) {
            eventInsights["penalty_shoot"] = `${confidence(energyCount)}: ${tier(energyCount)} energy bringer${energyCount === 1 ? "" : "s"} on your squad. Penalty shootout is 90% nerves — your team's atmosphere will carry the shooter.`;
          } else if (vibesCount > 0) {
            eventInsights["penalty_shoot"] = `${tier(vibesCount)} member${vibesCount === 1 ? "" : "s"} fuelled by vibes — Penalty Shootout rewards belief. Keep the energy high and back your shooter.`;
          } else {
            eventInsights["penalty_shoot"] = `Penalty Shootout is pure pressure. No specific signals yet — but the team that stays loud and backs their shooter will have the psychological edge.`;
          }

          // MYSTERY TIEBREAKER — always a wildcard message
          if (wildcardCount > 0) {
            eventInsights["tiebreaker"] = `${tier(wildcardCount)} wildcard${wildcardCount === 1 ? "" : "s"} on your team — whatever the mystery event is, they were born for the unexpected. Stay ready.`;
          } else if (totalResponses > 0) {
            eventInsights["tiebreaker"] = `Nobody knows what this is yet — but your squad has answered the call. Stay loose, stay ready, and trust the team.`;
          } else {
            eventInsights["tiebreaker"] = `The mystery tiebreaker is unknown — but every great team thrives in the unexpected. Whatever it is, bring the energy.`;
          }

          // All events always have an insight — topRecs shows all of them
          const topRecs = liveEvents;

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
              <p className="font-mono text-white/35 text-[10px] leading-relaxed">
                Based on your squad's questionnaire — tap any event below to see your team's AI-powered strategy and best-fit players.
              </p>
            </div>

            <SectionHeader label="THE EVENTS" />
            <div className="space-y-3">
              {liveEvents.map((event) => {
                // Look up results from the new scoring system (by numeric event id) or legacy leaderboard
                const numericId = Number(event.id);
                const eventResults = publicEventResults
                  ? publicEventResults.filter((r) => r.eventId === numericId)
                  : (hub.leaderboard as any[]).filter((e: any) => e.eventName === event.id);
                // Normalise to a common shape for rendering
                const myTeamResultRaw = publicEventResults
                  ? publicEventResults.find((r) => r.eventId === numericId && r.team === hub.team)
                  : (hub.leaderboard as any[]).find((e: any) => e.eventName === event.id && e.team === hub.team);
                const myTeamResult = myTeamResultRaw
                  ? {
                      dnf: (myTeamResultRaw as any).dnf ?? false,
                      position: (myTeamResultRaw as any).placement ?? (myTeamResultRaw as any).position ?? null,
                      points: (myTeamResultRaw as any).finalPoints ?? (myTeamResultRaw as any).points ?? 0,
                    }
                  : null;
                // Normalise eventResults for the mini leaderboard
                const normalizedEventResults = eventResults.map((r: any) => ({
                  team: r.team as "red" | "blue" | "pink" | "orange",
                  dnf: r.dnf ?? false,
                  position: r.placement ?? r.position ?? null,
                  points: r.finalPoints ?? r.points ?? 0,
                }));
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
                        {/* Arena + time + wildcard availability */}
                        <div className="flex flex-wrap gap-3 mt-3 mb-2">
                          {event.arena && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full" style={{ background: tc.hex }} />
                              <span className="font-mono text-white/40 text-[10px] tracking-wider">{event.arena}</span>
                            </div>
                          )}
                          {event.startTime && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-1 h-1 rounded-full" style={{ background: tc.hex }} />
                              <span className="font-mono text-white/40 text-[10px] tracking-wider">
                                {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
                              </span>
                            </div>
                          )}
                          {(event as any).wildcardsEnabled && (
                            <div
                              className="flex items-center gap-1.5 px-2 py-0.5 border"
                              style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}10` }}
                            >
                              <span className="text-[10px]">⚡</span>
                              <span className="font-mono text-[9px] tracking-widest" style={{ color: tc.hex }}>POWER UPS ACTIVE</span>
                            </div>
                          )}
                          {!(event as any).wildcardsEnabled && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 border border-white/10">
                              <span className="text-[10px]">🔒</span>
                              <span className="font-mono text-[9px] tracking-widest text-white/25">NO POWER UPS</span>
                            </div>
                          )}
                        </div>
                        {aiInsight && (
                          <div className="mt-3 flex items-start gap-2">
                            <span className="text-sm mt-0.5">⚡</span>
                            <p className="font-mono text-xs leading-relaxed" style={{ color: tc.hex }}>
                              {aiInsight}
                            </p>
                          </div>
                        )}
                        {/* Mini leaderboard for this event */}
                        {normalizedEventResults.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-4 gap-2">
                            {(["red","blue","pink","orange"] as const).map((team) => {
                              const r = normalizedEventResults.find((e) => e.team === team);
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
                        {/* BEST FIT: squad members suited for this event */}
                        {(() => {
                          const fits = eventBestFit[event.id] ?? [];
                          if (fits.length === 0) return null;
                          return (
                            <div className="mt-3 pt-3 border-t" style={{ borderColor: `${tc.hex}15` }}>
                              <div className="font-mono text-[9px] tracking-[0.25em] text-white/30 mb-2">BEST FIT FOR THIS EVENT</div>
                              <div className="flex flex-wrap gap-2">
                                {fits.map(({ member, reason }) => (
                                  <div
                                    key={member.id}
                                    className="flex items-center gap-2 px-2 py-1.5 border"
                                    style={{ borderColor: `${tc.hex}30`, background: `${tc.hex}08` }}
                                  >
                                    {/* Avatar */}
                                    <div
                                      className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center border"
                                      style={{ borderColor: `${tc.hex}50` }}
                                    >
                                      {member.photoUrl ? (
                                        <img src={member.photoUrl} alt={member.fullName ?? ""} className="w-full h-full object-cover" />
                                      ) : (
                                        <span className="text-[10px]">
                                          {member.teammateType === "motivator" ? "📣"
                                            : member.teammateType === "strategist" ? "🧠"
                                            : member.teammateType === "wildcard" ? "🃏"
                                            : member.teammateType === "silent_assassin" ? "🎯"
                                            : "⚡"}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-display text-xs tracking-widest leading-none" style={{ color: member.id === userId ? tc.hex : "rgba(255,255,255,0.8)" }}>
                                        {member.fullName?.split(" ")[0]?.toUpperCase()}
                                        {member.id === userId && <span className="font-mono text-[8px] ml-1 opacity-60">YOU</span>}
                                      </div>
                                      <div className="font-mono text-[9px] text-white/30 mt-0.5">{reason}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
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
                    // Count events where this team has a locked result
                    const teamEventCount = publicEventResults
                      ? publicEventResults.filter((e) => e.team === team).length
                      : (hub.leaderboard as any[]).filter((e: any) => e.team === team && !e.dnf).length;
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
                    {liveEvents.map((event) => {
                      const numId = Number(event.id);
                      // Use new scoring system results if available
                      const evResults = publicEventResults
                        ? publicEventResults.filter((r) => r.eventId === numId)
                        : (hub.leaderboard as any[]).filter((e: any) => e.eventName === event.id);
                      if (evResults.length === 0) return null;
                      const normResults = evResults.map((r: any) => ({
                        team: r.team as "red" | "blue" | "pink" | "orange",
                        dnf: r.dnf ?? false,
                        position: r.placement ?? r.position ?? null,
                        points: r.finalPoints ?? r.points ?? 0,
                      }));
                      return (
                        <div key={event.id} className="border border-white/10 bg-white/[0.02] p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{event.icon}</span>
                            <div>
                              <div className="font-display text-base tracking-widest">{event.name}</div>
                              <div className="font-mono text-white/30 text-xs">{event.desc}</div>
                              {(event as any).pointsMultiplier > 1 && (
                                <div className="font-mono text-[10px] mt-0.5" style={{ color: tc.hex }}>
                                  ×{(event as any).pointsMultiplier} POINTS MULTIPLIER
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {(["red", "blue", "pink", "orange"] as const).map((team) => {
                              const r = normResults.find((e) => e.team === team);
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
                  <div className="font-mono text-xs text-white/40 tracking-wider mb-2">SCORING SYSTEM</div>
                  <div className="space-y-1 font-mono text-xs text-white/50">
                    <div>1st Place: 10 points</div>
                    <div>2nd Place: 7 points</div>
                    <div>3rd Place: 4 points</div>
                    <div>4th Place: 2 points</div>
                    <div className="text-white/30">Tug of War: ×2 multiplier</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

                {/* ─── WILDCARDS TAB ─── */}
        {activeTab === "power-ups" && (
          <div className="space-y-4">
            <SectionHeader label="POWER UPS" />
            {/* Day-of banner — visible but not blocking */}
            {!votingEnabled && (
              <div
                className="flex items-center gap-3 px-4 py-3 border"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
              >
                <span className="text-lg">⏳</span>
                <div className="font-mono text-[10px] tracking-wider text-white/35">VOTING OPENS ON THE DAY — PREVIEW ONLY</div>
              </div>
            )}
            {/* Captain initiation hint */}
            {votingEnabled && isCaptainUser && (
              <div className="font-mono text-[10px] tracking-[0.3em] px-1" style={{ color: tc.hex }}>
                TAP A CARD TO INITIATE AS CAPTAIN
              </div>
            )}
            {/* All 5 power up cards — always visible */}
            <div className="space-y-3">
              {POWER_UPS.map((wc) => {
                const votes = hub.wildcardCounts[wc.id] ?? 0;
                const hasVoted = hub.myWildcardVotes.includes(wc.id);
                const pct = Math.min(100, Math.round((votes / Math.max(1, hub.totalMembers)) * 100));
                const isInitiating = powerUpInitiating === wc.id;
                const isActive = votes > 0; // captain has played this card
                return (
                  <div
                    key={wc.id}
                    className="border"
                    style={{
                      borderColor: isActive ? tc.hex : hasVoted ? `${tc.hex}60` : "rgba(255,255,255,0.1)",
                      background: isActive ? `${tc.hex}10` : "rgba(255,255,255,0.02)",
                    }}
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-3 p-4">
                      <span className="text-2xl w-9 text-center flex-shrink-0">{wc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base tracking-widest">{wc.name}</div>
                        <div className="font-mono text-white/35 text-[9px] mt-0.5 leading-relaxed">{wc.short}</div>
                      </div>
                      <div className="text-right flex-shrink-0 pl-2">
                        <div className="font-display text-xl" style={{ color: isActive ? tc.hex : "rgba(255,255,255,0.2)" }}>{votes}</div>
                        <div className="font-mono text-white/20 text-[8px] tracking-wider">VOTES</div>
                      </div>
                    </div>
                    {/* Vote progress bar */}
                    <div className="h-0.5 bg-white/5 mx-4 mb-3 overflow-hidden">
                      <div
                        className="h-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: tc.hex }}
                      />
                    </div>
                    {/* Action area */}
                    <div className="px-4 pb-4">
                      {!votingEnabled ? (
                        <div className="text-center font-mono text-[9px] tracking-wider text-white/20 py-1">
                          VOTING OPENS ON THE DAY
                        </div>
                      ) : isCaptainUser ? (
                        /* Captain: initiate flow */
                        hasVoted ? (
                          <div className="text-center font-mono text-xs tracking-wider" style={{ color: tc.hex }}>✓ INITIATED</div>
                        ) : (
                          <>
                            {isInitiating && wc.needsTarget && (
                              <div className="mb-2 grid grid-cols-4 gap-1">
                                {(["red","blue","pink","orange"] as const).filter(t => t !== hub.team).map(t => (
                                  <button
                                    key={t}
                                    onClick={() => setWildcardTarget(powerUpTarget === t ? null : t)}
                                    className="py-1.5 font-display text-[10px] tracking-widest border transition-all"
                                    style={{
                                      borderColor: powerUpTarget === t ? tc.hex : "rgba(255,255,255,0.15)",
                                      background: powerUpTarget === t ? `${tc.hex}20` : "transparent",
                                      color: powerUpTarget === t ? tc.hex : "rgba(255,255,255,0.4)",
                                    }}
                                  >
                                    {t.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            )}
                            <button
                              onClick={() => {
                                hs('powerup');
                                if (!isInitiating) { setWildcardInitiating(wc.id); return; }
                                if (wc.needsTarget && !powerUpTarget) return;
                                initiatePowerUpMutation.mutate({
                                  registrationId: userId,
                                  team: hub.team as "red"|"blue"|"pink"|"orange",
                                  wildcardId: wc.id as "boost"|"sabotage"|"block"|"double_down"|"all_in",
                                  targetTeam: powerUpTarget as "red"|"blue"|"pink"|"orange" | undefined,
                                });
                              }}
                              disabled={initiatePowerUpMutation.isPending || (isInitiating && wc.needsTarget && !powerUpTarget)}
                              className="w-full py-2.5 font-display text-sm tracking-widest transition-all active:scale-[0.99]"
                              style={{
                                background: isInitiating ? tc.hex : `${tc.hex}20`,
                                color: isInitiating ? "#0A0A0A" : tc.hex,
                                border: isInitiating ? "none" : `1px solid ${tc.hex}40`,
                                opacity: (isInitiating && wc.needsTarget && !powerUpTarget) ? 0.4 : 1,
                              }}
                            >
                              {initiatePowerUpMutation.isPending ? "INITIATING..." : isInitiating ? (wc.needsTarget ? (powerUpTarget ? `CONFIRM ${wc.name} →` : "SELECT TARGET FIRST") : `CONFIRM ${wc.name} →`) : `INITIATE →`}
                            </button>
                          </>
                        )
                      ) : (
                        /* Member: vote on active cards only */
                        isActive ? (
                          hasVoted ? (
                            <div className="text-center font-mono text-xs tracking-wider" style={{ color: tc.hex }}>✓ VOTED</div>
                          ) : (
                            <button
                              onClick={() => { hs('confirm'); powerUpMutation.mutate({
                                voterId: userId,
                                team: hub.team as "red"|"blue"|"pink"|"orange",
                                wildcardId: wc.id as "boost"|"sabotage"|"block"|"double_down"|"all_in",
                              }); }}
                              disabled={powerUpMutation.isPending}
                              className="w-full py-2.5 font-display text-sm tracking-widest transition-all active:scale-[0.99]"
                              style={{ background: `${tc.hex}20`, color: tc.hex, border: `1px solid ${tc.hex}40` }}
                            >
                              VOTE YES →
                            </button>
                          )
                        ) : (
                          <div className="text-center font-mono text-[9px] tracking-wider text-white/15 py-1">
                            CAPTAIN ACTIVATES
                          </div>
                        )
                      )}
                    </div>
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

            {/* Voting countdown banner — shown until voting opens */}
            {!canVote && (
              <div
                className="p-4 border text-center"
                style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
              >
                <div className="font-mono text-white/40 text-[10px] tracking-[0.3em] mb-1">VOTING OPENS IN</div>
                <div className="font-display text-3xl tracking-widest" style={{ color: tc.hex }}>
                  {votingCountdownStr}
                </div>
                <div className="font-mono text-white/25 text-[10px] tracking-wider mt-1">
                  10:00 AM · SAT 11 JULY 2026
                </div>
              </div>
            )}

            {canVote && (
              <p className="font-mono text-white/30 text-xs tracking-wider">
                One vote per category. Make it count.
              </p>
            )}

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
                    {!canVote ? (
                      <span className="font-mono text-white/20 text-[10px] tracking-widest">🔒 LOCKED</span>
                    ) : votedFor ? (
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
              ].map((sponsor, idx) => (
                <div
                  key={`sponsor-${idx}`}
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

            {/* Google Maps embed — Endcliffe Park, Sheffield */}
            <div
              className="relative overflow-hidden border"
              style={{ borderColor: `${tc.hex}40` }}
            >
              <a
                href="https://maps.google.com/?q=Endcliffe+Park+Sheffield+S11+7AB"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src="/api/static-map?center=53.3718,-1.5046&zoom=15&size=600x260&maptype=roadmap&markers=color:red%7C53.3718,-1.5046"
                  alt="Endcliffe Park, Sheffield — tap to open in Google Maps"
                  className="w-full h-[260px] object-cover block"
                  loading="lazy"
                />
              </a>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(to top, ${tc.hex}10, transparent 60%)` }}
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
                  hs('confirm');
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
            onClick={() => { hs('tap'); setSelectedMember(null); }}
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
      <TeamFairnessBot />
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
