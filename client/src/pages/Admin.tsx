import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { BackNav } from "@/components/ui/back-nav";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

const TEAM_COLORS: Record<string, string> = {
  red: "#E8232A",
  blue: "#1A4FE8",
  pink: "#F72B8C",
  orange: "#FF6B00",
};

// ─── Password Gate ─────────────────────────────────────────────────────────────

function AdminPasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  // Server-side password verification — ADMIN_PASSWORD env var is never exposed to the client
  const verifyMutation = trpc.sportsday.verifyAdminPassword.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        sessionStorage.setItem("admin_unlocked", "true");
        onUnlock();
      } else {
        const errMsg = (data as { success: false; error: string }).error ?? "Incorrect password.";
        setError(errMsg);
        setPassword("");
      }
    },
    onError: () => {
      setError("Server error. Please try again.");
      setPassword("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    verifyMutation.mutate({ password });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-5">
      <div className="h-[2px] bg-[#FF5500] absolute top-0 left-0 right-0" />
      <img src={LOGO_URL} alt="6+1" className="h-10 w-auto mb-10" style={{ filter: "invert(1)" }} />
      <h1 className="font-display text-[#F2F0EB] text-4xl tracking-widest mb-2">ADMIN ACCESS</h1>
      <p className="font-mono text-[#555] text-xs tracking-wider mb-8">SPORTS DAY 002 — RESTRICTED</p>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(""); }}
          placeholder="Enter admin password"
          autoFocus
          disabled={verifyMutation.isPending}
          className="w-full bg-[#111] border border-[#333] focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-sm px-4 py-4 transition-colors placeholder:text-[#444] disabled:opacity-50"
        />
        {error && (
          <p className="font-mono text-[#FF5500] text-xs tracking-wider leading-relaxed">
            {error.includes("not configured") 
              ? "⚠ Admin password not set in deployment environment. Set ADMIN_PASSWORD in project secrets."
              : error}
          </p>
        )}
        <button
          type="submit"
          disabled={verifyMutation.isPending || !password.trim()}
          className="w-full bg-[#FF5500] text-[#0A0A0A] font-display text-xl tracking-widest py-4 hover:bg-[#F2F0EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {verifyMutation.isPending ? "VERIFYING..." : "ENTER →"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full border border-[#333] text-[#555] font-mono text-xs tracking-widest py-3 hover:border-[#555] hover:text-[#F2F0EB] transition-colors"
        >
          GO HOME
        </button>
      </form>
    </div>
  );
}

