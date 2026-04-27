import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "/manus-storage/logo-61_f0639c6b.webp";

type FormData = {
  fullName: string;
  email: string;
  instagramHandle: string;
  attendedBefore: boolean | null;
  comingType: "solo" | "with_friends" | null;
  groupCode: string;
  groupRole: "creator" | "joiner" | null;
  date4July: boolean;
  date11July: boolean;
  date18July: boolean;
  dateAny: boolean;
  competitiveness: "vibes" | "balanced" | "winner" | null;
  teammateType: "motivator" | "strategist" | "wildcard" | "silent_assassin" | "energy_bringer" | null;
  strongestEvent: "speed" | "strength" | "endurance" | "coordination" | "vibes" | null;
  fear: "sprinting" | "team_events" | "letting_team_down" | "looking_unfit" | "nothing" | null;
  shirtSize: "XS" | "S" | "M" | "L" | "XL" | "XXL" | null;
  shirtFit: "regular" | "oversized" | null;
  healthNotes: string;
  contentConsent: "yes" | "no" | "ask" | null;
  captainVoteInterest: "yes" | "no" | "maybe" | null;
  eventMotivation: string;
};

const TOTAL_STEPS = 14;

export default function Enter() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animating, setAnimating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatedGroupCode, setGeneratedGroupCode] = useState("");
  const [groupCodeInput, setGroupCodeInput] = useState("");
  const [groupCodeVerified, setGroupCodeVerified] = useState(false);

  const [form, setForm] = useState<FormData>({
    fullName: "",
    email: "",
    instagramHandle: "",
    attendedBefore: null,
    comingType: null,
    groupCode: "",
    groupRole: null,
    date4July: false,
    date11July: false,
    date18July: false,
    dateAny: false,
    competitiveness: null,
    teammateType: null,
    strongestEvent: null,
    fear: null,
    shirtSize: null,
    shirtFit: null,
    healthNotes: "",
    contentConsent: null,
    captainVoteInterest: null,
    eventMotivation: "",
  });

  // Get referral code from localStorage
  const referredBy = typeof window !== "undefined" ? localStorage.getItem("referredBy") ?? undefined : undefined;

  const registerMutation = trpc.sportsday.register.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("sd_user_id", data.id);
      localStorage.setItem("sd_referral_code", data.referralCode);
      navigate("/holding");
    },
    onError: (err) => {
      if (err.message.includes("already registered")) {
        toast.error("This email is already registered. Check your inbox.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    },
  });

  const verifyGroupCodeQuery = trpc.sportsday.verifyGroupCode.useQuery(
    { code: groupCodeInput },
    { enabled: groupCodeInput.length >= 9 }
  );

  const goNext = useCallback(() => {
    if (animating) return;
    setDirection("forward");
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
      setAnimating(false);
    }, 300);
  }, [animating]);

  const goBack = useCallback(() => {
    if (animating || step === 0) return;
    setDirection("back");
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => Math.max(s - 1, 0));
      setAnimating(false);
    }, 300);
  }, [animating, step]);

  const autoAdvance = useCallback((afterDelay = 400) => {
    setTimeout(goNext, afterDelay);
  }, [goNext]);

  const set = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 0 && !form.fullName.trim()) newErrors.fullName = "Name is required.";
    if (step === 1) {
      if (!form.email.trim()) newErrors.email = "Email is required.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Enter a valid email.";
    }
    if (step === 5) {
      if (!form.date4July && !form.date11July && !form.date18July && !form.dateAny) {
        newErrors.dates = "Select at least one date.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    // Skip group sub-step if solo
    if (step === 4 && form.comingType === "solo") {
      setDirection("forward");
      setAnimating(true);
      setTimeout(() => { setStep(5); setAnimating(false); }, 300);
      return;
    }
    goNext();
  };

  const handleSubmit = async () => {
    await registerMutation.mutateAsync({
      fullName: form.fullName,
      email: form.email,
      instagramHandle: form.instagramHandle || undefined,
      attendedBefore: form.attendedBefore ?? undefined,
      comingType: form.comingType ?? undefined,
      groupCode: form.groupCode || undefined,
      groupRole: form.groupRole ?? undefined,
      date4July: form.date4July,
      date11July: form.date11July,
      date18July: form.date18July,
      dateAny: form.dateAny,
      competitiveness: form.competitiveness ?? undefined,
      teammateType: form.teammateType ?? undefined,
      strongestEvent: form.strongestEvent ?? undefined,
      fear: form.fear ?? undefined,
      eventMotivation: form.eventMotivation || undefined,
      captainVoteInterest: form.captainVoteInterest ?? undefined,
      shirtSize: form.shirtSize ?? undefined,
      shirtFit: form.shirtFit ?? undefined,
      healthNotes: form.healthNotes || undefined,
      contentConsent: form.contentConsent ?? undefined,
      referredBy,
    });
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const slideClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-[-40px]"
      : "opacity-0 translate-x-[40px]"
    : "opacity-100 translate-x-0";

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => step === 0 ? navigate("/") : goBack()}
          className="text-[#F2F0EB] opacity-50 hover:opacity-100 transition-opacity font-mono text-sm tracking-wider"
        >
          ← {step === 0 ? "BACK" : "BACK"}
        </button>
        <img src={LOGO_URL} alt="6+1" className="h-7 w-auto" style={{ filter: "invert(1)" }} />
        <span className="font-mono text-[#FF5500] text-xs tracking-wider">
          {step + 1}/{TOTAL_STEPS}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-[#1A1A1A] mx-5">
        <div
          className="h-full bg-[#FF5500] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 flex flex-col justify-center px-5 py-8">
        <div
          className={`transition-all duration-300 ease-out ${slideClass}`}
          style={{ willChange: "transform, opacity" }}
        >
          {/* STEP 0 — Name */}
          {step === 0 && (
            <StepWrapper label="What's your name?">
              <input
                autoFocus
                type="text"
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                placeholder="Full name"
                className="w-full bg-transparent border-b-2 border-[#333] focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-xl py-3 transition-colors placeholder:text-[#444]"
              />
              {errors.fullName && <ErrorMsg msg={errors.fullName} />}
              {form.fullName.trim() && <NextBtn onClick={handleNext} />}
            </StepWrapper>
          )}

          {/* STEP 1 — Email */}
          {step === 1 && (
            <StepWrapper label="Your email address">
              <input
                autoFocus
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
                placeholder="you@example.com"
                className="w-full bg-transparent border-b-2 border-[#333] focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-xl py-3 transition-colors placeholder:text-[#444]"
              />
              {errors.email && <ErrorMsg msg={errors.email} />}
              {form.email.trim() && <NextBtn onClick={handleNext} />}
            </StepWrapper>
          )}

          {/* STEP 2 — Instagram */}
          {step === 2 && (
            <StepWrapper label="Instagram handle" caption="We'll tag you when your team drops.">
              <div className="flex items-center border-b-2 border-[#333] focus-within:border-[#FF5500] transition-colors">
                <span className="text-[#555] font-mono text-xl py-3 mr-1">@</span>
                <input
                  autoFocus
                  type="text"
                  value={form.instagramHandle}
                  onChange={(e) => set("instagramHandle", e.target.value.replace("@", ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  placeholder="yourhandle"
                  className="flex-1 bg-transparent outline-none text-[#F2F0EB] font-mono text-xl py-3 placeholder:text-[#444]"
                />
              </div>
              <div className="mt-6 flex gap-3">
                <NextBtn onClick={handleNext} label="SKIP →" secondary />
                {form.instagramHandle && <NextBtn onClick={handleNext} />}
              </div>
            </StepWrapper>
          )}

          {/* STEP 3 — Attended before */}
          {step === 3 && (
            <StepWrapper label="Did you come to Sports Day 001?">
              <div className="flex gap-4 mt-4">
                {(["YES", "NO"] as const).map((opt) => (
                  <SelectCard
                    key={opt}
                    label={opt}
                    selected={
                      (opt === "YES" && form.attendedBefore === true) ||
                      (opt === "NO" && form.attendedBefore === false)
                    }
                    onClick={() => {
                      set("attendedBefore", opt === "YES");
                      autoAdvance();
                    }}
                  />
                ))}
              </div>
            </StepWrapper>
          )}

          {/* STEP 4 — Solo or group */}
          {step === 4 && (
            <StepWrapper label="Are you coming solo or with others?">
              <div className="flex gap-4 mt-4">
                {(["SOLO", "WITH FRIENDS"] as const).map((opt) => (
                  <SelectCard
                    key={opt}
                    label={opt}
                    selected={
                      (opt === "SOLO" && form.comingType === "solo") ||
                      (opt === "WITH FRIENDS" && form.comingType === "with_friends")
                    }
                    onClick={() => {
                      const val = opt === "SOLO" ? "solo" : "with_friends";
                      set("comingType", val);
                      if (val === "solo") {
                        setTimeout(() => {
                          setDirection("forward");
                          setAnimating(true);
                          setTimeout(() => { setStep(5); setAnimating(false); }, 300);
                        }, 400);
                      } else {
                        autoAdvance();
                      }
                    }}
                  />
                ))}
              </div>
            </StepWrapper>
          )}

          {/* STEP 4b — Group code */}
          {step === 4 && form.comingType === "with_friends" && false /* handled by step 5 */ && null}

          {/* STEP 5 — Group code (only if with_friends) */}
          {step === 5 && form.comingType === "with_friends" && (
            <StepWrapper label="Create or join a friend group">
              <div className="flex flex-col gap-4 mt-4">
                <button
                  onClick={() => {
                    const code = `SD002-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
                    setGeneratedGroupCode(code);
                    set("groupCode", code);
                    set("groupRole", "creator");
                  }}
                  className="w-full border border-[#333] hover:border-[#FF5500] text-[#F2F0EB] font-mono py-5 text-sm tracking-widest transition-colors text-left px-5"
                >
                  {generatedGroupCode ? (
                    <div>
                      <div className="text-[#FF5500] font-display text-2xl">{generatedGroupCode}</div>
                      <div className="text-[#555] text-xs mt-1">Share this code with your friends</div>
                    </div>
                  ) : (
                    "CREATE A GROUP CODE →"
                  )}
                </button>

                <div className="relative">
                  <div className="h-[1px] bg-[#222] my-2" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0A0A0A] px-3 text-[#444] font-mono text-xs">OR</span>
                </div>

                <div>
                  <input
                    type="text"
                    value={groupCodeInput}
                    onChange={(e) => {
                      setGroupCodeInput(e.target.value.toUpperCase());
                      set("groupCode", e.target.value.toUpperCase());
                      set("groupRole", "joiner");
                    }}
                    placeholder="SD002-XXX"
                    className="w-full bg-transparent border-b-2 border-[#333] focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-xl py-3 transition-colors placeholder:text-[#444]"
                  />
                  {groupCodeInput.length >= 9 && (
                    <div className="mt-2 text-xs font-mono">
                      {verifyGroupCodeQuery.data?.valid ? (
                        <span className="text-[#FF5500]">✓ Code valid — {verifyGroupCodeQuery.data.memberCount} member(s)</span>
                      ) : (
                        <span className="text-red-500">Code not found</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <NextBtn onClick={handleNext} className="mt-6" />
            </StepWrapper>
          )}

          {/* STEP 5 (solo) or STEP 6 (with_friends) — Date preference */}
          {((step === 5 && form.comingType !== "with_friends") || step === 6) && (
            <StepWrapper label="Which date works for you?" caption="Select all that apply">
              <div className="flex flex-col gap-3 mt-4">
                {[
                  { key: "date4July" as const, label: "Saturday 4 July 2026" },
                  { key: "date11July" as const, label: "Saturday 11 July 2026" },
                  { key: "date18July" as const, label: "Saturday 18 July 2026" },
                  { key: "dateAny" as const, label: "I'll make any of them work" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => set(key, !form[key])}
                    className={`w-full text-left px-5 py-4 border font-mono text-sm tracking-wider transition-all ${
                      form[key]
                        ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                        : "border-[#333] text-[#F2F0EB] hover:border-[#555]"
                    }`}
                  >
                    {form[key] ? "✓ " : "  "}{label}
                  </button>
                ))}
              </div>
              {errors.dates && <ErrorMsg msg={errors.dates} />}
              <NextBtn onClick={handleNext} className="mt-6" />
            </StepWrapper>
          )}

          {/* Personality steps — we normalise step numbers */}
          {/* STEP 7 — Competitiveness */}
          {step === 7 && (
            <StepWrapper label="How competitive are you?">
              <div className="flex flex-col gap-3 mt-4">
                {[
                  { val: "vibes" as const, label: "JUST HERE FOR VIBES", emoji: "😌" },
                  { val: "balanced" as const, label: "BALANCED", emoji: "⚖️" },
                  { val: "winner" as const, label: "I WANT TO WIN", emoji: "🏆" },
                ].map(({ val, label, emoji }) => (
                  <SelectCard
                    key={val}
                    label={`${emoji}  ${label}`}
                    selected={form.competitiveness === val}
                    onClick={() => { set("competitiveness", val); autoAdvance(); }}
                    fullWidth
                  />
                ))}
              </div>
            </StepWrapper>
          )}

          {/* STEP 8 — Teammate type */}
          {step === 8 && (
            <StepWrapper label="What type of teammate are you?">
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { val: "motivator" as const, label: "MOTIVATOR" },
                  { val: "strategist" as const, label: "STRATEGIST" },
                  { val: "wildcard" as const, label: "WILDCARD" },
                  { val: "silent_assassin" as const, label: "SILENT ASSASSIN" },
                  { val: "energy_bringer" as const, label: "ENERGY BRINGER" },
                ].map(({ val, label }) => (
                  <SelectCard
                    key={val}
                    label={label}
                    selected={form.teammateType === val}
                    onClick={() => { set("teammateType", val); autoAdvance(); }}
                    className={val === "energy_bringer" ? "col-span-2" : ""}
                  />
                ))}
              </div>
            </StepWrapper>
          )}

          {/* STEP 9 — Strongest event */}
          {step === 9 && (
            <StepWrapper label="Your strongest event type?">
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { val: "speed" as const, label: "SPEED" },
                  { val: "strength" as const, label: "STRENGTH" },
                  { val: "endurance" as const, label: "ENDURANCE" },
                  { val: "coordination" as const, label: "COORDINATION" },
                  { val: "vibes" as const, label: "PURE VIBES" },
                ].map(({ val, label }) => (
                  <SelectCard
                    key={val}
                    label={label}
                    selected={form.strongestEvent === val}
                    onClick={() => { set("strongestEvent", val); autoAdvance(); }}
                    className={val === "vibes" ? "col-span-2" : ""}
                  />
                ))}
              </div>
            </StepWrapper>
          )}

          {/* STEP 10 — Fear */}
          {step === 10 && (
            <StepWrapper label="What scares you most?">
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { val: "sprinting" as const, label: "SPRINTING" },
                  { val: "team_events" as const, label: "TEAM EVENTS" },
                  { val: "letting_team_down" as const, label: "LETTING THE TEAM DOWN" },
                  { val: "looking_unfit" as const, label: "LOOKING UNFIT" },
                  { val: "nothing" as const, label: "NOTHING" },
                ].map(({ val, label }) => (
                  <SelectCard
                    key={val}
                    label={label}
                    selected={form.fear === val}
                    onClick={() => { set("fear", val); autoAdvance(); }}
                    className={val === "nothing" ? "col-span-2" : ""}
                  />
                ))}
              </div>
            </StepWrapper>
          )}

          {/* STEP 11 — Shirt */}
          {step === 11 && (
            <StepWrapper label="Preferred shirt size">
              <div className="flex flex-wrap gap-3 mt-4">
                {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => set("shirtSize", size)}
                    className={`px-6 py-4 border font-display text-xl tracking-wider transition-all ${
                      form.shirtSize === size
                        ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                        : "border-[#333] text-[#F2F0EB] hover:border-[#555]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="mt-6">
                <p className="font-mono text-[#555] text-xs tracking-wider mb-3">FIT PREFERENCE</p>
                <div className="flex gap-4">
                  {(["REGULAR", "OVERSIZED"] as const).map((fit) => (
                    <SelectCard
                      key={fit}
                      label={fit}
                      selected={form.shirtFit === (fit.toLowerCase() as "regular" | "oversized")}
                      onClick={() => set("shirtFit", fit.toLowerCase() as "regular" | "oversized")}
                    />
                  ))}
                </div>
              </div>
              {(form.shirtSize || form.shirtFit) && <NextBtn onClick={handleNext} className="mt-6" />}
            </StepWrapper>
          )}

          {/* STEP 12 — Health + Consent */}
          {step === 12 && (
            <StepWrapper label="Almost there." caption="A few final things.">
              <div className="space-y-6 mt-4">
                <div>
                  <p className="font-mono text-[#555] text-xs tracking-wider mb-2">
                    Any injuries, health notes, or access needs?
                  </p>
                  <textarea
                    value={form.healthNotes}
                    onChange={(e) => set("healthNotes", e.target.value)}
                    placeholder="Optional — stays private."
                    rows={3}
                    className="w-full bg-[#111] border border-[#333] focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-sm p-3 transition-colors placeholder:text-[#444] resize-none"
                  />
                </div>

                <div>
                  <p className="font-mono text-[#555] text-xs tracking-wider mb-3">
                    Happy for 6+1 to use photos/videos of you for social content?
                  </p>
                  <div className="flex gap-3">
                    {[
                      { val: "yes" as const, label: "YES, GO AHEAD" },
                      { val: "no" as const, label: "NO THANKS" },
                      { val: "ask" as const, label: "ASK ME FIRST" },
                    ].map(({ val, label }) => (
                      <button
                        key={val}
                        onClick={() => set("contentConsent", val)}
                        className={`flex-1 py-3 border font-mono text-xs tracking-wider transition-all ${
                          form.contentConsent === val
                            ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                            : "border-[#333] text-[#F2F0EB] hover:border-[#555]"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[#555] text-xs tracking-wider mb-3">
                    Would you vote for team captains on Instagram?
                  </p>
                  <div className="flex gap-3">
                    {(["YES", "NO", "MAYBE"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => set("captainVoteInterest", opt.toLowerCase() as "yes" | "no" | "maybe")}
                        className={`flex-1 py-3 border font-mono text-xs tracking-wider transition-all ${
                          form.captainVoteInterest === opt.toLowerCase()
                            ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                            : "border-[#333] text-[#F2F0EB] hover:border-[#555]"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <NextBtn onClick={handleNext} className="mt-6" />
            </StepWrapper>
          )}

          {/* STEP 13 — Final / Submit */}
          {step === 13 && (
            <StepWrapper label="What would make Sports Day 002 worth attending for you?" caption="Optional — but we're listening.">
              <textarea
                value={form.eventMotivation}
                onChange={(e) => set("eventMotivation", e.target.value)}
                placeholder="Tell us..."
                rows={4}
                className="w-full bg-[#111] border border-[#333] focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-sm p-3 mt-4 transition-colors placeholder:text-[#444] resize-none"
              />

              <button
                onClick={handleSubmit}
                disabled={registerMutation.isPending}
                className="w-full mt-8 bg-[#FF5500] text-[#0A0A0A] font-display text-2xl tracking-widest py-5 hover:bg-[#F2F0EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registerMutation.isPending ? "ENTERING THE SYSTEM..." : "ENTER THE SYSTEM →"}
              </button>

              <p className="font-mono text-[#444] text-xs text-center mt-4 tracking-wider">
                By submitting, you agree to be contacted about Sports Day 002.
              </p>
            </StepWrapper>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepWrapper({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-lg mx-auto w-full">
      <h2
        className="font-display text-[#F2F0EB] mb-2"
        style={{ fontSize: "clamp(1.8rem, 6vw, 3rem)", letterSpacing: "0.03em" }}
      >
        {label}
      </h2>
      {caption && (
        <p className="font-mono text-[#555] text-xs tracking-wider mb-4">{caption}</p>
      )}
      {children}
    </div>
  );
}

function SelectCard({
  label,
  selected,
  onClick,
  fullWidth,
  className = "",
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`${fullWidth ? "w-full" : "flex-1"} ${className} px-5 py-5 border font-mono text-sm tracking-wider text-left transition-all active:scale-95 ${
        selected
          ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
          : "border-[#333] text-[#F2F0EB] hover:border-[#555]"
      }`}
    >
      {selected && <span className="mr-2">✓</span>}
      {label}
    </button>
  );
}

function NextBtn({
  onClick,
  label = "NEXT →",
  secondary = false,
  className = "",
}: {
  onClick: () => void;
  label?: string;
  secondary?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`${className} ${
        secondary
          ? "border border-[#333] text-[#555] hover:border-[#555] hover:text-[#F2F0EB]"
          : "bg-[#FF5500] text-[#0A0A0A] hover:bg-[#F2F0EB]"
      } font-display text-xl tracking-widest px-8 py-4 transition-all active:scale-95`}
    >
      {label}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="font-mono text-[#FF5500] text-xs mt-2 tracking-wider">{msg}</p>
  );
}
