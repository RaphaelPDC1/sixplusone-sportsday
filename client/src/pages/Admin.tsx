import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import AdminScoring from "./AdminScoring";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { BackNav } from "@/components/ui/back-nav";
import { AdminEventPanel } from "@/components/AdminEventPanel";
import { EntrySplash } from "@/components/ui/entry-splash";


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
  const { loading } = useAuth();
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem("admin_splash_seen") !== "true"
  );
  const [passwordUnlocked, setPasswordUnlocked] = useState(
    () => sessionStorage.getItem("admin_unlocked") === "true"
  );
  const [activeTab, setActiveTab] = useState<"users" | "health" | "leaderboard" | "schedule" | "settings" | "scoring" | "attendance" | "tshirts" | "invites">("users");
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

  // Password gate is the sole access control — no OAuth role required
  const canAccess = passwordUnlocked;
  const utils = trpc.useUtils();

  const adminLogoutMutation = trpc.sportsday.adminLogout.useMutation({
    onSuccess: () => {
      sessionStorage.removeItem("admin_unlocked");
      sessionStorage.removeItem("admin_splash_seen");
      setPasswordUnlocked(false);
      navigate("/");
    },
  });

  const { data: stats } = trpc.sportsday.adminStats.useQuery(undefined, {
    enabled: canAccess,
  });

  const { data: allUsers = [] } = trpc.sportsday.adminGetRegistrations.useQuery(undefined, {
    enabled: canAccess,
  }) as { data: any[] };

  const { data: healthNotes = [] } = trpc.sportsday.adminHealthNotes.useQuery(undefined, {
    enabled: canAccess && activeTab === "health",
  });
  // Legacy leaderboard/schedule procedures removed — replaced by sd_events scoring system
  const leaderboardData: any[] = [];
  const eventScheduleData: any[] = [];
  const liveEventData: any = null;
  const refetchSchedule = () => {};
  const refetchLive = () => {};
  const setLiveEventMutation = { mutate: (_: any) => {}, isPending: false } as any;
  const upsertEventMutation = { mutate: (_: any) => {}, isPending: false } as any;
  const deleteEventMutation = { mutate: (_: any) => {}, isPending: false } as any;
  // Attendance
  const attendanceQuery = trpc.admin.getAttendance.useQuery(undefined, {
    enabled: canAccess && activeTab === "attendance",
    refetchInterval: activeTab === "attendance" ? 5000 : false,
  });
  const attendanceData: any[] = (attendanceQuery.data as any[]) ?? [];
  const refetchAttendance = attendanceQuery.refetch;
  const markAttendanceMutation = trpc.admin.markAttendance.useMutation({
    onSuccess: () => refetchAttendance(),
    onError: (e) => toast.error(e.message),
  });

  // T-shirt export
  const { data: paidUsers = [] } = trpc.admin.getPaidUsersExport.useQuery(undefined, {
    enabled: canAccess && activeTab === "tshirts",
  }) as { data: any[] };

  // Invite codes
  const inviteCodesQuery = trpc.admin.getInviteCodes.useQuery(undefined, {
    enabled: canAccess && activeTab === "invites",
  });
  const inviteCodes: any[] = (inviteCodesQuery.data as any[]) ?? [];
  const refetchInvites = inviteCodesQuery.refetch;
  const createInviteMutation = trpc.admin.createInviteCode.useMutation({
    onSuccess: (data) => {
      toast.success(`Code created: ${data.code}`);
      refetchInvites();
    },
    onError: (e) => toast.error(e.message),
  });
  const [inviteNote, setInviteNote] = useState("");
  const [inviteMaxUses, setInviteMaxUses] = useState(1);

  // Attendance helpers
  const attendanceByTeam = useMemo(() => {
    const grouped: Record<string, any[]> = { red: [], blue: [], pink: [], orange: [] };
    for (const m of attendanceData) {
      if (m.team && grouped[m.team]) grouped[m.team].push(m);
    }
    return grouped;
  }, [attendanceData]);
  const presentCounts = useMemo(() => {
    const counts: Record<string, number> = { red: 0, blue: 0, pink: 0, orange: 0 };
    for (const m of attendanceData) {
      if (m.present && m.team) counts[m.team] = (counts[m.team] ?? 0) + 1;
    }
    return counts;
  }, [attendanceData]);

  const { data: adminSettings, refetch: refetchSettings } = trpc.sportsday.adminGetSettings.useQuery(undefined, {
    enabled: canAccess,
    refetchInterval: 15_000,
  });
  const togglePopupsMutation = trpc.sportsday.adminTogglePopups.useMutation({
    onSuccess: (data) => {
      toast.success(`Pop-ups ${data.popupsEnabled ? "ENABLED" : "DISABLED"} globally`);
      refetchSettings();
    },
    onError: (e) => toast.error(e.message),
  });
  const toggleVotingMutation = trpc.sportsday.adminToggleVoting.useMutation({
    onSuccess: (data) => {
      toast.success(`Voting ${data.votingEnabled ? "ENABLED" : "DISABLED"} — power ups & fun awards`);
      refetchSettings();
    },
    onError: (e) => toast.error(e.message),
  });

  // Legacy leaderboard mutation removed
  const upsertLb = { mutate: (_: any) => {}, isPending: false } as any;

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
          u.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allUsers, filters]);

  const exportCSV = () => {
    // Only export the fields actually returned by the backend (adminGetRegistrations)
    // Columns with no data are omitted to avoid blank fields in the CSV
    const headers = [
      "ID", "Name", "Team", "Payment Status", "Shirt Size", "Content Consent", "Registered At",
    ];

    // Build active filter summary for the filename
    const activeFilters = Object.entries(filters)
      .filter(([k, v]) => k !== "search" && v !== "all")
      .map(([k, v]) => `${k}=${v}`)
      .join("_");

    const rows = filteredUsers.map((u) => [
      u.id,
      u.fullName,
      u.team ?? "",
      u.paymentStatus ?? "",
      u.shirtSize ?? "",
      u.contentConsent ?? "",
      u.createdAt ? new Date(u.createdAt).toISOString() : "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const dateSuffix = new Date().toISOString().split("T")[0];
    a.download = activeFilters
      ? `sportsday002-registrations-${activeFilters}-${dateSuffix}.csv`
      : `sportsday002-registrations-${dateSuffix}.csv`;
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

  // Password gate is the only check — no OAuth role screen needed

  const totalTeam = stats ? Object.values(stats.teams).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">
      {showSplash && <EntrySplash onComplete={() => { sessionStorage.setItem("admin_splash_seen", "true"); setShowSplash(false); }} />}
      <div className="h-[2px] bg-[#FF5500]" />

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#DDD]">
        <div className="flex items-center gap-4">
          <BackNav to="/" inline />
          <img src={LOGO_URL} alt="6+1" className="h-7 w-auto" />
          <div>
            <h1 className="font-display text-[#FF5500] text-2xl tracking-widest">ADMIN DASHBOARD</h1>
            <p className="font-mono text-[#444] text-xs tracking-wider">SPORTS DAY 002</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={exportCSV}
            className="bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest px-5 py-2 hover:bg-[#F2F0EB] transition-colors"
          >
            EXPORT CSV ↓
          </button>
          <button
            onClick={() => adminLogoutMutation.mutate()}
            className="border border-[#DDD] text-[#666] font-mono text-xs tracking-widest px-4 py-2 hover:border-[#FF5500] hover:text-[#FF5500] transition-colors"
          >
            LOGOUT
          </button>
        </div>
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
          <div className="border border-[#DDD] p-5 bg-white">
            <p className="font-mono text-[#999] text-xs tracking-[0.3em] mb-4">TEAM DISTRIBUTION</p>
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
                    <div className="h-1 bg-[#EEE]">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: TEAM_COLORS[team] }}
                      />
                    </div>
                    <span className="font-mono text-[#999] text-xs">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* ── Voting Toggle ── */}
        <div className="flex items-center justify-between px-5 py-3 border border-[#DDD] bg-white">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-[#0A0A0A] text-xs tracking-[0.2em] font-bold">⚡ POWER UP VOTING</p>
            <p className="font-mono text-[#999] text-[10px] tracking-wider mt-0.5">
              {adminSettings?.votingEnabled ? "OPEN — captains can trigger power ups" : "CLOSED — flip to open for the current event"}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className={`font-mono text-xs tracking-widest font-bold ${
              adminSettings?.votingEnabled ? "text-[#22c55e]" : "text-[#444]"
            }`}>
              {adminSettings?.votingEnabled ? "ON" : "OFF"}
            </span>
            <button
              onClick={() => toggleVotingMutation.mutate({ enabled: !adminSettings?.votingEnabled })}
              disabled={toggleVotingMutation.isPending}
              className={`relative inline-flex items-center w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none shrink-0 ${
                adminSettings?.votingEnabled ? "bg-[#22c55e]" : "bg-[#333]"
              }`}
              aria-label="Toggle voting"
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                  adminSettings?.votingEnabled ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* ── Event Scoring Panel ── */}
        <div className="border border-[#DDD] bg-white mx-0">
          <div className="px-5 py-3 border-b border-[#DDD] flex items-center gap-2">
            <span className="text-[#FF5500]">⚡</span>
            <p className="font-mono text-[#0A0A0A] text-xs tracking-[0.2em] font-bold">EVENT SCORING</p>
            <p className="font-mono text-[#999] text-[10px] tracking-wider ml-auto">SELECT EVENT · LOG POINTS · SUBMIT</p>
          </div>
          <div className="px-4 py-4">
            <AdminEventPanel />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-[#DDD] overflow-x-auto scrollbar-hide">
          {(["users", "attendance", "tshirts", "invites", "health", "scoring", "settings"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`font-mono text-xs tracking-[0.2em] px-4 md:px-6 py-3 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? "text-[#FF5500] border-b-2 border-[#FF5500]"
                  : "text-[#444] hover:text-[#F2F0EB]"
              }`}
            >
              {tab === "users" ? "REGISTRATIONS" : tab === "health" ? "HEALTH" : tab === "scoring" ? "🏆 SCORING" : tab === "settings" ? "SETTINGS" : tab === "attendance" ? "✅ ATTENDANCE" : tab === "tshirts" ? "👕 T-SHIRTS" : "🔗 INVITES"}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === "users" && (
          <div>
            {/* Filters */}
            <div className="flex flex-col md:flex-row md:flex-wrap gap-3 mb-4">
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
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#1A1A1A]">
                    {["Name", "Team", "Payment", "Shirt", "Signed Up"].map((h) => (
                      <th key={h} className="font-mono text-[#444] text-xs tracking-wider py-3 pr-6 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="border-b border-[#0D0D0D] hover:bg-[#0D0D0D] transition-colors">
                      <td className="font-mono text-[#F2F0EB] text-xs py-3 pr-6 whitespace-nowrap">{u.fullName}</td>
                      <td className="py-3 pr-6">
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
                        ) : <span className="font-mono text-[#444] text-xs">—</span>}
                      </td>
                      <td className="py-3 pr-6">
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
                      <td className="font-mono text-[#888] text-xs py-3 pr-6">
                        {u.shirtSize ?? "—"}
                      </td>
                      <td className="font-mono text-[#444] text-xs py-3 whitespace-nowrap">
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
        {activeTab === "settings" && (
          <div className="space-y-6">
            {/* Pop-up Toggle */}
            <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-[#FF5500] text-xs tracking-[0.2em] mb-1">FUNNEL POP-UPS</p>
                  <p className="font-mono text-[#444] text-[10px] tracking-wider leading-relaxed max-w-sm">
                    Enable before ads and emails go out. When on, each user gets AI-personalised pop-up copy
                    (first-visit and return-visit variants) generated from their sports profile.
                  </p>
                </div>
                <div
                  className="flex items-center gap-2 shrink-0 ml-6"
                >
                  <span className={`font-mono text-xs tracking-wider ${
                    adminSettings?.popupsEnabled ? "text-[#22c55e]" : "text-[#444]"
                  }`}>
                    {adminSettings?.popupsEnabled ? "ON" : "OFF"}
                  </span>
                  <button
                    onClick={() => togglePopupsMutation.mutate({ enabled: !adminSettings?.popupsEnabled })}
                    disabled={togglePopupsMutation.isPending}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${
                      adminSettings?.popupsEnabled ? "bg-[#22c55e]" : "bg-[#222]"
                    }`}
                    aria-label="Toggle pop-ups"
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                        adminSettings?.popupsEnabled ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {adminSettings?.popupsEnabled && (
                <div className="border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3 mt-2">
                  <p className="font-mono text-[#22c55e] text-[10px] tracking-wider">
                    ✓ Pop-ups are LIVE. Users will see personalised first-visit and return-visit pop-ups on the holding page.
                    Copy is generated by AI from each user's sports profile and cached in the DB.
                  </p>
                </div>
              )}
              {!adminSettings?.popupsEnabled && (
                <div className="border border-[#444]/20 bg-[#444]/5 px-4 py-3 mt-2">
                  <p className="font-mono text-[#444] text-[10px] tracking-wider">
                    Pop-ups are OFF. Enable before running ads or sending emails so the funnel is ready.
                  </p>
                </div>
              )}
            </div>

            {/* Voting Gate Toggle */}
            <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-mono text-[#FF5500] text-xs tracking-[0.2em] mb-1">DAY-OF VOTING GATE</p>
                  <p className="font-mono text-[#444] text-[10px] tracking-wider leading-relaxed max-w-sm">
                    Enable on the morning of Sports Day. Unlocks power up voting (captain-initiated)
                    and fun awards voting for all registered players.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-6">
                  <span className={`font-mono text-xs tracking-wider ${
                    adminSettings?.votingEnabled ? "text-[#22c55e]" : "text-[#444]"
                  }`}>
                    {adminSettings?.votingEnabled ? "ON" : "OFF"}
                  </span>
                  <button
                    onClick={() => toggleVotingMutation.mutate({ enabled: !adminSettings?.votingEnabled })}
                    disabled={toggleVotingMutation.isPending}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none ${
                      adminSettings?.votingEnabled ? "bg-[#22c55e]" : "bg-[#222]"
                    }`}
                    aria-label="Toggle voting"
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
                        adminSettings?.votingEnabled ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
              {adminSettings?.votingEnabled ? (
                <div className="border border-[#22c55e]/20 bg-[#22c55e]/5 px-4 py-3 mt-2">
                  <p className="font-mono text-[#22c55e] text-[10px] tracking-wider">
                    ✓ VOTING IS LIVE — Captains can trigger power ups. All players can vote on fun awards.
                  </p>
                </div>
              ) : (
                <div className="border border-[#444]/20 bg-[#444]/5 px-4 py-3 mt-2">
                  <p className="font-mono text-[#444] text-[10px] tracking-wider">
                    Voting is OFF. Enable on the morning of Sports Day to open power up and fun awards voting.
                  </p>
                </div>
              )}
            </div>

            {/* Info block */}
            <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-5">
              <p className="font-mono text-[#444] text-xs tracking-[0.2em] mb-3">HOW IT WORKS</p>
              <ul className="space-y-2">
                {[
                  "First-visit pop-up: shown once to users who have never seen it. Angle: this kit has a story, one-of-a-kind.",
                  "Return-visit pop-up: shown on second+ visit. Angle: you came back, early access still open but not for long.",
                  "Copy is AI-generated per user using their sports profile, teammate type, strongest event, and tagline.",
                  "Generated copy is cached in the DB — no LLM call on repeat visits.",
                  "Pop-ups only show to unpaid/locked users (LOCKED_UNPAID or RETURNING_UNPAID state).",
                  "Meta Pixel handles retargeting — no email capture needed.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 font-mono text-[#F2F0EB]/50 text-[10px] tracking-wider">
                    <span className="text-[#FF5500] shrink-0">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {activeTab === "scoring" && (
          <AdminScoring />
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div className="space-y-6">
            {/* Summary bar */}
            <div className="grid grid-cols-2 gap-3">
              {(["red", "blue", "pink", "orange"] as const).map((team) => {
                const total = attendanceByTeam[team]?.length ?? 0;
                const present = presentCounts[team] ?? 0;
                return (
                  <div key={team} className="border border-[#1A1A1A] bg-[#0D0D0D] p-4">
                    <p className="font-mono text-xs tracking-wider mb-1 uppercase" style={{ color: TEAM_COLORS[team] }}>{team}</p>
                    <p className="font-display text-3xl" style={{ color: TEAM_COLORS[team] }}>{present}<span className="text-[#444] text-lg">/{total}</span></p>
                    <p className="font-mono text-[#444] text-[10px] tracking-wider mt-1">PRESENT</p>
                  </div>
                );
              })}
            </div>

            {/* Per-team check-in lists */}
            {(["red", "blue", "pink", "orange"] as const).map((team) => {
              const members = attendanceByTeam[team] ?? [];
              return (
                <div key={team} className="border border-[#1A1A1A] bg-[#0D0D0D]">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#1A1A1A]">
                    <p className="font-mono text-xs tracking-[0.2em] uppercase" style={{ color: TEAM_COLORS[team] }}>{team} TEAM</p>
                    <p className="font-mono text-[#444] text-xs">{presentCounts[team] ?? 0}/{members.length} present</p>
                  </div>
                  <div className="divide-y divide-[#111]">
                    {members.map((m: any) => (
                      <div key={m.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="font-mono text-[#F2F0EB] text-sm">{m.fullName}</p>
                          <p className="font-mono text-[#444] text-[10px] tracking-wider">
                            {m.shirtSize ?? "?"} {m.shirtFit ?? ""} {m.accessType === "priority" ? "· PAID" : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => markAttendanceMutation.mutate({ registrationId: m.id, present: !m.present })}
                          disabled={markAttendanceMutation.isPending}
                          className={`font-mono text-xs tracking-wider px-4 py-2 border transition-colors min-w-[80px] ${
                            m.present
                              ? "border-[#22c55e] text-[#22c55e] bg-[#22c55e]/10"
                              : "border-[#333] text-[#444] hover:border-[#F2F0EB] hover:text-[#F2F0EB]"
                          }`}
                        >
                          {m.present ? "✓ HERE" : "ABSENT"}
                        </button>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="font-mono text-[#444] text-xs px-4 py-6 text-center">Loading team roster...</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* T-Shirts Tab */}
        {activeTab === "tshirts" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[#444] text-xs tracking-wider">{paidUsers.length} PAID USERS</p>
              <button
                onClick={() => {
                  const headers = ["Name", "Email", "Team", "Shirt Size", "Shirt Fit", "Top Name", "Paid At"];
                  const rows = paidUsers.map((u: any) => [
                    u.fullName, u.email ?? "", u.team ?? "", u.shirtSize ?? "", u.shirtFit ?? "", u.topName ?? "",
                    u.paidAt ? new Date(u.paidAt).toLocaleDateString() : "",
                  ]);
                  const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
                  const blob = new Blob([csv], { type: "text/csv" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a"); a.href = url; a.download = `tshirts-${new Date().toISOString().split("T")[0]}.csv`; a.click();
                  URL.revokeObjectURL(url);
                  toast.success(`Exported ${paidUsers.length} T-shirt records`);
                }}
                className="bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest px-5 py-2 hover:bg-[#F2F0EB] transition-colors"
              >
                EXPORT CSV ↓
              </button>
            </div>

            {/* Size summary */}
            <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-4">
              <p className="font-mono text-[#444] text-[10px] tracking-[0.3em] mb-3">SIZE BREAKDOWN</p>
              <div className="flex flex-wrap gap-3">
                {["XS", "S", "M", "L", "XL", "XXL"].map((size) => {
                  const count = paidUsers.filter((u: any) => u.shirtSize === size).length;
                  return (
                    <div key={size} className="border border-[#222] px-3 py-2 text-center min-w-[60px]">
                      <p className="font-display text-xl text-[#FF5500]">{count}</p>
                      <p className="font-mono text-[#444] text-[10px]">{size}</p>
                    </div>
                  );
                })}
                <div className="border border-[#222] px-3 py-2 text-center min-w-[80px]">
                  <p className="font-display text-xl text-[#444]">{paidUsers.filter((u: any) => !u.shirtSize).length}</p>
                  <p className="font-mono text-[#444] text-[10px]">NO SIZE</p>
                </div>
              </div>
            </div>

            {/* Per-team paid list */}
            {(["red", "blue", "pink", "orange"] as const).map((team) => {
              const teamPaid = paidUsers.filter((u: any) => u.team === team);
              if (teamPaid.length === 0) return null;
              return (
                <div key={team} className="border border-[#1A1A1A] bg-[#0D0D0D]">
                  <div className="px-4 py-3 border-b border-[#1A1A1A]">
                    <p className="font-mono text-xs tracking-[0.2em] uppercase" style={{ color: TEAM_COLORS[team] }}>{team} — {teamPaid.length} paid</p>
                  </div>
                  <div className="divide-y divide-[#111]">
                    {teamPaid.map((u: any) => (
                      <div key={u.id} className="px-4 py-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-mono text-[#F2F0EB] text-sm">{u.fullName}</p>
                            <p className="font-mono text-[#444] text-[10px] tracking-wider">{u.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-[#FF5500] text-sm">{u.shirtSize ?? "?"} {u.shirtFit ?? ""}</p>
                            {u.topName && <p className="font-mono text-[#555] text-[10px]">&#34;{u.topName}&#34;</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {paidUsers.length === 0 && (
              <div className="py-12 text-center font-mono text-[#444] text-sm tracking-wider">No paid users found.</div>
            )}
          </div>
        )}

        {/* Invite Codes Tab */}
        {activeTab === "invites" && (
          <div className="space-y-6">
            {/* Create new code */}
            <div className="border border-[#1A1A1A] bg-[#0D0D0D] p-5">
              <p className="font-mono text-[#FF5500] text-xs tracking-[0.2em] mb-4">CREATE INVITE LINK</p>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Note (e.g. 'For Marcus + Priya')"
                  value={inviteNote}
                  onChange={(e) => setInviteNote(e.target.value)}
                  className="w-full bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-4 py-3 outline-none focus:border-[#FF5500] transition-colors placeholder:text-[#444]"
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[#444] text-xs">MAX USES:</span>
                    <select
                      value={inviteMaxUses}
                      onChange={(e) => setInviteMaxUses(Number(e.target.value))}
                      className="bg-[#111] border border-[#222] text-[#F2F0EB] font-mono text-xs px-3 py-2 outline-none focus:border-[#FF5500]"
                    >
                      {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={() => createInviteMutation.mutate({ note: inviteNote || undefined, maxUses: inviteMaxUses })}
                    disabled={createInviteMutation.isPending}
                    className="flex-1 bg-[#FF5500] text-[#0A0A0A] font-mono text-xs tracking-widest py-3 hover:bg-[#F2F0EB] transition-colors disabled:opacity-50"
                  >
                    {createInviteMutation.isPending ? "CREATING..." : "GENERATE CODE →"}
                  </button>
                </div>
                <p className="font-mono text-[#444] text-[10px] tracking-wider leading-relaxed">
                  Share the link: <span className="text-[#FF5500]">{typeof window !== "undefined" ? window.location.origin : ""}/register?invite=LATE-XXXXXX</span><br/>
                  The code bypasses closed registration. Set max uses to control how many people can use it.
                </p>
              </div>
            </div>

            {/* Existing codes */}
            <div className="space-y-3">
              {inviteCodes.length === 0 && (
                <div className="py-12 text-center font-mono text-[#444] text-sm tracking-wider">No invite codes yet. Create one above.</div>
              )}
              {inviteCodes.map((code: any) => {
                const isUsed = code.useCount >= code.maxUses;
                const isExpired = code.expiresAt && new Date() > new Date(code.expiresAt);
                const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/register?invite=${code.code}`;
                return (
                  <div key={code.id} className={`border bg-[#0D0D0D] p-4 ${ isUsed || isExpired ? "border-[#1A1A1A] opacity-50" : "border-[#FF5500]/30" }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-mono text-[#FF5500] text-lg tracking-widest">{code.code}</p>
                        {code.note && <p className="font-mono text-[#444] text-[10px] mt-1">{code.note}</p>}
                      </div>
                      <div className="text-right">
                        <span className={`font-mono text-xs px-2 py-1 ${ isUsed || isExpired ? "text-[#444] border border-[#222]" : "text-[#22c55e] border border-[#22c55e]/30 bg-[#22c55e]/10" }`}>
                          {isExpired ? "EXPIRED" : isUsed ? "USED" : "ACTIVE"}
                        </span>
                        <p className="font-mono text-[#444] text-[10px] mt-1">{code.useCount}/{code.maxUses} uses</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-[#333] text-[10px] flex-1 truncate">{inviteUrl}</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(inviteUrl); toast.success("Link copied!"); }}
                        className="font-mono text-[#FF5500] text-[10px] tracking-wider border border-[#FF5500]/30 px-3 py-1 hover:bg-[#FF5500]/10 transition-colors shrink-0"
                      >
                        COPY
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