// ─── Admin Dashboard ───────────────────────────────────────────────────────────

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [passwordUnlocked, setPasswordUnlocked] = useState(
    () => sessionStorage.getItem("admin_unlocked") === "true"
  );
  const [activeTab, setActiveTab] = useState<"users" | "health" | "leaderboard" | "schedule">("users");
  const [scheduleForm, setScheduleForm] = useState({ eventName: "", startTime: "", endTime: "", location: "", description: "", sortOrder: "0", isCompleted: false });
  const [lbForm, setLbForm] = useState({
    eventName: "sprint",
    team: "red" as "red" | "blue" | "pink" | "orange",
    position: "",
    points: "0",
    dnf: false,
    notes: "",
  });
  const [filters, setFilters] = useState({
    team: "all",
    paymentStatus: "all",
    shirtSize: "all",
    contentConsent: "all",
    search: "",
  });

  const isAdmin = isAuthenticated && user?.role === "admin";
  const canAccess = passwordUnlocked && isAdmin;
  const utils = trpc.useUtils();

  const { data: stats } = trpc.sportsday.adminStats.useQuery(undefined, {
    enabled: canAccess,
  });

  const { data: allUsers = [] } = trpc.sportsday.adminUsers.useQuery(undefined, {
    enabled: canAccess,
  });

  const { data: healthNotes = [] } = trpc.sportsday.adminHealthNotes.useQuery(undefined, {
    enabled: canAccess && activeTab === "health",
  });
  const { data: leaderboardData = [] } = trpc.sportsday.adminGetLeaderboard.useQuery(undefined, {
    enabled: canAccess && activeTab === "leaderboard",
  });
  const { data: eventScheduleData = [], refetch: refetchSchedule } = trpc.sportsday.getEventSchedule.useQuery(undefined, {
    enabled: canAccess && activeTab === "schedule",
  });
  const { data: liveEventData, refetch: refetchLive } = trpc.sportsday.getLiveEvent.useQuery(undefined, {
    enabled: canAccess,
    refetchInterval: 15000,
  });
  const setLiveEventMutation = trpc.sportsday.adminSetLiveEvent.useMutation({
    onSuccess: () => { toast.success("Live event updated!"); refetchLive(); refetchSchedule(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const upsertEventMutation = trpc.sportsday.adminUpsertEvent.useMutation({
    onSuccess: () => { toast.success("Event saved!"); setScheduleForm({ eventName: "", startTime: "", endTime: "", location: "", description: "", sortOrder: "0", isCompleted: false }); refetchSchedule(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const deleteEventMutation = trpc.sportsday.adminDeleteEvent.useMutation({
    onSuccess: () => { toast.success("Event deleted!"); refetchSchedule(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const upsertLb = trpc.sportsday.adminUpsertLeaderboard.useMutation({
    onSuccess: () => {
      toast.success("Leaderboard updated!");
      utils.sportsday.adminGetLeaderboard.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (filters.team !== "all" && u.team !== filters.team) return false;
      if (filters.paymentStatus !== "all" && u.paymentStatus !== filters.paymentStatus) return false;
      if (filters.shirtSize !== "all" && u.shirtSize !== filters.shirtSize) return false;
      if (filters.contentConsent !== "all" && u.contentConsent !== filters.contentConsent) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.instagramHandle?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [allUsers, filters]);

  const exportCSV = () => {
    const headers = [
      "ID", "Name", "Email", "Instagram", "Attended Before", "Coming Type", "Group Code", "Group Role",
      "Date 4 July", "Date 11 July", "Date 18 July", "Date Any",
      "Competitiveness", "Teammate Type", "Strongest Event", "Fear", "Event Motivation",
      "Captain Vote Interest", "Profile", "Tagline", "Team", "Payment Status", "Access Type",
      "Shirt Size", "Shirt Fit", "Content Consent",
      "Referral Code", "Referred By", "Referral Count", "Referral Reward Unlocked",
      "Created At",
    ];

    const rows = filteredUsers.map((u) => [
      u.id, u.fullName, u.email, u.instagramHandle ?? "",
      u.attendedBefore != null ? (u.attendedBefore ? "Yes" : "No") : "",
      u.comingType ?? "", u.groupCode ?? "", u.groupRole ?? "",
      u.date4July ? "Yes" : "No", u.date11July ? "Yes" : "No",
      u.date18July ? "Yes" : "No", u.dateAny ? "Yes" : "No",
      u.competitiveness ?? "", u.teammateType ?? "", u.strongestEvent ?? "", u.fear ?? "",
      u.eventMotivation ?? "", u.captainVoteInterest ?? "",
      u.sportsDayProfile ?? "", u.profileTagline ?? "",
      u.team ?? "", u.paymentStatus ?? "", u.accessType ?? "",
      u.shirtSize ?? "", u.shirtFit ?? "", u.contentConsent ?? "",
      u.referralCode ?? "", u.referredBy ?? "", u.referralCount ?? 0,
      u.referralRewardUnlocked ? "Yes" : "No",
      u.createdAt ? new Date(u.createdAt).toISOString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sportsday002-registrations-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredUsers.length} records`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#FF5500] font-display text-3xl tracking-widest animate-pulse">LOADING...</div>
      </div>
    );
  }

  // Step 1: Password gate (always shown first)
  if (!passwordUnlocked) {
    return <AdminPasswordGate onUnlock={() => setPasswordUnlocked(true)} />;
  }

  // Step 2: Must be logged in as admin
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-5">
        <div className="h-[2px] bg-[#FF5500] absolute top-0 left-0 right-0" />
        <img src={LOGO_URL} alt="6+1" className="h-10 w-auto mb-8" style={{ filter: "invert(1)" }} />
        <h1 className="font-display text-[#F2F0EB] text-4xl tracking-widest mb-4">ACCESS DENIED.</h1>
        <p className="font-mono text-[#555] text-sm tracking-wider mb-2">
          Admin role required. You are{isAuthenticated ? " not an admin" : " not logged in"}.
        </p>
        <p className="font-mono text-[#444] text-xs tracking-wider mb-8">
          Log in with an admin account to access this dashboard.
        </p>
        <button
          onClick={() => navigate("/")}
          className="border border-[#333] text-[#F2F0EB] font-mono text-sm tracking-widest px-8 py-4 hover:border-[#FF5500] hover:text-[#FF5500] transition-colors"
        >
          GO HOME
        </button>
      </div>
    );
  }

  const totalTeam = stats ? Object.values(stats.teams).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F2F0EB]">
      <BackNav to="/" />
      <div className="h-[2px] bg-[#FF5500]" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-4">
          <img src={LOGO_URL} alt="6+1" className="h-7 w-auto" style={{ filter: "invert(1)" }} />
          <div>
            <h1 className="font-display text-[#FF5500] text-2xl tracking-widest">ADMIN DASHBOARD</h1>
            <p className="font-mono text-[#444] text-xs tracking-wider">SPORTS DAY 002</p>
          </div>
        </div>
        <button
          onClick={exportCSV}
          className="bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest px-5 py-2 hover:bg-[#F2F0EB] transition-colors"
        >
          EXPORT CSV ↓
        </button>
      </header>

      <div className="px-6 py-6 space-y-6">

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="TOTAL REGISTERED" value={stats.total} />
            <StatCard label="PRIORITY (PAID)" value={stats.paid} accent />
            <StatCard label="FREE (LOCKED)" value={stats.free} />
            <StatCard label="TOTAL REFERRALS" value={stats.totalReferrals} />
          </div>
        )}

        {/* Team Distribution */}
        {stats && (
          <div className="border border-[#1A1A1A] p-5 bg-[#0D0D0D]">
            <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-4">TEAM DISTRIBUTION</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["red", "blue", "pink", "orange"] as const).map((team) => {
                const count = stats.teams[team] ?? 0;
                const pct = totalTeam > 0 ? Math.round((count / totalTeam) * 100) : 0;
                return (
                  <div key={team} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs tracking-wider uppercase" style={{ color: TEAM_COLORS[team] }}>
                        {team}
                      </span>
                      <span className="font-display text-xl" style={{ color: TEAM_COLORS[team] }}>
                        {count}
                      </span>
                    </div>
                    <div className="h-1 bg-[#1A1A1A]">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: TEAM_COLORS[team] }}
                      />
                    </div>
                    <span className="font-mono text-[#444] text-xs">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#1A1A1A]">
          {(["users", "health", "leaderboard", "schedule"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`font-mono text-xs tracking-[0.2em] px-6 py-3 transition-colors ${
                activeTab === tab
                  ? "text-[#FF5500] border-b-2 border-[#FF5500]"
                  : "text-[#444] hover:text-[#F2F0EB]"
              }`}
            >
              {tab === "users" ? "ALL REGISTRATIONS" : tab === "health" ? "HEALTH NOTES" : tab === "leaderboard" ? "LEADERBOARD" : "SCHEDULE"}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <input
                type="text"
                placeholder="Search name, email, instagram..."
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                className="bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-4 py-2 outline-none focus:border-[#FF5500] transition-colors placeholder:text-[#444] flex-1 min-w-48"
              />
              <FilterSelect
                value={filters.team}
                onChange={(v) => setFilters((f) => ({ ...f, team: v }))}
                options={[
                  { value: "all", label: "All Teams" },
                  { value: "red", label: "Red" },
                  { value: "blue", label: "Blue" },
                  { value: "pink", label: "Pink" },
                  { value: "orange", label: "Orange" },
                ]}
              />
              <FilterSelect
                value={filters.paymentStatus}
                onChange={(v) => setFilters((f) => ({ ...f, paymentStatus: v }))}
                options={[
                  { value: "all", label: "All Payment" },
                  { value: "paid", label: "Paid" },
                  { value: "unpaid", label: "Unpaid" },
                ]}
              />
              <FilterSelect
                value={filters.shirtSize}
                onChange={(v) => setFilters((f) => ({ ...f, shirtSize: v }))}
                options={[
                  { value: "all", label: "All Sizes" },
                  ...["XS", "S", "M", "L", "XL", "XXL"].map((s) => ({ value: s, label: s })),
                ]}
              />
              <FilterSelect
                value={filters.contentConsent}
                onChange={(v) => setFilters((f) => ({ ...f, contentConsent: v }))}
                options={[
                  { value: "all", label: "All Consent" },
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" },
                  { value: "ask", label: "Ask First" },
                ]}
              />
            </div>

            <p className="font-mono text-[#444] text-xs tracking-wider mb-3">
              {filteredUsers.length} of {allUsers.length} registrations
            </p>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ minWidth: 1400 }}>
                <thead>
                  <tr className="border-b border-[#1A1A1A]">
                    {[
                      "Name", "Email", "Instagram", "Attended", "Type", "Group",
                      "Dates", "Competitive", "Teammate", "Event", "Fear",
                      "Profile", "Tagline", "Team", "Payment", "Access",
                      "Shirt", "Consent", "Captain", "Referrals", "Signed Up",
                    ].map((h) => (
                      <th key={h} className="font-mono text-[#444] text-xs tracking-wider py-3 pr-4 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-[#0D0D0D] hover:bg-[#0D0D0D] transition-colors">
                      <td className="font-mono text-[#F2F0EB] text-xs py-3 pr-4 whitespace-nowrap">{u.fullName}</td>
                      <td className="font-mono text-[#555] text-xs py-3 pr-4 whitespace-nowrap">{u.email}</td>
                      <td className="font-mono text-[#555] text-xs py-3 pr-4">
                        {u.instagramHandle ? `@${u.instagramHandle}` : "—"}
                      </td>
                      <td className="font-mono text-xs py-3 pr-4">
                        {u.attendedBefore == null ? "—" : u.attendedBefore ? "Yes" : "No"}
                      </td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.comingType?.replace("_", " ") ?? "—"}</td>
                      <td className="font-mono text-[#FF5500] text-xs py-3 pr-4">{u.groupCode ?? "—"}</td>
                      <td className="font-mono text-xs py-3 pr-4 whitespace-nowrap">
                        {[
                          u.date4July && "4 Jul",
                          u.date11July && "11 Jul",
                          u.date18July && "18 Jul",
                          u.dateAny && "Any",
                        ].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.competitiveness ?? "—"}</td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.teammateType?.replace("_", " ") ?? "—"}</td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.strongestEvent ?? "—"}</td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.fear?.replace("_", " ") ?? "—"}</td>
                      <td className="font-mono text-[#FF5500] text-xs py-3 pr-4 whitespace-nowrap">
                        {u.sportsDayProfile ?? "—"}
                      </td>
                      <td className="font-mono text-[#555] text-xs py-3 pr-4 max-w-[160px] truncate" title={u.profileTagline ?? ""}>
                        {u.profileTagline ?? "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {u.team ? (
                          <span
                            className="font-mono text-xs px-2 py-1 uppercase"
                            style={{
                              color: TEAM_COLORS[u.team],
                              border: `1px solid ${TEAM_COLORS[u.team]}`,
                              background: `${TEAM_COLORS[u.team]}15`,
                            }}
                          >
                            {u.team}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`font-mono text-xs px-2 py-1 ${
                            u.paymentStatus === "paid"
                              ? "text-green-400 border border-green-400/30 bg-green-400/10"
                              : "text-[#444] border border-[#222]"
                          }`}
                        >
                          {u.paymentStatus ?? "unpaid"}
                        </span>
                      </td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.accessType ?? "free"}</td>
                      <td className="font-mono text-xs py-3 pr-4">
                        {u.shirtSize ?? "—"} {u.shirtFit ? `(${u.shirtFit})` : ""}
                      </td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.contentConsent ?? "—"}</td>
                      <td className="font-mono text-xs py-3 pr-4 capitalize">{u.captainVoteInterest ?? "—"}</td>
                      <td className="font-mono text-xs py-3 pr-4">
                        {u.referralCount ?? 0}{u.referralRewardUnlocked ? " 🎉" : ""}
                      </td>
                      <td className="font-mono text-[#444] text-xs py-3 pr-4 whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="py-12 text-center font-mono text-[#444] text-sm tracking-wider">
                  No registrations match your filters.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === "leaderboard" && (
          <div className="space-y-6">
            {/* Entry form */}
            <div className="border border-[#1A1A1A] p-5 bg-[#0D0D0D]">
              <p className="font-mono text-[#555] text-xs tracking-[0.3em] mb-4">ADD / UPDATE RESULT</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="font-mono text-[#444] text-[10px] tracking-wider block mb-1">EVENT</label>
                  <select
                    value={lbForm.eventName}
                    onChange={(e) => setLbForm((f) => ({ ...f, eventName: e.target.value }))}
                    className="w-full bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]"
                  >
                    {["sprint","relay","tug_of_war","obstacle","long_jump","penalty_shoot","tiebreaker"].map((e) => (
                      <option key={e} value={e} className="bg-[#111]">{e.replace(/_/g, " ").toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[#444] text-[10px] tracking-wider block mb-1">TEAM</label>
                  <select
                    value={lbForm.team}
                    onChange={(e) => setLbForm((f) => ({ ...f, team: e.target.value as "red"|"blue"|"pink"|"orange" }))}
                    className="w-full bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]"
                  >
                    {["red","blue","pink","orange"].map((t) => (
                      <option key={t} value={t} className="bg-[#111]">{t.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-mono text-[#444] text-[10px] tracking-wider block mb-1">POSITION</label>
                  <input
                    type="number"
                    min="1" max="4"
                    value={lbForm.position}
                    onChange={(e) => setLbForm((f) => ({ ...f, position: e.target.value }))}
                    placeholder="1-4"
                    className="w-full bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500] placeholder:text-[#444]"
                  />
                </div>
                <div>
                  <label className="font-mono text-[#444] text-[10px] tracking-wider block mb-1">POINTS</label>
                  <input
                    type="number"
                    value={lbForm.points}
                    onChange={(e) => setLbForm((f) => ({ ...f, points: e.target.value }))}
                    className="w-full bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lbForm.dnf}
                      onChange={(e) => setLbForm((f) => ({ ...f, dnf: e.target.checked }))}
                      className="accent-[#FF5500]"
                    />
                    <span className="font-mono text-[#F2F0EB] text-xs tracking-wider">DNF</span>
                  </label>
                </div>
                <div>
                  <label className="font-mono text-[#444] text-[10px] tracking-wider block mb-1">NOTES</label>
                  <input
                    type="text"
                    value={lbForm.notes}
                    onChange={(e) => setLbForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="Optional notes"
                    className="w-full bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500] placeholder:text-[#444]"
                  />
                </div>
              </div>
              <button
                onClick={() => upsertLb.mutate({
                  eventName: lbForm.eventName,
                  team: lbForm.team,
                  position: lbForm.position ? parseInt(lbForm.position) : undefined,
                  points: parseInt(lbForm.points) || 0,
                  dnf: lbForm.dnf,
                  notes: lbForm.notes || undefined,
                })}
                disabled={upsertLb.isPending}
                className="bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest px-6 py-3 hover:bg-[#F2F0EB] transition-colors disabled:opacity-50"
              >
                {upsertLb.isPending ? "SAVING..." : "SAVE RESULT →"}
              </button>
            </div>

            {/* Leaderboard table */}
            <div className="border border-[#1A1A1A] bg-[#0D0D0D]">
              <p className="font-mono text-[#555] text-xs tracking-[0.3em] p-4 border-b border-[#1A1A1A]">CURRENT RESULTS</p>
              {leaderboardData.length === 0 ? (
                <div className="py-8 text-center font-mono text-[#444] text-sm">No results yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#1A1A1A]">
                        {["Event","Team","Position","Points","DNF","Notes","Updated"].map((h) => (
                          <th key={h} className="font-mono text-[#444] text-xs tracking-wider py-3 px-4 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((row) => (
                        <tr key={row.id} className="border-b border-[#0D0D0D] hover:bg-[#111] transition-colors">
                          <td className="font-mono text-[#F2F0EB] text-xs py-3 px-4 capitalize">{row.eventName.replace(/_/g, " ")}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs uppercase" style={{ color: TEAM_COLORS[row.team] }}>{row.team}</span>
                          </td>
                          <td className="font-mono text-[#F2F0EB] text-xs py-3 px-4">{row.position ?? "—"}</td>
                          <td className="font-mono text-[#FF5500] text-xs py-3 px-4">{row.points ?? 0}</td>
                          <td className="font-mono text-xs py-3 px-4">{row.dnf ? <span className="text-red-400">DNF</span> : "—"}</td>
                          <td className="font-mono text-[#555] text-xs py-3 px-4 max-w-[120px] truncate">{row.notes ?? "—"}</td>
                          <td className="font-mono text-[#444] text-xs py-3 px-4 whitespace-nowrap">{new Date(row.updatedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Team totals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["red","blue","pink","orange"] as const).map((team) => {
                const pts = leaderboardData
                  .filter((r) => r.team === team && !r.dnf)
                  .reduce((sum, r) => sum + (r.points ?? 0), 0);
                return (
                  <div key={team} className="border p-4" style={{ borderColor: `${TEAM_COLORS[team]}40`, background: `${TEAM_COLORS[team]}08` }}>
                    <p className="font-mono text-xs tracking-wider uppercase mb-1" style={{ color: TEAM_COLORS[team] }}>{team}</p>
                    <p className="font-display text-3xl" style={{ color: TEAM_COLORS[team] }}>{pts}</p>
                    <p className="font-mono text-[#444] text-[10px]">TOTAL PTS</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="border border-[#FF5500]/30 bg-[#FF5500]/5 p-4">
              <p className="font-mono text-[#FF5500] text-xs tracking-[0.2em] mb-2">CURRENTLY LIVE</p>
              {liveEventData ? (
                <div className="flex items-center justify-between">
                  <p className="font-display text-[#F2F0EB] text-lg tracking-widest">{liveEventData.eventName}</p>
                  <button onClick={() => setLiveEventMutation.mutate({ id: null })} className="font-mono text-[#FF5500] text-xs border border-[#FF5500]/40 px-3 py-1 hover:bg-[#FF5500]/10 transition-colors">CLEAR LIVE</button>
                </div>
              ) : (
                <p className="font-mono text-[#444] text-xs">No event currently live.</p>
              )}
            </div>
            <div className="border border-[#1A1A1A] p-4 space-y-3">
              <p className="font-mono text-[#444] text-xs tracking-[0.2em] mb-3">ADD EVENT</p>
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Event name *" value={scheduleForm.eventName} onChange={(e) => setScheduleForm((f) => ({ ...f, eventName: e.target.value }))} className="col-span-2 bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]" />
                <input placeholder="Start time (10:00)" value={scheduleForm.startTime} onChange={(e) => setScheduleForm((f) => ({ ...f, startTime: e.target.value }))} className="bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]" />
                <input placeholder="End time (10:30)" value={scheduleForm.endTime} onChange={(e) => setScheduleForm((f) => ({ ...f, endTime: e.target.value }))} className="bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]" />
                <input placeholder="Location" value={scheduleForm.location} onChange={(e) => setScheduleForm((f) => ({ ...f, location: e.target.value }))} className="bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]" />
                <input placeholder="Sort order" type="number" value={scheduleForm.sortOrder} onChange={(e) => setScheduleForm((f) => ({ ...f, sortOrder: e.target.value }))} className="bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]" />
                <textarea placeholder="Description" value={scheduleForm.description} onChange={(e) => setScheduleForm((f) => ({ ...f, description: e.target.value }))} rows={2} className="col-span-2 bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500] resize-none" />
              </div>
              <button onClick={() => { if (!scheduleForm.eventName.trim()) { toast.error("Event name required"); return; } upsertEventMutation.mutate({ eventName: scheduleForm.eventName.trim(), startTime: scheduleForm.startTime || undefined, endTime: scheduleForm.endTime || undefined, location: scheduleForm.location || undefined, description: scheduleForm.description || undefined, sortOrder: parseInt(scheduleForm.sortOrder) || 0, isCompleted: scheduleForm.isCompleted }); }} disabled={upsertEventMutation.isPending} className="font-display text-[#0A0A0A] bg-[#FF5500] tracking-widest text-sm px-6 py-2 hover:bg-[#F2F0EB] transition-colors disabled:opacity-50">
                {upsertEventMutation.isPending ? "SAVING..." : "SAVE EVENT →"}
              </button>
            </div>
            <div className="space-y-2">
              {eventScheduleData.length === 0 ? (
                <div className="py-8 text-center font-mono text-[#444] text-xs tracking-wider">No events added yet.</div>
              ) : (
                eventScheduleData.map((ev) => (
                  <div key={ev.id} className={`border p-4 flex items-center justify-between gap-4 ${ev.isLive ? "border-[#FF5500]/50 bg-[#FF5500]/5" : "border-[#1A1A1A] bg-[#0D0D0D]"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {ev.isLive && <span className="font-mono text-[#FF5500] text-xs">● LIVE</span>}
                        {ev.isCompleted && <span className="font-mono text-[#444] text-xs">✓ DONE</span>}
                        <p className="font-display text-[#F2F0EB] tracking-widest text-sm">{ev.eventName}</p>
                      </div>
                      <p className="font-mono text-[#444] text-xs">{[ev.startTime, ev.endTime].filter(Boolean).join(" – ")}{ev.location ? ` · ${ev.location}` : ""}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!ev.isLive && <button onClick={() => setLiveEventMutation.mutate({ id: ev.id })} className="font-mono text-xs text-[#FF5500] border border-[#FF5500]/40 px-3 py-1 hover:bg-[#FF5500]/10 transition-colors">SET LIVE</button>}
                      <button onClick={() => { if (confirm("Delete this event?")) deleteEventMutation.mutate({ id: ev.id }); }} className="font-mono text-xs text-[#444] border border-[#333] px-3 py-1 hover:text-[#F2F0EB] transition-colors">DELETE</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Health Notes Tab */}
        {activeTab === "health" && (
          <div>
            <div className="border border-[#FF5500]/20 bg-[#FF5500]/5 p-4 mb-4">
              <p className="font-mono text-[#FF5500] text-xs tracking-wider">
                ⚠ CONFIDENTIAL — For event safety planning only. Do not share externally.
              </p>
            </div>

            {healthNotes.length === 0 ? (
              <div className="py-12 text-center font-mono text-[#444] text-sm tracking-wider">
                No health notes submitted.
              </div>
            ) : (
              <div className="space-y-3">
                {healthNotes.map((note) => (
                  <div key={note.id} className="border border-[#1A1A1A] p-4 bg-[#0D0D0D]">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-[#F2F0EB] text-sm">{note.fullName}</p>
                        <p className="font-mono text-[#444] text-xs">{note.email}</p>
                      </div>
                    </div>
                    <p className="font-mono text-[#F2F0EB] text-xs leading-relaxed opacity-70">
                      {note.healthNotes}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`border p-5 ${accent ? "border-[#FF5500]/30 bg-[#FF5500]/5" : "border-[#1A1A1A] bg-[#0D0D0D]"}`}>
      <p className="font-mono text-[#444] text-xs tracking-[0.2em] mb-2">{label}</p>
      <p className={`font-display text-4xl ${accent ? "text-[#FF5500]" : "text-[#F2F0EB]"}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-4 py-2 outline-none focus:border-[#FF5500] transition-colors"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-[#111]">
          {o.label}
        </option>
      ))}
    </select>
  );
}
