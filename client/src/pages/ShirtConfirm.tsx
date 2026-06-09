import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { markShirtConfirmSeen } from "@/lib/revealJourney";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

// Shirt size and fit options — must exactly match the registration questionnaire
const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const SHIRT_FITS: Array<{ val: "regular" | "oversized"; label: string }> = [
  { val: "regular", label: "REGULAR" },
  { val: "oversized", label: "OVERSIZED" },
];

export default function ShirtConfirm() {
  const [, navigate] = useLocation();
  const [userId] = useState<string | null>(
    () => (typeof window !== "undefined" ? localStorage.getItem("sd_user_id") : null)
  );

  const { data: dashboard, isLoading } = trpc.sportsday.getSportsDayDashboard.useQuery(
    { registrationId: userId! },
    { enabled: !!userId, retry: false }
  );

  const [confirmed, setConfirmed] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedFit, setSelectedFit] = useState<"regular" | "oversized" | null>(null);
  const [saving, setSaving] = useState(false);

  const updateShirtSelection = trpc.sportsday.updateShirtSelection.useMutation();

  // Initialize from dashboard
  useEffect(() => {
    if (dashboard?.shirtSize) setSelectedSize(dashboard.shirtSize);
    if (dashboard?.shirtFit) setSelectedFit(dashboard.shirtFit as "regular" | "oversized");
  }, [dashboard?.shirtSize, dashboard?.shirtFit]);

  // Guard: PAID-ONLY PAGE — only UNLOCKED_PRIORITY (paid) users can confirm shirt
  // Free users (PUBLIC_REVEAL) do not get a personalised top, redirect them to team-hub
  useEffect(() => {
    if (isLoading) return;
    if (!dashboard) return;
    if (dashboard.state === "PUBLIC_REVEAL" || dashboard.accessType !== "priority") {
      // Free users on Sports Day — redirect to team-hub
      navigate("/team-hub", { replace: true });
      return;
    }
    if (dashboard.state !== "UNLOCKED_PRIORITY") {
      navigate("/holding", { replace: true });
      return;
    }
  }, [dashboard, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConfirm() {
    if (!selectedSize || !selectedFit || !userId) return;
    setSaving(true);
    try {
      // Save updated shirt selection if changed
      if (selectedSize !== dashboard?.shirtSize || selectedFit !== dashboard?.shirtFit) {
        await updateShirtSelection.mutateAsync({
          registrationId: userId,
          shirtSize: selectedSize as "XS" | "S" | "M" | "L" | "XL" | "XXL",
          shirtFit: selectedFit,
        });
      }
      // Mark shirt confirm as seen using central state manager
      markShirtConfirmSeen(userId);
      navigate("/team-hub", { replace: true });
    } catch {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
      {/* Logo */}
      <div className="mb-8">
        <img src={LOGO_URL} alt="6+1" className="h-8 w-auto" />
      </div>

      {/* Main content */}
      <div className="w-full max-w-sm space-y-6">
        {/* Headline */}
        <div className="text-center space-y-2">
          <p className="font-mono text-[#F2F0EB]/50 text-xs tracking-[0.3em]">
            FINAL STEP
          </p>
          <h1 className="font-mono font-bold text-[#F2F0EB] text-2xl tracking-[0.15em] leading-tight">
            CONFIRM YOUR<br />TOP SELECTION.
          </h1>
        </div>

        {/* Shirt preview card */}
        <div className="border border-[#FF5500]/40 rounded-sm p-6 bg-gradient-to-br from-[#FF5500]/10 to-transparent">
          <p className="font-mono text-[#F2F0EB]/50 text-[10px] tracking-[0.25em] mb-4">
            YOUR PERSONALISED TOP
          </p>

          {/* Size and Fit display */}
          <div className="space-y-4">
            {/* Size */}
            <div>
              <p className="font-mono text-[#F2F0EB]/40 text-xs tracking-[0.2em] mb-2">
                SIZE
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 border border-[#FF5500]/60 rounded-sm px-4 py-3 bg-[#FF5500]/5">
                  <p className="font-mono font-bold text-[#FF5500] text-lg tracking-[0.2em]">
                    {selectedSize || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Fit */}
            <div>
              <p className="font-mono text-[#F2F0EB]/40 text-xs tracking-[0.2em] mb-2">
                FIT
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 border border-[#FF5500]/60 rounded-sm px-4 py-3 bg-[#FF5500]/5">
                  <p className="font-mono font-bold text-[#FF5500] text-lg tracking-[0.2em]">
                    {selectedFit || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit button */}
          <button
            onClick={() => setEditMode(!editMode)}
            className="w-full mt-4 font-mono text-[#FF5500] text-xs tracking-[0.2em] hover:text-[#FF5500]/80 transition-colors py-2 border border-[#FF5500]/30 hover:border-[#FF5500]/60 rounded-sm"
          >
            {editMode ? "CLOSE" : "CHANGE SELECTION"}
          </button>
        </div>

        {/* Edit mode: size and fit selection */}
        {editMode && (
          <div className="space-y-4 border border-[#FF5500]/20 rounded-sm p-4 bg-[#FF5500]/5">
            {/* Size selector */}
            <div>
              <p className="font-mono text-[#F2F0EB]/50 text-xs tracking-[0.2em] mb-2">
                SELECT SIZE
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SHIRT_SIZES.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className="py-2 px-3 border rounded-sm font-mono text-sm tracking-[0.15em] transition-all"
                    style={{
                      borderColor: selectedSize === size ? "#FF5500" : "rgba(255,255,255,0.1)",
                      background: selectedSize === size ? "rgba(255,85,0,0.2)" : "transparent",
                      color: selectedSize === size ? "#FF5500" : "#F2F0EB/60",
                    }}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Fit selector */}
            <div>
              <p className="font-mono text-[#F2F0EB]/50 text-xs tracking-[0.2em] mb-2">
                SELECT FIT
              </p>
              <div className="grid grid-cols-2 gap-2">
                {SHIRT_FITS.map(({ val, label }) => (
                  <button
                    key={val}
                    onClick={() => setSelectedFit(val)}
                    className="py-2 px-3 border rounded-sm font-mono text-sm tracking-[0.15em] transition-all"
                    style={{
                      borderColor: selectedFit === val ? "#FF5500" : "rgba(255,255,255,0.1)",
                      background: selectedFit === val ? "rgba(255,85,0,0.2)" : "transparent",
                      color: selectedFit === val ? "#FF5500" : "rgba(242,240,235,0.6)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Copy */}
        <div className="text-center space-y-2">
          <p className="font-mono text-[#F2F0EB]/60 text-xs leading-relaxed">
            Your personalised top will be printed and posted to you after the event.
          </p>
          <p className="font-mono text-[#F2F0EB]/40 text-[10px] tracking-[0.2em]">
            This selection cannot be changed after confirmation.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={handleConfirm}
            disabled={!selectedSize || !selectedFit}
            className="w-full font-mono font-bold text-sm tracking-[0.25em] px-8 py-3 border transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: selectedSize && selectedFit ? "#FF5500" : "rgba(255,85,0,0.3)",
              color: "#F2F0EB",
              background: selectedSize && selectedFit ? "rgba(255,85,0,0.15)" : "rgba(255,85,0,0.05)",
              boxShadow: selectedSize && selectedFit ? "0 0 20px rgba(255,85,0,0.3)" : "none",
            }}
          >
            {saving ? "SAVING..." : "CONFIRM & ENTER TEAM HUB →"}
            </button>

          {editMode && (
            <button
              onClick={() => setEditMode(false)}
              className="w-full font-mono text-[#F2F0EB]/40 text-xs tracking-[0.2em] hover:text-[#F2F0EB]/60 transition-colors py-2"
            >
              CLOSE EDITOR
            </button>
          )}
        </div>
      </div>

      {/* Scan-line texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          opacity: 0.6,
        }}
      />
    </div>
  );
}
