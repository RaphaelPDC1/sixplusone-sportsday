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
import { PhotoFeed } from "@/components/PhotoFeed";
import { useTips, TIPS } from "@/hooks/useTips";
import { TipCard } from "@/components/TipCard";

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
  { id: "1",  name: "60M SPRINT (M)",      icon: "💨", desc: "Pure speed. No excuses." },
  { id: "2",  name: "60M SPRINT (W)",      icon: "💨", desc: "Pure speed. No excuses." },
  { id: "7",  name: "SACK RACE",           icon: "🥊", desc: "Rhythm and confidence win it." },
  { id: "4",  name: "WHEELBARROW RACE",    icon: "🤝", desc: "Chemistry and communication." },
  { id: "6",  name: "400M (W)",            icon: "🏃", desc: "Controlled aggression." },
  { id: "5",  name: "400M (M)",            icon: "🏃", desc: "Controlled aggression." },
  { id: "8",  name: "THREE LEGGED RACE",   icon: "👥", desc: "Sync or sink." },
  { id: "3",  name: "EGG AND SPOON",       icon: "🥚", desc: "Patience under pressure." },
  { id: "10", name: "CHAIN RACE",          icon: "🔗", desc: "Every member counts." },
  { id: "9",  name: "60M TEAM RELAY",      icon: "🏅", desc: "Trust and timing." },
  { id: "11", name: "TUG OF WAR",          icon: "💪", desc: "Strength meets strategy. Finale." },
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
  const [dnaExpanded, setDnaExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hs = useHapticSound();
  const { isSeen, dismiss, dismissAll, hasAnyVisible } = useTips();

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
  // Counter-block state: id of the incoming BLOCK session being countered
  const [counterBlockSessionId, setCounterBlockSessionId] = useState<number | null>(null);

  const initiatePowerUpMutation = trpc.sportsday.initiatePowerUp.useMutation({
    onSuccess: (data) => {
      if (data.activated) {
        toast.success("⚡ POWER UP ACTIVATED!");
      } else {
        toast.success("Power Up initiated! Your team is now voting.");
      }
      setWildcardInitiating(null);
      setWildcardTarget(null);
      setCounterBlockSessionId(null);
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
    onSuccess: (data) => {
      if (data.activated) {
        toast.success(`⚡ POWER UP ACTIVATED! (${data.totalYes}/${data.threshold} votes)`);
      } else {
        toast.success(`Vote locked in! (${data.totalYes}/${data.threshold} needed)`);
      }
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
          <p className="font-mono text-white/70 text-sm">
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
            className="block font-mono text-white/55 text-xs tracking-widest hover:text-white/75 transition-colors mx-auto"
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
          <p className="font-mono text-white/70 text-sm">We don't recognise this registration.</p>
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
              <p className="font-mono text-white/60 text-xs tracking-widest">LOADING...</p>
        </div>
      </div>
    );
  }

  if (!hub) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="font-mono text-white/70 text-sm">Team not unlocked yet. Unlock to get in.</p>
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
        eventType: e.eventType,
        format: e.format,
        matchupLabel: e.matchupLabel,
        setupBufferMinutes: e.setupBufferMinutes,
        blockNo: e.blockNo,
        sortOrder: e.sortOrder,
      }))
    : EVENTS.map((e) => ({ ...e, arena: undefined, startTime: undefined, endTime: undefined, status: "upcoming" as const, pointsMultiplier: 1, wildcardsEnabled: false, eventType: undefined as string | undefined, format: undefined as string | undefined, matchupLabel: undefined as string | undefined, setupBufferMinutes: 10, blockNo: undefined as number | undefined, sortOrder: 0 }));

    const TABS = [
    { id: "team" as const,           label: "TEAM",           icon: "👥" },
    { id: "events" as const,         label: "EVENTS",         icon: "🏃" },
    { id: "leaderboard" as const,    label: "LEADERBOARD",    icon: "📊" },
    { id: "power-ups" as const,      label: "POWER UPS",      icon: "⚡" },
    { id: "awards" as const,         label: "AWARDS",         icon: "🏆" },
    { id: "sponsors" as const,       label: "SPONSORS",       icon: "🤟" },
    { id: "location" as const,       label: "LOCATION",       icon: "📍" },
  ];

  const TYPE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
    male:    { label: "M",      color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
    female:  { label: "W",      color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
    mixed:   { label: "Mixed",  color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
    team:    { label: "Team",   color: "#fb923c", bg: "rgba(251,146,60,0.12)" },
    finale:  { label: "Finale", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  };
  const FORMAT_BADGE: Record<string, string> = {
    "all-teams":   "All Teams",
    "head-to-head": "Head to Head",
    bracket:       "Bracket",
    relay:         "Relay",
    pairs:         "Pairs",
  };
  const STATUS_PILL: Record<string, { label: string; color: string; bg: string; pulse?: boolean }> = {
    upcoming:  { label: "UPCOMING",  color: "rgba(255,255,255,0.35)", bg: "rgba(255,255,255,0.06)" },
    armed:     { label: "ARMED",     color: "#fbbf24",                bg: "rgba(251,191,36,0.12)",  pulse: true },
    briefing:  { label: "BRIEFING",  color: "#fb923c",                bg: "rgba(251,146,60,0.12)",  pulse: true },
    live:      { label: "● LIVE",    color: "#4ade80",                bg: "rgba(74,222,128,0.12)",  pulse: true },
    delayed:   { label: "DELAYED",   color: "#f87171",                bg: "rgba(248,113,113,0.12)" },
    complete:  { label: "DONE",      color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.04)" },
  };

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
                  <div className="w-full h-full flex items-center justify-center bg-white/10">
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
              <div className="font-mono text-white/70 text-xs tracking-[0.25em] mt-1">
                TEAM {(hub.team ?? "red").toUpperCase()}
              </div>
              {myMember?.profileTagline && (
                <div className="mt-1 overflow-hidden w-full" style={{ maxWidth: '100%' }}>
                  <div
                    className="font-mono text-white/60 text-[10px] tracking-wider italic whitespace-nowrap"
                    style={{
                      display: 'inline-block',
                      animation: 'marqueeScroll 18s linear infinite',
                    }}
                  >
                    “{myMember.profileTagline}” &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; “{myMember.profileTagline}”
                  </div>
                </div>
              )}
              <p className="font-mono text-white/75 text-[10px] mt-1">
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
                  <span className="font-mono text-white/60 text-xs">{i + 1}</span>
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
                  <span className="font-mono text-white/75 text-xs">{pts}pts</span>
                </div>
              ))}
            </div>
          )}
        </div>


        {/* Tab bar */}
        <div className="flex border-t border-white/25 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 py-3 font-mono text-[10px] tracking-widest transition-all ${
                activeTab === tab.id
                  ? "text-[#F2F0EB]"
                  : "text-white/60 hover:text-white/75"
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
            {/* ── Tips: team-hub-intro + team-shirt ── */}
            {!isSeen("team-hub-intro") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "team-hub-intro")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={hasAnyVisible}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            {!isSeen("team-shirt") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "team-shirt")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
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
                      <span className="font-display text-sm tracking-widest text-white/70 truncate text-right">
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
                            <div className="font-mono text-[10px] tracking-[0.25em] text-white/70 mt-2">
                              CO-CAPTAIN
                            </div>
                            <div className="font-mono text-[9px] tracking-widest text-white/75 mt-1">
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
              
              // Helper to get type badge for event
              const getTypeBadge = (eventName: string) => {
                const eventId = liveEvents?.find(e => e.name === eventName)?.id;
                if (!eventId) return null;
                const eventType = liveEvents?.find(e => e.id === eventId)?.eventType;
                if (!eventType) return null;
                return TYPE_BADGE[eventType] || null;
              };
              
              // Helper to get format badge
              const getFormatBadge = (eventName: string) => {
                const eventId = liveEvents?.find(e => e.name === eventName)?.id;
                if (!eventId) return null;
                const format = liveEvents?.find(e => e.id === eventId)?.format;
                if (!format) return null;
                return FORMAT_BADGE[format];
              };
              
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
                    <div className="font-mono text-xs text-white/70 mt-1">{liveEvt.arena}</div>
                  )}
                  {upNextEvt && (
                    <div className={`${liveEvt ? "mt-3 pt-3 border-t border-white/25" : ""}`}>
                      <div className="font-mono text-[9px] tracking-[0.25em] text-white/60 mb-1">UP NEXT</div>
                      {/* Badges row — type, format, status */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-2">
                        {getTypeBadge(upNextEvt.name) && (
                          <span
                            className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
                            style={{ color: getTypeBadge(upNextEvt.name)?.color, borderColor: `${getTypeBadge(upNextEvt.name)?.color}50`, background: getTypeBadge(upNextEvt.name)?.bg }}
                          >
                            {getTypeBadge(upNextEvt.name)?.label}
                          </span>
                        )}
                        {getFormatBadge(upNextEvt.name) && (
                          <span className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border border-white/30 text-white/70">
                            {getFormatBadge(upNextEvt.name)}
                          </span>
                        )}
                        {upNextEvt.status && (
                          <span
                            className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
                            style={{ color: STATUS_PILL[upNextEvt.status]?.color || "rgba(255,255,255,0.35)", borderColor: `${STATUS_PILL[upNextEvt.status]?.color || "rgba(255,255,255,0.35)"}40`, background: STATUS_PILL[upNextEvt.status]?.bg || "rgba(255,255,255,0.06)" }}
                          >
                            {STATUS_PILL[upNextEvt.status]?.label || "UPCOMING"}
                          </span>
                        )}
                      </div>
                      {/* Event name + time */}
                      <div className="flex items-center gap-2 mb-1">
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
                      {/* Matchup label */}
                      {upNextEvt.matchupLabel && (
                        <div className="font-mono text-[10px] text-white/60 tracking-wide mb-1">
                          {upNextEvt.matchupLabel}
                        </div>
                      )}
                      {/* Arena + setup buffer */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {upNextEvt.arena && (
                          <span className="font-mono text-white/70">📍 {upNextEvt.arena}</span>
                        )}
                        {upNextEvt.setupBufferMinutes && (
                          <span className="font-mono text-white/60 text-[9px]">— {upNextEvt.setupBufferMinutes} min setup —</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {(() => {
              // All users see the same team view
              const displayMembers = hub.members.map((m) => ({ ...m, isLocked: false }));
              const totalCount = hub.members.length;

              if (displayMembers.length === 0) return (
                <p className="font-mono text-white/60 text-sm text-center py-8">
                  First one in. Your teammates are on their way.
                </p>
              );

              return (
                <>
                  {/* Collapsible squad header */}
                  <button
                    onClick={() => setSquadExpanded((v) => !v)}
                    className="w-full flex items-center justify-between py-3 px-4 border border-white/25 bg-white/[0.02] transition-all hover:border-white/35 mt-2"
                  >
                    <span className="font-mono text-xs tracking-[0.25em] text-white/75">
                      {totalCount} TEAMMATES
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
                          className="flex items-center gap-4 p-4 border border-white/25 bg-white/[0.02] transition-all"
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
                              <div className="w-full h-full bg-white/10 flex items-center justify-center">
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
                                <span className="font-mono text-[9px] tracking-widest text-white/55">NOT UNLOCKED</span>
                              )}
                            </div>
                            {!member.isLocked && member.instagramHandle && (
                              <a
                                href={`https://instagram.com/${member.instagramHandle.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-white/60 text-xs hover:text-white/60 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >@{member.instagramHandle}</a>
                            )}
                            {!member.isLocked && member.profileTagline && (
                              <p className="font-mono text-white/70 text-xs mt-0.5 truncate italic">
                                "{member.profileTagline}"
                              </p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-mono text-white/75 text-[10px] tracking-wider">
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
                className="p-4 border border-dashed border-white/35 text-center cursor-pointer hover:border-white/40 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="font-mono text-white/70 text-xs tracking-wider">
                  📷 ADD YOUR PROFILE PHOTO
                </p>
                <p className="font-mono text-white/75 text-[10px] mt-1">
                  Shows up in the awards vote
                </p>
              </div>
            )}
          </div>
        )}

        {/* ─── EVENTS TAB ─── */}
        {activeTab === "events" && (() => {
          // ────────────────────────────────────────────────────────────────────────────────
          // AI TEAM INTEL — multi-signal analysis from questionnaire data
          // Signals: strongestEvent, teammateType, competitiveness, fear, attendedBefore
          // ────────────────────────────────────────────────────────────────────────────────
          const members = hub.members;
          const n = members.length;
          const countOf = (arr: (string | null | undefined)[], val: string) => arr.filter((x) => x === val).length;

          // ── Raw signal counts ────────────────────────────────────────────────────────────
          const ses = members.map((m) => m.strongestEvent);
          const tts = members.map((m) => m.teammateType);
          const comps = members.map((m) => m.competitiveness);
          const fears = members.map((m) => m.fear);

          const speedCount      = countOf(ses, "speed");
          const strengthCount   = countOf(ses, "strength");
          const coordCount      = countOf(ses, "coordination");
          const enduranceCount  = countOf(ses, "endurance");
          const vibesCount      = countOf(ses, "vibes");

          const motivatorCount  = countOf(tts, "motivator");
          const strategistCount = countOf(tts, "strategist");
          const wildcardCount   = countOf(tts, "wildcard");
          const silentCount     = countOf(tts, "silent_assassin");
          const energyCount     = countOf(tts, "energy_bringer");

          const winnerCount     = countOf(comps, "winner");
          const vibesOnlyCount  = countOf(comps, "vibes");
          const balancedCount   = countOf(comps, "balanced");

          const fearNothingCount = countOf(fears, "nothing");
          const fearSprintCount  = countOf(fears, "sprinting");
          const fearTeamCount    = countOf(fears, "team_events");
          const fearLettingDown  = countOf(fears, "letting_team_down");

          const veteranCount    = members.filter((m) => m.attendedBefore === true).length;
          const firstTimerCount = members.filter((m) => m.attendedBefore === false).length;
          const totalResponses  = members.filter((m) => m.strongestEvent != null).length;

          // ── Helper: natural-language count ────────────────────────────────────────────────
          const t = (num: number, singular = "member", plural = "members") =>
            num === 1 ? `1 ${singular}` : `${num} ${plural}`;

          // Confidence prefix based on count relative to squad size
          const conf = (num: number) => {
            if (num === 0) return "";
            const pct = n > 0 ? num / n : 0;
            if (pct >= 0.6) return "Dominant strength";
            if (pct >= 0.4) return "Strong advantage";
            if (num >= 2)   return "Growing edge";
            return "Early signal";
          };

          // ── Team DNA summary tags (shown in the overview panel) ────────────────────────────
          const dnaTags: { label: string; value: string; color: string }[] = [];
          if (winnerCount > 0) dnaTags.push({ label: "WINNERS", value: String(winnerCount), color: "#fbbf24" });
          if (strategistCount > 0) dnaTags.push({ label: "STRATEGISTS", value: String(strategistCount), color: "#60a5fa" });
          if (speedCount > 0) dnaTags.push({ label: "SPEED", value: String(speedCount), color: "#4ade80" });
          if (strengthCount > 0) dnaTags.push({ label: "STRENGTH", value: String(strengthCount), color: "#f87171" });
          if (coordCount > 0) dnaTags.push({ label: "COORDINATION", value: String(coordCount), color: "#c084fc" });
          if (enduranceCount > 0) dnaTags.push({ label: "ENDURANCE", value: String(enduranceCount), color: "#fb923c" });
          if (wildcardCount > 0) dnaTags.push({ label: "WILDCARDS", value: String(wildcardCount), color: "#f472b6" });
          if (silentCount > 0) dnaTags.push({ label: "SILENT ASSASSINS", value: String(silentCount), color: "#94a3b8" });
          if (veteranCount > 0) dnaTags.push({ label: "VETERANS", value: String(veteranCount), color: tc.hex });
          if (fearNothingCount > 0) dnaTags.push({ label: "FEARLESS", value: String(fearNothingCount), color: "#4ade80" });

          // ── Best-fit members per event (numeric DB IDs) ───────────────────────────────────
          // Event IDs in DB (running order):
          //   sortOrder 1=id1 60m Sprint M, 2=id2 60m Sprint W, 3=id7 Sack Race,
          //   4=id4 Wheelbarrow Race, 5=id6 400m W, 6=id5 400m M, 7=id8 Three Legged Race,
          //   8=id3 Egg and Spoon, 9=id10 Chain Race, 10=id9 60m Team Relay, 11=id11 Tug of War
          const eventBestFit: Record<string, { member: typeof members[0]; reason: string }[]> = {};

          const addFit = (eventId: string, member: typeof members[0], reason: string) => {
            if (!eventBestFit[eventId]) eventBestFit[eventId] = [];
            if (!eventBestFit[eventId].some((f) => f.member.id === member.id)) {
              eventBestFit[eventId].push({ member, reason });
            }
          };

          members.forEach((m) => {
            const se = m.strongestEvent;
            const tt = m.teammateType;
            const comp = m.competitiveness;
            const fear = m.fear;
            const vet = m.attendedBefore === true;

            // ── Event 1: 60m Sprint (M) — speed, winners, fearless, veterans
            if (se === "speed")        addFit("1", m, "Speed specialist");
            if (comp === "winner")     addFit("1", m, "Competitor");
            if (fear === "nothing")    addFit("1", m, "Fear-proof");
            if (vet)                   addFit("1", m, "Veteran");

            // ── Event 2: 60m Sprint (W) — same signals
            if (se === "speed")        addFit("2", m, "Speed specialist");
            if (comp === "winner")     addFit("2", m, "Competitor");
            if (fear === "nothing")    addFit("2", m, "Fear-proof");
            if (vet)                   addFit("2", m, "Veteran");

            // ── Event 3: Egg & Spoon — coordination, strategists, vibes, balanced
            if (se === "coordination") addFit("3", m, "Coordination specialist");
            if (tt === "strategist")   addFit("3", m, "Tactical mind");
            if (se === "vibes")        addFit("3", m, "Composed under pressure");
            if (comp === "balanced")   addFit("3", m, "Steady performer");

            // ── Event 4: Wheelbarrow — strength, coordination, pairs chemistry
            if (se === "strength")     addFit("4", m, "Strength specialist");
            if (se === "coordination") addFit("4", m, "Coordination specialist");
            if (tt === "motivator")    addFit("4", m, "Drives the pair");

            // ── Event 5: 400m (M) — endurance, speed, winners, veterans
            if (se === "endurance")    addFit("5", m, "Endurance specialist");
            if (se === "speed")        addFit("5", m, "Speed specialist");
            if (comp === "winner")     addFit("5", m, "Competitor");
            if (vet)                   addFit("5", m, "Veteran");

            // ── Event 6: 400m (W) — same signals
            if (se === "endurance")    addFit("6", m, "Endurance specialist");
            if (se === "speed")        addFit("6", m, "Speed specialist");
            if (comp === "winner")     addFit("6", m, "Competitor");
            if (vet)                   addFit("6", m, "Veteran");

            // ── Event 7: Sack Race — vibes, energy bringers, wildcards, balanced
            if (se === "vibes")        addFit("7", m, "Vibes specialist");
            if (tt === "energy_bringer") addFit("7", m, "Energy carrier");
            if (tt === "wildcard")     addFit("7", m, "Chaos agent");
            if (comp === "balanced")   addFit("7", m, "Consistent performer");

            // ── Event 8: 3-Legged Race — coordination, strategists, pairs chemistry
            if (se === "coordination") addFit("8", m, "Coordination specialist");
            if (tt === "strategist")   addFit("8", m, "Tactical pairing");
            if (tt === "motivator")    addFit("8", m, "Drives the pair");
            if (fear === "nothing")    addFit("8", m, "Unshakeable");

            // ── Event 9: 60m Team Relay — speed, motivators, winners, veterans
            if (se === "speed")        addFit("9", m, "Speed specialist");
            if (tt === "motivator")    addFit("9", m, "Momentum driver");
            if (comp === "winner")     addFit("9", m, "Competitor");
            if (vet)                   addFit("9", m, "Relay veteran");

            // ── Event 10: Chain Race — endurance, team players, motivators
            if (se === "endurance")    addFit("10", m, "Endurance specialist");
            if (tt === "motivator")    addFit("10", m, "Team engine");
            if (fear === "letting_team_down") addFit("10", m, "Driven by accountability");
            if (comp === "winner")     addFit("10", m, "Competitor");

            // ── Event 11: Tug of War (Finale) — strength, strategists, winners, fearless
            if (se === "strength")     addFit("11", m, "Strength specialist");
            if (tt === "strategist")   addFit("11", m, "Tactical anchor");
            if (comp === "winner")     addFit("11", m, "Competitor");
            if (fear === "nothing")    addFit("11", m, "Fearless");
            if (vet)                   addFit("11", m, "Experienced");
          });

          // ── Per-event AI insights (keyed by numeric DB ID as string) ────────────────────────
          const eventInsights: Record<string, string> = {};
          const squadDesc = n > 0 ? `Your ${n}-person squad` : "Your squad";

          // ─ Event 1 & 2: 60m Sprints (M/W) ──────────────────────────────────────────────
          const sprintInsight = (() => {
            const parts: string[] = [];
            if (speedCount > 0) parts.push(`${conf(speedCount)}: ${t(speedCount)} rated speed as their top attribute`);
            if (winnerCount > 0) parts.push(`${t(winnerCount)} here to win`);
            if (fearNothingCount > 0) parts.push(`${t(fearNothingCount)} completely fearless`);
            if (veteranCount > 0) parts.push(`${t(veteranCount)} returning ${veteranCount === 1 ? "veteran" : "veterans"} who know how to perform`);
            if (fearSprintCount > 0) parts.push(`${t(fearSprintCount)} flagged sprinting as their fear — that's your psychological edge over them`);
            if (parts.length === 0) return `No speed specialists flagged yet — but the sprint is won by whoever commits hardest. Pick your fastest and back them fully.`;
            return parts.join(". ") + ". Put your speed specialists in the blocks and let the winners do what they do.";
          })();
          eventInsights["1"] = sprintInsight;
          eventInsights["2"] = sprintInsight;

          // ─ Event 3: Egg & Spoon ──────────────────────────────────────────────────────────────────
          eventInsights["3"] = (() => {
            const parts: string[] = [];
            if (coordCount > 0) parts.push(`${conf(coordCount)}: ${t(coordCount)} rated coordination as their strongest attribute`);
            if (strategistCount > 0) parts.push(`${t(strategistCount)} strategic thinker${strategistCount === 1 ? "" : "s"} who won't rush`);
            if (balancedCount > 0) parts.push(`${t(balancedCount)} balanced competitor${balancedCount === 1 ? "" : "s"} built for composure`);
            if (parts.length === 0) return `Egg & Spoon is pure composure. No coordination specialists flagged yet — but the team that stays calm and moves with purpose will take this.`;
            return parts.join(". ") + ". Egg & Spoon rewards patience over pace — this is your event to control.";
          })();

          // ─ Event 4: Wheelbarrow ─────────────────────────────────────────────────────────────────
          eventInsights["4"] = (() => {
            const parts: string[] = [];
            if (strengthCount > 0) parts.push(`${conf(strengthCount)}: ${t(strengthCount)} built for strength`);
            if (coordCount > 0) parts.push(`${t(coordCount)} coordination-focused`);
            if (motivatorCount > 0) parts.push(`${t(motivatorCount)} motivator${motivatorCount === 1 ? "" : "s"} who drive their pair forward`);
            if (parts.length === 0) return `Wheelbarrow is a pairs event — chemistry and communication win it. Pick pairs who trust each other completely.`;
            return parts.join(". ") + ". Pair your strongest with your most coordinated and you've got a winning combination.";
          })();

          // ─ Event 5 & 6: 400m (M/W) ───────────────────────────────────────────────────────────
          const fourHundredInsight = (() => {
            const parts: string[] = [];
            if (enduranceCount > 0) parts.push(`${conf(enduranceCount)}: ${t(enduranceCount)} built for endurance`);
            if (speedCount > 0) parts.push(`${t(speedCount)} speed specialist${speedCount === 1 ? "" : "s"} who can hold pace`);
            if (winnerCount > 0) parts.push(`${t(winnerCount)} here to win — the 400m is where that mindset matters most`);
            if (veteranCount > 0) parts.push(`${t(veteranCount)} returning ${veteranCount === 1 ? "veteran" : "veterans"} who know how to pace themselves`);
            if (parts.length === 0) return `400m is the ultimate test of controlled aggression. No endurance specialists flagged yet — pick your most mentally tough athlete.`;
            return parts.join(". ") + ". The 400m is won in the final 100m — whoever trained their mind wins this.";
          })();
          eventInsights["5"] = fourHundredInsight;
          eventInsights["6"] = fourHundredInsight;

          // ─ Event 7: Sack Race ───────────────────────────────────────────────────────────────────
          eventInsights["7"] = (() => {
            const parts: string[] = [];
            if (vibesCount > 0) parts.push(`${conf(vibesCount)}: ${t(vibesCount)} who thrive on energy and vibes`);
            if (energyCount > 0) parts.push(`${t(energyCount)} energy bringer${energyCount === 1 ? "" : "s"} who will bring the crowd`);
            if (wildcardCount > 0) parts.push(`${t(wildcardCount)} wildcard${wildcardCount === 1 ? "" : "s"} who love chaos`);
            if (fearNothingCount > 0) parts.push(`${t(fearNothingCount)} completely fearless`);
            if (parts.length === 0) return `Sack Race is pure fun — but the team with the most energy wins. Get loud, get loose, and back your athlete.`;
            return parts.join(". ") + ". Sack Race rewards rhythm and confidence — send your most fearless and let the crowd carry them.";
          })();

          // ─ Event 8: 3-Legged Race ───────────────────────────────────────────────────────────────
          eventInsights["8"] = (() => {
            const parts: string[] = [];
            if (coordCount > 0) parts.push(`${conf(coordCount)}: ${t(coordCount)} rated coordination as their top attribute`);
            if (strategistCount > 0) parts.push(`${t(strategistCount)} strategic thinker${strategistCount === 1 ? "" : "s"} who will plan the stride pattern`);
            if (motivatorCount > 0) parts.push(`${t(motivatorCount)} motivator${motivatorCount === 1 ? "" : "s"} who will keep the pair in sync`);
            if (fearNothingCount > 0) parts.push(`${t(fearNothingCount)} fearless athlete${fearNothingCount === 1 ? "" : "s"} who won't freeze under pressure`);
            if (parts.length === 0) return `3-Legged Race is 100% chemistry. Pick pairs who communicate well and trust each other completely.`;
            return parts.join(". ") + ". Pick your most coordinated pairs and drill the rhythm before the race.";
          })();

          // ─ Event 9: 60m Team Relay ─────────────────────────────────────────────────────────────
          eventInsights["9"] = (() => {
            const parts: string[] = [];
            if (speedCount > 0 && motivatorCount > 0) {
              parts.push(`${t(speedCount)} speed specialist${speedCount === 1 ? "" : "s"} + ${t(motivatorCount)} motivator${motivatorCount === 1 ? "" : "s"} — relay is where your team chemistry becomes a weapon`);
            } else if (speedCount > 0) {
              parts.push(`${conf(speedCount)}: ${t(speedCount)} built for speed`);
            } else if (motivatorCount > 0) {
              parts.push(`${t(motivatorCount)} motivator${motivatorCount === 1 ? "" : "s"} who will drive the baton forward`);
            }
            if (winnerCount > 0) parts.push(`${t(winnerCount)} here to win — relay is where competitive squads pull away`);
            if (veteranCount > 0) parts.push(`${t(veteranCount)} returning ${veteranCount === 1 ? "veteran" : "veterans"} who know how to handle pressure`);
            if (parts.length === 0) return `Relay is about trust and timing. Coordinate your order, nail the handoffs, and let the team carry each other.`;
            return parts.join(". ") + ". Nail the handoffs — the baton wins or loses this.";
          })();

          // ─ Event 10: Chain Race ─────────────────────────────────────────────────────────────────
          eventInsights["10"] = (() => {
            const parts: string[] = [];
            if (enduranceCount > 0) parts.push(`${conf(enduranceCount)}: ${t(enduranceCount)} built for endurance`);
            if (motivatorCount > 0) parts.push(`${t(motivatorCount)} motivator${motivatorCount === 1 ? "" : "s"} who will keep the chain moving`);
            if (fearLettingDown > 0) parts.push(`${t(fearLettingDown)} driven by accountability — they won't let the chain break`);
            if (winnerCount > 0) parts.push(`${t(winnerCount)} here to win`);
            if (parts.length === 0) return `Chain Race is a team endurance test. Everyone runs, everyone matters. No weak links.`;
            return parts.join(". ") + ". Chain Race rewards depth — every member counts, not just the fastest.";
          })();

          // ─ Event 11: Tug of War (Finale) ────────────────────────────────────────────────────────
          eventInsights["11"] = (() => {
            const parts: string[] = [];
            if (strengthCount > 0 && strategistCount > 0) {
              parts.push(`${t(strengthCount)} strength specialist${strengthCount === 1 ? "" : "s"} + ${t(strategistCount)} tactical anchor${strategistCount === 1 ? "" : "s"} — Tug of War is yours to dominate`);
            } else if (strengthCount > 0) {
              parts.push(`${conf(strengthCount)}: ${t(strengthCount)} rated strength as their top attribute`);
            } else if (strategistCount > 0) {
              parts.push(`${t(strategistCount)} strategist${strategistCount === 1 ? "" : "s"} — Tug of War is won by positioning and timing, not just brute force`);
            }
            if (winnerCount > 0) parts.push(`${t(winnerCount)} here to win — the Finale is where champions are made`);
            if (fearNothingCount > 0) parts.push(`${t(fearNothingCount)} completely fearless`);
            if (veteranCount > 0) parts.push(`${t(veteranCount)} returning ${veteranCount === 1 ? "veteran" : "veterans"} who know how to dig in`);
            if (fearTeamCount > 0) parts.push(`${t(fearTeamCount)} flagged team events as their fear — use that tension as fuel, not a weakness`);
            if (parts.length === 0) return `Tug of War is the Finale — everything comes down to this. Get low, stay tight, and hold the line as one.`;
            return parts.join(". ") + ". Get low, stay tight, and hold the line. This is what you trained for.";
          })();



          return (
          <div className="space-y-4">
            {/* ─── TEAM DNA PANEL (collapsible) ─── */}
            <div
              className="border cursor-pointer select-none"
              style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
              onClick={() => { hs('tap'); setDnaExpanded((v) => !v); }}
            >
              {/* Always-visible: header + mindset bar */}
              <div className="p-4">
                {/* Header row */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-base">⚡</span>
                  <span className="font-display text-sm tracking-widest" style={{ color: tc.hex }}>TEAM DNA</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="font-mono text-white/60 text-[10px]">{n} SQUAD MEMBER{n !== 1 ? "S" : ""}</span>
                    <span className="font-mono text-white/55 text-[10px]">{dnaExpanded ? "▲" : "▼"}</span>
                  </span>
                </div>

                {/* Competitiveness bar — always visible */}
                {(winnerCount + balancedCount + vibesOnlyCount) > 0 && (
                  <div>
                    <div className="flex justify-between font-mono text-[9px] text-white/60 mb-1">
                      <span>SQUAD MINDSET</span>
                      <span>{winnerCount > 0 ? `${winnerCount} WINNER${winnerCount !== 1 ? "S" : ""}` : ""}{balancedCount > 0 ? `${winnerCount > 0 ? " · " : ""}${balancedCount} BALANCED` : ""}{vibesOnlyCount > 0 ? `${(winnerCount + balancedCount) > 0 ? " · " : ""}${vibesOnlyCount} VIBES` : ""}</span>
                    </div>
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                      {winnerCount > 0 && (
                        <div
                          className="h-full transition-all"
                          style={{ width: `${(winnerCount / n) * 100}%`, background: "#fbbf24" }}
                        />
                      )}
                      {balancedCount > 0 && (
                        <div
                          className="h-full transition-all"
                          style={{ width: `${(balancedCount / n) * 100}%`, background: "#60a5fa" }}
                        />
                      )}
                      {vibesOnlyCount > 0 && (
                        <div
                          className="h-full transition-all"
                          style={{ width: `${(vibesOnlyCount / n) * 100}%`, background: "#f472b6" }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Expandable section */}
              {dnaExpanded && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: `${tc.hex}20` }}>
                  {/* DNA tag grid */}
                  {dnaTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-3 mb-3">
                      {dnaTags.map((tag) => (
                        <div
                          key={tag.label}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-sm"
                          style={{ background: `${tag.color}15`, border: `1px solid ${tag.color}30` }}
                        >
                          <span
                            className="font-display text-[11px] tracking-widest"
                            style={{ color: tag.color }}
                          >
                            {tag.value}
                          </span>
                          <span className="font-mono text-white/75 text-[9px] tracking-wider">{tag.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="font-mono text-white/55 text-[10px] mt-3 mb-3">Questionnaire data loading…</p>
                  )}

                  {/* Veteran / first-timer line */}
                  {(veteranCount + firstTimerCount) > 0 && (
                    <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] text-white/60">
                      <span>🏆 {veteranCount} VETERAN{veteranCount !== 1 ? "S" : ""}</span>
                      <span className="text-white/15">·</span>
                      <span>✨ {firstTimerCount} FIRST-TIMER{firstTimerCount !== 1 ? "S" : ""}</span>
                      {fearNothingCount > 0 && (
                        <>
                          <span className="text-white/15">·</span>
                          <span>🟢 {fearNothingCount} FEARLESS</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Footer hint */}
                  <p className="font-mono text-white/75 text-[9px] mt-3 pt-3 border-t" style={{ borderColor: `${tc.hex}20` }}>
                    Tap any event below to see your squad's AI-powered strategy and best-fit players.
                  </p>
                </div>
              )}
            </div>

                        <SectionHeader label="THE EVENTS" />
            {/* ── Tips: events + ai-intel ── */}
            {!isSeen("events") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "events")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            {!isSeen("ai-intel") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "ai-intel")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            {/* ─── TIMELINE ─── */}
            <div className="relative">
              {/* Vertical spine */}
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/8" />

              <div className="space-y-0">
                {liveEvents.map((event, idx) => {
                  const numericId = Number(event.id);
                  const eventResults = publicEventResults
                    ? publicEventResults.filter((r) => r.eventId === numericId)
                    : (hub.leaderboard as any[]).filter((e: any) => e.eventName === event.id);
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
                  const normalizedEventResults = eventResults.map((r: any) => ({
                    team: r.team as "red" | "blue" | "pink" | "orange",
                    dnf: r.dnf ?? false,
                    position: r.placement ?? r.position ?? null,
                    points: r.finalPoints ?? r.points ?? 0,
                  }));
                  const isExpanded = expandedEvent === event.id;
                  const aiInsight = eventInsights[event.id];
                  const typeBadge = event.eventType ? TYPE_BADGE[event.eventType] : null;
                  const formatLabel = event.format ? FORMAT_BADGE[event.format] : null;
                  const statusPill = STATUS_PILL[event.status ?? "upcoming"] ?? STATUS_PILL.upcoming;
                  const isComplete = event.status === "complete";
                  const isLive = event.status === "live";
                  const bufferMins = event.setupBufferMinutes ?? 10;

                  return (
                    <div key={event.id}>
                      {/* ── Event card ── */}
                      <div className="flex gap-3 items-start">
                        {/* Timeline node */}
                        <div className="flex-shrink-0 flex flex-col items-center" style={{ width: 38 }}>
                          <div
                            className="w-[38px] h-[38px] rounded-full flex items-center justify-center border text-sm z-10 relative"
                            style={{
                              borderColor: isLive ? statusPill.color : isComplete ? "rgba(255,255,255,0.12)" : `${tc.hex}40`,
                              background: isLive ? `rgba(74,222,128,0.1)` : isComplete ? "rgba(255,255,255,0.03)" : `${tc.hex}08`,
                              boxShadow: isLive ? `0 0 12px rgba(74,222,128,0.3)` : "none",
                            }}
                          >
                            {isComplete ? (
                              <span className="text-white/55 text-xs">✓</span>
                            ) : (
                              <span>{event.icon}</span>
                            )}
                          </div>
                        </div>

                        {/* Card body */}
                        <div
                          className="flex-1 mb-3 border cursor-pointer transition-all"
                          style={{
                            borderColor: isExpanded ? `${tc.hex}50` : isLive ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)",
                            background: isExpanded ? `${tc.hex}06` : isLive ? "rgba(74,222,128,0.04)" : "rgba(255,255,255,0.01)",
                          }}
                          onClick={() => { hs('tap'); setExpandedEvent(isExpanded ? null : event.id); }}
                        >
                          {/* ── Card header ── */}
                          <div className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {/* Badges row */}
                                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                                  {typeBadge && (
                                    <span
                                      className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border"
                                      style={{ color: typeBadge.color, borderColor: `${typeBadge.color}50`, background: typeBadge.bg }}
                                    >
                                      {typeBadge.label}
                                    </span>
                                  )}
                                  {formatLabel && (
                                    <span className="font-mono text-[9px] tracking-widest px-1.5 py-0.5 border border-white/30 text-white/70">
                                      {formatLabel}
                                    </span>
                                  )}
                                  <span
                                    className={`font-mono text-[9px] tracking-widest px-1.5 py-0.5 border ${statusPill.pulse ? "animate-pulse" : ""}`}
                                    style={{ color: statusPill.color, borderColor: `${statusPill.color}40`, background: statusPill.bg }}
                                  >
                                    {statusPill.label}
                                  </span>
                                </div>

                                {/* Event name */}
                                <div
                                  className="font-display text-base tracking-widest leading-tight"
                                  style={{ color: isComplete ? "rgba(255,255,255,0.35)" : isLive ? "#4ade80" : "rgba(242,240,235,0.9)" }}
                                >
                                  {event.name}
                                </div>

                                {/* Matchup label */}
                                {event.matchupLabel && (
                                  <div className="font-mono text-[10px] text-white/60 mt-0.5 tracking-wide">
                                    {event.matchupLabel}
                                  </div>
                                )}

                                {/* Arena + time */}
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                  {event.arena && (
                                    <span className="font-mono text-[9px] text-white/55 tracking-wider">📍 {event.arena}</span>
                                  )}
                                  {event.startTime && (
                                    <span className="font-mono text-[9px] text-white/55 tracking-wider">
                                      🕐 {event.startTime}{event.endTime ? ` – ${event.endTime}` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right: result or chevron */}
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {myTeamResult && (
                                  <div className="text-right">
                                    {myTeamResult.dnf ? (
                                      <span className="font-mono text-red-500/70 text-xs tracking-wider">DNF</span>
                                    ) : (
                                      <div>
                                        <div className="font-display text-lg tracking-widest" style={{ color: tc.hex }}>
                                          {myTeamResult.position ? `${myTeamResult.position}${ordinal(myTeamResult.position)}` : "—"}
                                        </div>
                                        <div className="font-mono text-white/60 text-[10px]">{myTeamResult.points ?? 0}pts</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                <span className="font-mono text-white/75 text-xs">{isExpanded ? "▲" : "▼"}</span>
                              </div>
                            </div>
                          </div>

                          {/* ── Expanded panel ── */}
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t" style={{ borderColor: `${tc.hex}20` }}>
                              {/* Points + wildcards row */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                {event.pointsMultiplier > 1 && (
                                  <div
                                    className="flex items-center gap-1.5 px-2 py-0.5 border"
                                    style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}10` }}
                                  >
                                    <span className="font-mono text-[9px] tracking-widest" style={{ color: tc.hex }}>×{event.pointsMultiplier} POINTS</span>
                                  </div>
                                )}
                                {event.wildcardsEnabled ? (
                                  <div
                                    className="flex items-center gap-1.5 px-2 py-0.5 border"
                                    style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}10` }}
                                  >
                                    <span className="text-[10px]">⚡</span>
                                    <span className="font-mono text-[9px] tracking-widest" style={{ color: tc.hex }}>POWER UPS ACTIVE</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 border border-white/25">
                                    <span className="text-[10px]">🔒</span>
                                    <span className="font-mono text-[9px] tracking-widest text-white/55">NO POWER UPS</span>
                                  </div>
                                )}
                              </div>

                              {/* AI insight */}
                              {aiInsight && (
                                <div className="mt-3 flex items-start gap-2">
                                  <span className="text-sm mt-0.5">⚡</span>
                                  <p className="font-mono text-xs leading-relaxed" style={{ color: tc.hex }}>
                                    {aiInsight}
                                  </p>
                                </div>
                              )}

                              {/* Mini results leaderboard */}
                              {normalizedEventResults.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-white/25">
                                  <div className="font-mono text-[9px] tracking-[0.25em] text-white/60 mb-2">RESULTS</div>
                                  <div className="grid grid-cols-4 gap-2">
                                    {(["red","blue","pink","orange"] as const).map((team) => {
                                      const r = normalizedEventResults.find((e) => e.team === team);
                                      return (
                                        <div key={team} className="text-center">
                                          <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ background: TEAM_COLORS[team]?.hex ?? "#fff" }} />
                                          <div className="font-mono text-white/60 text-[9px]">
                                            {r?.dnf ? "DNF" : r ? `${r.position ?? "—"}${r.position ? ordinal(r.position) : ""}` : "—"}
                                          </div>
                                          {r && !r.dnf && (
                                            <div className="font-mono text-white/75 text-[8px]">{r.points}pts</div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Best fit squad members */}
                              {(() => {
                                const fits = eventBestFit[event.id] ?? [];
                                if (fits.length === 0) return null;
                                return (
                                  <div className="mt-3 pt-3 border-t" style={{ borderColor: `${tc.hex}15` }}>
                                    <div className="font-mono text-[9px] tracking-[0.25em] text-white/60 mb-2">BEST FIT FOR THIS EVENT</div>
                                    <div className="flex flex-wrap gap-2">
                                      {fits.map(({ member, reason }) => (
                                        <div
                                          key={member.id}
                                          className="flex items-center gap-2 px-2 py-1.5 border"
                                          style={{ borderColor: `${tc.hex}30`, background: `${tc.hex}08` }}
                                        >
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
                                            <div
                                              className="font-display text-xs tracking-widest leading-none"
                                              style={{ color: member.id === userId ? tc.hex : "rgba(255,255,255,0.8)" }}
                                            >
                                              {member.fullName?.split(" ")[0]?.toUpperCase()}
                                              {member.id === userId && <span className="font-mono text-[8px] ml-1 opacity-60">YOU</span>}
                                            </div>
                                            <div className="font-mono text-[9px] text-white/60 mt-0.5">{reason}</div>
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
                      </div>

                      {/* ── Setup buffer divider (between cards, not after last) ── */}
                      {idx < liveEvents.length - 1 && (
                        <div className="flex items-center gap-2 pl-[50px] py-1 mb-1">
                          <div className="flex-1 h-px bg-white/10" />
                          <span className="font-mono text-[8px] tracking-widest text-white/15 flex-shrink-0">
                            — {bufferMins} min setup —
                          </span>
                          <div className="flex-1 h-px bg-white/10" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
          );
        })()}

        {/* ─── LEADERBOARD TAB ─── */}
        {activeTab === "leaderboard" && (
          <div className="space-y-4">
            <SectionHeader label="TEAM STANDINGS" />
            {/* ── Tips: leaderboard + leaderboard-live ── */}
            {!isSeen("leaderboard") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "leaderboard")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            {!isSeen("leaderboard-live") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "leaderboard-live")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            {sortedTeams.length === 0 ? (
              <p className="font-mono text-white/60 text-xs tracking-wider">
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
                              <div className="font-mono text-white/70 text-xs mt-0.5">
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
                            <div className="font-mono text-white/60 text-xs">POINTS</div>
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
                        <div key={event.id} className="border border-white/25 bg-white/[0.02] p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xl">{event.icon}</span>
                            <div>
                              <div className="font-display text-base tracking-widest">{event.name}</div>
                              <div className="font-mono text-white/60 text-xs">{event.desc}</div>
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
                                  <div className="font-mono text-[9px] text-white/75 mb-1">{team}</div>
                                  <div className="font-display text-sm tracking-widest" style={{ color: teamColor?.hex }}>
                                    {r?.dnf ? "DNF" : r?.position ? `${r.position}${ordinal(r.position)}` : "—"}
                                  </div>
                                  <div className="font-mono text-[9px] text-white/70">{r?.points ?? 0}pts</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="mt-6 p-4 border border-white/25 bg-white/[0.02]">
                  <div className="font-mono text-xs text-white/70 tracking-wider mb-2">SCORING SYSTEM</div>
                  <div className="space-y-1 font-mono text-xs text-white/75">
                    <div>1st Place: 10 points</div>
                    <div>2nd Place: 7 points</div>
                    <div>3rd Place: 4 points</div>
                    <div>4th Place: 2 points</div>
                    <div className="text-white/60">Tug of War: ×2 multiplier</div>
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
            {/* ── Tips: power-ups + power-up-voting ── */}
            {!isSeen("power-ups") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "power-ups")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            {!isSeen("power-up-voting") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "power-up-voting")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            {/* Status banner */}
            {!votingEnabled ? (
              <div
                className="flex items-center gap-3 px-4 py-3 border"
                style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
              >
                <span className="text-lg">🔒</span>
                <div className="font-mono text-[10px] tracking-wider text-white/35">POWER UPS LOCKED — ADMIN WILL OPEN ON THE DAY</div>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 px-4 py-3 border"
                style={{ borderColor: `${tc.hex}30`, background: `${tc.hex}08` }}
              >
                <span className="text-lg">⚡</span>
                <div>
                  <div className="font-mono text-[10px] tracking-wider" style={{ color: tc.hex }}>POWER UPS OPEN</div>
                  <div className="font-mono text-[9px] tracking-wider text-white/70 mt-0.5">
                    {isCaptainUser ? "TAP A CARD TO INITIATE AS CAPTAIN" : "CAPTAINS INITIATE — TEAM VOTES TO CONFIRM"}
                  </div>
                </div>
              </div>
            )}

            {/* All 5 power up cards */}
            <div className="space-y-3">
              {POWER_UPS.map((wc) => {
                const session = hub.wildcardSessions?.[wc.id];
                const isActivated = session?.status === "activated";
                const isSelectingTarget = powerUpInitiating === wc.id;

                return (
                  <div
                    key={wc.id}
                    className="border"
                    style={{
                      borderColor: isActivated ? "#22c55e" : "rgba(255,255,255,0.1)",
                      background: isActivated ? "rgba(34,197,94,0.08)" : "rgba(255,255,255,0.02)",
                    }}
                  >
                    {/* Card header */}
                    <div className="flex items-center gap-3 p-4">
                      <span className="text-2xl w-9 text-center flex-shrink-0">{wc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-display text-base tracking-widest">{wc.name}</div>
                        <div className="font-mono text-[9px] mt-0.5 leading-relaxed">
                          {isActivated ? (
                            <span style={{ color: "#22c55e" }}>⚡ USED{session?.targetTeam ? ` → ${session.targetTeam.toUpperCase()}` : ""}</span>
                          ) : (
                            <span className="text-white/35">{wc.short}</span>
                          )}
                        </div>
                      </div>
                      {isActivated && <span className="text-2xl flex-shrink-0">✅</span>}
                    </div>

                    {/* Action area */}
                    <div className="px-4 pb-4">
                      {!votingEnabled ? (
                        <div className="text-center font-mono text-[9px] tracking-wider text-white/20 py-1">
                          POWER UPS LOCKED
                        </div>
                      ) : isActivated ? (
                        <div className="text-center font-mono text-xs tracking-wider py-1" style={{ color: "#22c55e" }}>⚡ POWER UP USED</div>
                      ) : isCaptainUser ? (
                        /* Captain: one-tap USE (with target picker for BLOCK/SABOTAGE) */
                        (<>
                          {isSelectingTarget && wc.needsTarget && (
                            <div className="mb-2 grid grid-cols-3 gap-1">
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
                              if (wc.needsTarget && !isSelectingTarget) { setWildcardInitiating(wc.id); return; }
                              if (wc.needsTarget && !powerUpTarget) return;
                              initiatePowerUpMutation.mutate({
                                registrationId: userId,
                                team: hub.team as "red"|"blue"|"pink"|"orange",
                                wildcardId: wc.id as "boost"|"sabotage"|"block"|"double_down"|"all_in",
                                targetTeam: powerUpTarget as "red"|"blue"|"pink"|"orange" | undefined,
                              }, {
                                onSuccess: () => { setWildcardInitiating(null); setWildcardTarget(null); },
                              });
                            }}
                            disabled={initiatePowerUpMutation.isPending || (isSelectingTarget && wc.needsTarget && !powerUpTarget)}
                            className="w-full py-2.5 font-display text-sm tracking-widest transition-all active:scale-[0.99]"
                            style={{
                              background: isSelectingTarget ? tc.hex : `${tc.hex}20`,
                              color: isSelectingTarget ? "#0A0A0A" : tc.hex,
                              border: isSelectingTarget ? "none" : `1px solid ${tc.hex}40`,
                              opacity: (isSelectingTarget && wc.needsTarget && !powerUpTarget) ? 0.4 : 1,
                            }}
                          >
                            {initiatePowerUpMutation.isPending && powerUpInitiating === wc.id
                              ? "ACTIVATING..."
                              : isSelectingTarget
                                ? (wc.needsTarget ? (powerUpTarget ? `USE ${wc.name} →` : "SELECT TARGET FIRST") : `USE ${wc.name} →`)
                                : `USE →`}
                            </button>
                          </>)
                      ) : (
                        /* Non-captain: read-only view */
                        <div className="text-center font-mono text-[9px] tracking-wider text-white/15 py-1">
                          CAPTAIN ACTIVATES
                        </div>
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
                <div className="font-mono text-white/70 text-[10px] tracking-[0.3em] mb-1">VOTING OPENS IN</div>
                <div className="font-display text-3xl tracking-widest" style={{ color: tc.hex }}>
                  {votingCountdownStr}
                </div>
                <div className="font-mono text-white/55 text-[10px] tracking-wider mt-1">
                  10:00 AM · SAT 11 JULY 2026
                </div>
              </div>
            )}

            {canVote && (
              <p className="font-mono text-white/60 text-xs tracking-wider">
                One vote per category. Make it count.
              </p>
            )}

            {AWARD_CATEGORIES.map((cat) => {
              const myVote = awardData?.myVotes.find((v) => v.category === cat.id);
              const votedFor = myVote ? hub.members.find((m) => m.id === myVote.nomineeId) : null;

              return (
                <div key={cat.id} className="border border-white/25 bg-white/[0.02]">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.icon}</span>
                      <span className="font-display text-base tracking-widest">{cat.label}</span>
                    </div>
                    {!canVote ? (
                      <span className="font-mono text-white/75 text-[10px] tracking-widest">🔒 LOCKED</span>
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
                          className="font-mono text-white/75 text-[10px] hover:text-white/75 transition-colors"
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
                    <div className="border-t border-white/25 p-4 space-y-2">
                      <p className="font-mono text-white/60 text-[10px] tracking-widest mb-3">
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
                            className="w-full flex items-center gap-3 p-3 border border-white/25 hover:border-white/30 transition-all text-left active:scale-[0.99]"
                          >
                            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/35 flex-shrink-0 flex items-center justify-center">
                              {member.photoUrl ? (
                                <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm">👤</span>
                              )}
                            </div>
                            <div>
                              <div className="font-display text-sm tracking-widest">{member.fullName}</div>
                              {member.profileTagline && (
                                <div className="font-mono text-white/55 text-[10px] truncate italic">
                                  "{member.profileTagline}"
                                </div>
                              )}
                            </div>
                          </button>
                        ))}
                      <button
                        onClick={() => setVotingFor(null)}
                        className="w-full font-mono text-white/75 text-xs py-2 hover:text-white/70 transition-colors"
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
            <SectionHeader label="OUR SPONSORS" />

            {/* Sponsors grid */}
            <div className="space-y-4">
              {/* Virgin Active */}
              <div
                className="border p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]"
                style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
              >
                <img
                  src="/manus-storage/N91CO4w4I1b1_c3ada223.png"
                  alt="Virgin Active"
                  className="h-16 object-contain"
                />
                <div className="text-center">
                  <div className="font-display text-lg tracking-widest mb-1" style={{ color: tc.hex }}>VIRGIN ACTIVE</div>
                  <p className="font-mono text-white/60 text-xs tracking-wider mb-3">FREE DAY PASSES FOR EVERYONE</p>
                  <a
                    href="https://forms.office.com/Pages/ResponsePage.aspx?id=bHjuKcum9USwigeDFWjU90jxSetuYh5As0mw6Z6vJ6VUNlkwM1BWS0s1SEtZVDlTU1ZWMkJFNFZPQy4u"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-mono text-[10px] tracking-widest underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: tc.hex }}
                  >
                    GET YOURS →
                  </a>
                </div>
              </div>

              {/* Pure Sport */}
              <div
                className="border p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]"
                style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
              >
                <img
                  src="/manus-storage/eifU8iPmHxfV_bde69309.jpg"
                  alt="Pure Sport"
                  className="h-16 object-contain"
                />
                <div className="text-center">
                  <div className="font-display text-lg tracking-widest mb-1" style={{ color: tc.hex }}>PURE SPORT</div>
                  <p className="font-mono text-white/60 text-xs tracking-wider mb-2">HYDRATION PARTNER</p>
                  <div className="font-mono text-sm tracking-wider mb-3" style={{ color: tc.hex }}>CODE: <span className="font-bold">6PLUS1</span></div>
                  <a
                    href="https://www.puresport.co"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-mono text-[10px] tracking-widest underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: tc.hex }}
                  >
                    VISIT SITE →
                  </a>
                </div>
              </div>

              {/* Kitlocker */}
              <div
                className="border p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]"
                style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
              >
                <img
                  src="/manus-storage/HhQA3cm5zP53_fc58526b.png"
                  alt="Kitlocker"
                  className="h-16 object-contain"
                />
                <div className="text-center">
                  <div className="font-display text-lg tracking-widest mb-1" style={{ color: tc.hex }}>KITLOCKER</div>
                  <p className="font-mono text-white/60 text-xs tracking-wider mb-3">KIT & TEAM MANAGEMENT</p>
                  <a
                    href="https://www.kitlocker.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-mono text-[10px] tracking-widest underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: tc.hex }}
                  >
                    VISIT SITE →
                  </a>
                </div>
              </div>

              {/* New Balance */}
              <div
                className="border p-6 flex flex-col items-center justify-center gap-4 min-h-[200px]"
                style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
              >
                <img
                  src="/manus-storage/KVFvqQ3JIe5A_26e8acf9.png"
                  alt="New Balance"
                  className="h-16 object-contain"
                />
                <div className="text-center">
                  <div className="font-display text-lg tracking-widest mb-1" style={{ color: tc.hex }}>NEW BALANCE</div>
                  <p className="font-mono text-white/60 text-xs tracking-wider mb-3">TECHNICAL GEAR PARTNER</p>
                  <a
                    href="https://www.newbalance.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block font-mono text-[10px] tracking-widest underline underline-offset-2 transition-opacity hover:opacity-70"
                    style={{ color: tc.hex }}
                  >
                    VISIT SITE →
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── LOCATION TAB ─── */}
        {activeTab === "location" && (
          <div className="space-y-4">
            <SectionHeader label="THE VENUE" />
            {/* ── Tip: location ── */}
            {!isSeen("location") && (
              <TipCard
                tip={TIPS.find((t) => t.id === "location")!}
                onDismiss={(id) => { hs("tap"); dismiss(id); }}
                onDismissAll={() => { hs("tap"); dismissAll(); }}
                showDismissAll={false}
                accentColor={tc.hex}
                arrowDir="down"
              />
            )}
            <div
              className="p-6 border"
              style={{ borderColor: `${tc.hex}40`, background: `${tc.hex}08` }}
            >
              <div
                className="font-display text-4xl tracking-widest mb-1"
                style={{ color: tc.hex }}
              >
                {hub?.event?.location?.toUpperCase() ?? "MILLHOUSES PARK"}
              </div>
              <p className="font-mono text-white/70 text-sm">{hub?.event?.fullAddress ?? "Millhouses Park, Sheffield, S7 2QQ"}</p>
              <p className="font-mono text-white/70 text-sm mt-1">{hub?.event?.date ?? "Saturday 11 July 2026"}</p>
              <a
                href={hub?.event?.mapsUrl ?? "https://maps.google.com/?q=Millhouses+Park+Sheffield+S7+2QQ"}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 font-mono text-xs tracking-widest underline underline-offset-4 transition-opacity hover:opacity-70"
                style={{ color: tc.hex }}
              >
                OPEN IN MAPS →
              </a>
            </div>

            <div className="space-y-2">
              {["Arrive by 9AM", "Events start 10:00AM sharp", "Bring water + trainers", "Wear your team colour"].map((detail) => (
                <div
                  key={detail}
                  className="flex items-center gap-3 p-4 border border-white/25"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: tc.hex }}
                  />
                  <span className="font-mono text-sm tracking-wider">{detail}</span>
                </div>
              ))}
            </div>

            {/* Google Maps embed — Millhouses Park, Sheffield */}
            <div
              className="relative overflow-hidden border"
              style={{ borderColor: `${tc.hex}40` }}
            >
              <a
                href="https://maps.google.com/?q=Millhouses+Park+Sheffield+S7+2QQ"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src="/api/static-map?center=53.3453,-1.5000&zoom=15&size=600x260&maptype=roadmap&markers=color:red%7C53.3453,-1.5000"
                  alt="Millhouses Park, Sheffield — tap to open in Google Maps"
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
        {/* ─── SHARED PHOTO FEED ─── */}
        <PhotoFeed registrationId={userId} teamColor={tc.hex} />

        {/* ─── Account / Logout ─── */}
        <div className="relative z-10 mt-8 pb-10 px-0">
          <div className="border-t border-white/8 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-white/55 text-[10px] tracking-[0.3em] mb-0.5">REGISTERED AS</p>
                <p className="font-mono text-white/75 text-xs tracking-wider">{typeof window !== "undefined" ? localStorage.getItem("userEmail") ?? "" : ""}</p>
              </div>
              <button
                onClick={() => {
                  hs('confirm');
                  localStorage.removeItem("sd_user_id");
                  localStorage.removeItem("userEmail");
                  sessionStorage.setItem("came_from_teamhub", "1");
                  window.location.href = "/";
                }}
                className="font-mono text-white/55 text-xs tracking-[0.2em] hover:text-[#FF5500] transition-colors border border-white/25 hover:border-[#FF5500]/40 px-4 py-2"
              >
                              LOG OUT
              </button>
            </div>
            {/* Legal + Admin links */}
            <div className="flex items-center gap-4 flex-wrap justify-center mt-6 pt-4 border-t border-white/5">
              <a href="/terms" className="font-mono text-white/75 text-[10px] tracking-wider hover:text-white/75 transition-colors">TERMS &amp; CONDITIONS</a>
              <span className="text-white/10 text-[10px]">|</span>
              <a href="/privacy" className="font-mono text-white/75 text-[10px] tracking-wider hover:text-white/75 transition-colors">PRIVACY POLICY</a>
              <span className="text-white/10 text-[10px]">|</span>
              <a href="/admin" className="font-mono text-white/10 text-[10px] tracking-wider hover:text-white/60 transition-colors">ADMIN</a>
            </div>
            <p className="font-mono text-white/10 text-[10px] tracking-wider text-center mt-3">© 6+1 SPORTS DAY 002 — 2026</p>
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
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
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
                    <div className="w-full h-full bg-white/10 flex items-center justify-center text-5xl">👤</div>
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
                     className="font-mono text-white/75 text-sm hover:text-white/80 transition-colors underline underline-offset-2"
                   >@{selectedMember.instagramHandle}</a>
                 </div>
              )}
              
              {/* Tagline */}
              {selectedMember.profileTagline && (
                <div className="text-center mb-4 border-t border-white/25 pt-4">
                  <p className="font-mono text-white/70 text-xs italic">"{selectedMember.profileTagline}"</p>
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
                  className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
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
                      <div className="w-full h-full bg-white/10 flex items-center justify-center">
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
                       className="font-mono text-white/75 text-sm hover:text-white/80 transition-colors underline underline-offset-2"
                     >@{capMember.instagramHandle}</a>
                   </div>
                 )}

                {/* Tagline if found */}
                {capMember?.profileTagline && (
                  <div className="text-center mb-4 border-t border-white/25 pt-4">
                    <p className="font-mono text-white/70 text-xs italic">"{capMember.profileTagline}"</p>
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
      <span className="font-mono text-white/60 text-[10px] tracking-[0.3em]">{label}</span>
      <div className="flex-1 h-[1px] bg-white/10" />
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}
