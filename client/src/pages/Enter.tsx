import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import WarpShaderBg from "@/components/ui/warp-shader";
import StepParticles from "@/components/ui/step-particles";
import { EntrySplash } from "@/components/ui/entry-splash";

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

// Subtle palette shifts per step group — all dark orange/brand
const STEP_PALETTES: string[][] = [
  ["hsl(20,100%,4%)","hsl(22,90%,10%)","hsl(18,100%,18%)","hsl(25,80%,8%)"],
  ["hsl(20,100%,4%)","hsl(22,90%,10%)","hsl(18,100%,18%)","hsl(25,80%,8%)"],
  ["hsl(20,100%,4%)","hsl(22,90%,10%)","hsl(18,100%,18%)","hsl(25,80%,8%)"],
  ["hsl(20,100%,4%)","hsl(22,90%,10%)","hsl(18,100%,18%)","hsl(25,80%,8%)"],
  ["hsl(15,100%,5%)","hsl(20,95%,12%)","hsl(15,100%,20%)","hsl(20,85%,9%)"],
  ["hsl(15,100%,5%)","hsl(20,95%,12%)","hsl(15,100%,20%)","hsl(20,85%,9%)"],
  ["hsl(15,100%,5%)","hsl(20,95%,12%)","hsl(15,100%,20%)","hsl(20,85%,9%)"],
  ["hsl(15,100%,5%)","hsl(20,95%,12%)","hsl(15,100%,20%)","hsl(20,85%,9%)"],
  ["hsl(10,100%,5%)","hsl(15,90%,14%)","hsl(10,100%,22%)","hsl(15,80%,9%)"],
  ["hsl(10,100%,5%)","hsl(15,90%,14%)","hsl(10,100%,22%)","hsl(15,80%,9%)"],
  ["hsl(10,100%,5%)","hsl(15,90%,14%)","hsl(10,100%,22%)","hsl(15,80%,9%)"],
  ["hsl(10,100%,5%)","hsl(15,90%,14%)","hsl(10,100%,22%)","hsl(15,80%,9%)"],
  ["hsl(0,0%,3%)","hsl(20,60%,8%)","hsl(0,0%,5%)","hsl(20,50%,6%)"],
  ["hsl(0,0%,3%)","hsl(20,60%,8%)","hsl(0,0%,5%)","hsl(20,50%,6%)"],
];

export default function Enter() {
  const [, navigate] = useLocation();
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem("enter_splash_seen") !== "true"
  );
  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem("enter_splash_seen", "true");
    setShowSplash(false);
  }, []);
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
    if (step === 6) {
      if (!form.date4July && !form.date11July && !form.date18July && !form.dateAny) {
        newErrors.dates = "Select at least one date.";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step === 4 && form.comingType === "solo") {
      setDirection("forward");
      setAnimating(true);
      setTimeout(() => { setStep(6); setAnimating(false); }, 300);
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
  const palette = STEP_PALETTES[step] ?? STEP_PALETTES[0];

  const slideClass = animating
    ? direction === "forward"
      ? "opacity-0 translate-x-[-50px] scale-[0.97]"
      : "opacity-0 translate-x-[50px] scale-[0.97]"
    : "opacity-100 translate-x-0 scale-100";

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#0A0A0A]">
      {showSplash && <EntrySplash onComplete={handleSplashComplete} />}
      {/* Animated Warp shader background */}
      <WarpShaderBg colors={palette} />
      {/* Per-step particles — persistent canvas, config changes with step */}
      <StepParticles step={step} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-6 pb-4">
        <button
          onClick={() => step === 0 ? navigate("/") : goBack()}
          className="text-[#F2F0EB]/50 hover:text-[#F2F0EB] transition-colors font-mono text-sm tracking-wider"
        >
          ← BACK
        </button>
        <img src={LOGO_URL} alt="6+1" className="h-7 w-auto" style={{ filter: "invert(1)" }} />
        <span className="font-mono text-[#FF5500] text-xs tracking-wider">
          {step + 1}/{TOTAL_STEPS}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative z-10 h-[2px] bg-white/10 mx-5">
        <div
          className="h-full bg-[#FF5500] transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step content */}
      <div className="relative z-10 flex items-start justify-center px-5 pt-8 pb-12 min-h-[calc(100vh-80px)]">
        <div
          className={`w-full max-w-lg transition-all duration-300 ease-out ${slideClass}`}
          style={{ willChange: "transform, opacity" }}
        >
          {/* Glass perspective card */}
          <div
            className="bg-black/45 backdrop-blur-lg border border-white/10 p-7 md:p-10"
            style={{
              boxShadow: "0 0 80px rgba(255,85,0,0.07), 0 4px 60px rgba(0,0,0,0.7)",
              transform: "perspective(900px) rotateX(1.5deg)",
            }}
          >
            {/* Step accent */}
            <div className="absolute top-3 right-4">
              <span className="font-mono text-[#FF5500]/25 text-xs tracking-widest">
                {String(step + 1).padStart(2, "0")}
              </span>
            </div>

            {/* ─── STEP 0 — Name ─── */}
            {step === 0 && (
              <StepCard label="What's your name?" caption="First name is fine.">
                <input
                  autoFocus
                  type="text"
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  placeholder="Your name"
                  className="w-full bg-transparent border-b-2 border-white/20 focus:border-[#FF5500] outline-none text-[#F2F0EB] font-display text-3xl py-3 placeholder:text-white/20 transition-colors"
                />
                {errors.fullName && <ErrorMsg msg={errors.fullName} />}
                {form.fullName.trim() && <NextBtn onClick={handleNext} className="mt-6" />}
              </StepCard>
            )}

            {/* ─── STEP 1 — Email ─── */}
            {step === 1 && (
              <StepCard label="Your email address." caption="We'll send your team reveal link here.">
                <input
                  autoFocus
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNext()}
                  placeholder="you@example.com"
                  className="w-full bg-transparent border-b-2 border-white/20 focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-xl py-3 placeholder:text-white/20 transition-colors"
                />
                {errors.email && <ErrorMsg msg={errors.email} />}
                {form.email.trim() && <NextBtn onClick={handleNext} className="mt-6" />}
              </StepCard>
            )}

            {/* ─── STEP 2 — Instagram ─── */}
            {step === 2 && (
              <StepCard label="Instagram handle?" caption="We'll tag you when your team drops.">
                <div className="flex items-center border-b-2 border-white/20 focus-within:border-[#FF5500] transition-colors">
                  <span className="text-white/30 font-mono text-2xl py-3 mr-1">@</span>
                  <input
                    autoFocus
                    type="text"
                    value={form.instagramHandle}
                    onChange={(e) => set("instagramHandle", e.target.value.replace("@", ""))}
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    placeholder="yourhandle"
                    className="flex-1 bg-transparent outline-none text-[#F2F0EB] font-mono text-xl py-3 placeholder:text-white/20"
                  />
                </div>
                <div className="mt-6 flex gap-3">
                  <NextBtn onClick={handleNext} label="SKIP →" secondary />
                  {form.instagramHandle && <NextBtn onClick={handleNext} />}
                </div>
              </StepCard>
            )}

            {/* ─── STEP 3 — Attended before ─── */}
            {step === 3 && (
              <StepCard label="Did you come to Sports Day 001?">
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {[
                    { label: "YES, I WAS THERE", val: true, icon: "🏆" },
                    { label: "FIRST TIME", val: false, icon: "⚡" },
                  ].map(({ label, val, icon }) => (
                    <ChoiceCard
                      key={label}
                      label={label}
                      icon={icon}
                      selected={form.attendedBefore === val}
                      onClick={() => { set("attendedBefore", val); autoAdvance(); }}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* ─── STEP 4 — Solo or group ─── */}
            {step === 4 && (
              <StepCard label="Coming solo or with others?">
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {[
                    { label: "FLYING SOLO", val: "solo" as const, icon: "🎯" },
                    { label: "WITH MY CREW", val: "with_friends" as const, icon: "🤝" },
                  ].map(({ label, val, icon }) => (
                    <ChoiceCard
                      key={val}
                      label={label}
                      icon={icon}
                      selected={form.comingType === val}
                      onClick={() => {
                        set("comingType", val);
                        if (val === "solo") {
                          setTimeout(() => {
                            setDirection("forward");
                            setAnimating(true);
                            setTimeout(() => { setStep(6); setAnimating(false); }, 300);
                          }, 400);
                        } else {
                          autoAdvance();
                        }
                      }}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* ─── STEP 5 — Group code ─── */}
            {step === 5 && (
              <StepCard label="Create or join a group." caption="Groups stay together during team assignment.">
                <div className="space-y-4 mt-6">
                  <button
                    onClick={() => {
                      if (!generatedGroupCode) {
                        const code = `SD002-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
                        setGeneratedGroupCode(code);
                        set("groupCode", code);
                        set("groupRole", "creator");
                      }
                    }}
                    className={`w-full p-5 border text-left transition-all ${
                      form.groupRole === "creator"
                        ? "border-[#FF5500] bg-[#FF5500]/10"
                        : "border-white/20 hover:border-white/40"
                    }`}
                  >
                    {generatedGroupCode ? (
                      <div>
                        <div className="text-[#FF5500] font-display text-3xl tracking-widest">{generatedGroupCode}</div>
                        <div className="text-white/40 font-mono text-xs mt-1 tracking-wider">Share this with your crew</div>
                      </div>
                    ) : (
                      <span className="font-mono text-white/60 text-sm tracking-widest">CREATE A GROUP CODE →</span>
                    )}
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-[1px] bg-white/10" />
                    <span className="font-mono text-white/30 text-xs">OR</span>
                    <div className="flex-1 h-[1px] bg-white/10" />
                  </div>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={groupCodeInput}
                      onChange={(e) => {
                        setGroupCodeInput(e.target.value.toUpperCase());
                        setGroupCodeVerified(false);
                      }}
                      placeholder="ENTER A CODE"
                      className="w-full bg-transparent border border-white/20 focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-lg p-4 placeholder:text-white/20 tracking-widest transition-colors"
                    />
                    {verifyGroupCodeQuery.data?.valid && !groupCodeVerified && (
                      <button
                        onClick={() => {
                          set("groupCode", groupCodeInput);
                          set("groupRole", "joiner");
                          setGroupCodeVerified(true);
                        }}
                        className="w-full bg-[#FF5500] text-black font-display text-xl tracking-widest py-4"
                      >
                        JOIN GROUP →
                      </button>
                    )}
                    {groupCodeInput.length >= 9 && verifyGroupCodeQuery.data?.valid === false && (
                      <p className="font-mono text-[#FF5500] text-xs tracking-wider">Code not found.</p>
                    )}
                  </div>
                </div>
                {(form.groupRole === "creator" || groupCodeVerified) && (
                  <NextBtn onClick={handleNext} className="mt-6" />
                )}
                <button onClick={handleNext} className="block mt-3 font-mono text-white/30 text-xs tracking-wider hover:text-white/60 transition-colors">
                  SKIP →
                </button>
              </StepCard>
            )}

            {/* ─── STEP 6 — Date preferences ─── */}
            {step === 6 && (
              <StepCard label="Which dates work for you?" caption="Select all that apply.">
                <div className="space-y-3 mt-6">
                  {[
                    { key: "date4July" as const, label: "4 JULY 2026", sub: "Saturday" },
                    { key: "date11July" as const, label: "11 JULY 2026", sub: "Saturday" },
                    { key: "date18July" as const, label: "18 JULY 2026", sub: "Saturday" },
                    { key: "dateAny" as const, label: "ANY DATE", sub: "I'm flexible" },
                  ].map(({ key, label, sub }) => (
                    <button
                      key={key}
                      onClick={() => set(key, !form[key])}
                      className={`w-full flex items-center justify-between px-5 py-4 border transition-all active:scale-[0.98] ${
                        form[key]
                          ? "border-[#FF5500] bg-[#FF5500]/10 text-[#FF5500]"
                          : "border-white/20 text-[#F2F0EB] hover:border-white/40"
                      }`}
                    >
                      <span className="font-display text-xl tracking-widest">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs tracking-wider opacity-50">{sub}</span>
                        {form[key] && <span>✓</span>}
                      </div>
                    </button>
                  ))}
                  {errors.dates && <ErrorMsg msg={errors.dates} />}
                </div>
                {(form.date4July || form.date11July || form.date18July || form.dateAny) && (
                  <NextBtn onClick={handleNext} className="mt-6" />
                )}
              </StepCard>
            )}

            {/* ─── STEP 7 — Competitiveness ─── */}
            {step === 7 && (
              <StepCard label="How competitive are you?" caption="Be honest. We're building teams.">
                <div className="space-y-3 mt-6">
                  {[
                    { val: "vibes" as const, label: "HERE FOR THE VIBES", sub: "I just want to have fun", icon: "🌊" },
                    { val: "balanced" as const, label: "BALANCED", sub: "Win if we can, laugh if we can't", icon: "⚖️" },
                    { val: "winner" as const, label: "I CAME TO WIN", sub: "No apologies", icon: "🏆" },
                  ].map(({ val, label, sub, icon }) => (
                    <ChoiceCard
                      key={val}
                      label={label}
                      sub={sub}
                      icon={icon}
                      selected={form.competitiveness === val}
                      fullWidth
                      onClick={() => { set("competitiveness", val); autoAdvance(); }}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* ─── STEP 8 — Teammate type ─── */}
            {step === 8 && (
              <StepCard label="What kind of teammate are you?">
                <div className="space-y-3 mt-6">
                  {[
                    { val: "motivator" as const, label: "THE MOTIVATOR", sub: "Energy is my sport", icon: "📣" },
                    { val: "strategist" as const, label: "THE STRATEGIST", sub: "I'm already planning", icon: "🧠" },
                    { val: "wildcard" as const, label: "THE WILDCARD", sub: "Nobody knows what I'll do", icon: "🃏" },
                    { val: "silent_assassin" as const, label: "THE SILENT ASSASSIN", sub: "Quiet. Deadly.", icon: "🎯" },
                    { val: "energy_bringer" as const, label: "THE ENERGY BRINGER", sub: "I make it fun for everyone", icon: "⚡" },
                  ].map(({ val, label, sub, icon }) => (
                    <ChoiceCard
                      key={val}
                      label={label}
                      sub={sub}
                      icon={icon}
                      selected={form.teammateType === val}
                      fullWidth
                      onClick={() => { set("teammateType", val); autoAdvance(); }}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* ─── STEP 9 — Strongest event ─── */}
            {step === 9 && (
              <StepCard label="Where do you shine?" caption="Your strongest event type.">
                <div className="grid grid-cols-2 gap-3 mt-6">
                  {[
                    { val: "speed" as const, label: "SPEED", icon: "💨" },
                    { val: "strength" as const, label: "STRENGTH", icon: "💪" },
                    { val: "endurance" as const, label: "ENDURANCE", icon: "🔥" },
                    { val: "coordination" as const, label: "COORDINATION", icon: "🎯" },
                    { val: "vibes" as const, label: "VIBES", icon: "✨" },
                  ].map(({ val, label, icon }) => (
                    <ChoiceCard
                      key={val}
                      label={label}
                      icon={icon}
                      selected={form.strongestEvent === val}
                      onClick={() => { set("strongestEvent", val); autoAdvance(); }}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* ─── STEP 10 — Biggest fear ─── */}
            {step === 10 && (
              <StepCard label="What's your biggest fear on the day?">
                <div className="space-y-3 mt-6">
                  {[
                    { val: "sprinting" as const, label: "SPRINTING IN PUBLIC", icon: "😬" },
                    { val: "team_events" as const, label: "TEAM EVENTS", icon: "👥" },
                    { val: "letting_team_down" as const, label: "LETTING THE TEAM DOWN", icon: "😰" },
                    { val: "looking_unfit" as const, label: "LOOKING UNFIT", icon: "🥵" },
                    { val: "nothing" as const, label: "NOTHING. I'M BUILT FOR THIS.", icon: "😤" },
                  ].map(({ val, label, icon }) => (
                    <ChoiceCard
                      key={val}
                      label={label}
                      icon={icon}
                      selected={form.fear === val}
                      fullWidth
                      onClick={() => { set("fear", val); autoAdvance(); }}
                    />
                  ))}
                </div>
              </StepCard>
            )}

            {/* ─── STEP 11 — Shirt ─── */}
            {step === 11 && (
              <StepCard label="Shirt size and fit." caption="Your team kit.">
                <div className="space-y-6 mt-6">
                  <div>
                    <p className="font-mono text-white/40 text-xs tracking-widest mb-3">SIZE</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(["XS", "S", "M", "L", "XL", "XXL"] as const).map((size) => (
                        <button
                          key={size}
                          onClick={() => set("shirtSize", size)}
                          className={`py-4 border font-display text-xl tracking-widest transition-all active:scale-95 ${
                            form.shirtSize === size
                              ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                              : "border-white/20 text-[#F2F0EB] hover:border-white/40"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-white/40 text-xs tracking-widest mb-3">FIT</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { val: "regular" as const, label: "REGULAR" },
                        { val: "oversized" as const, label: "OVERSIZED" },
                      ].map(({ val, label }) => (
                        <button
                          key={val}
                          onClick={() => set("shirtFit", val)}
                          className={`py-4 border font-display text-xl tracking-widest transition-all active:scale-95 ${
                            form.shirtFit === val
                              ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                              : "border-white/20 text-[#F2F0EB] hover:border-white/40"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {(form.shirtSize && form.shirtFit) && <NextBtn onClick={handleNext} className="mt-6" />}
              </StepCard>
            )}

            {/* ─── STEP 12 — Health + Consent ─── */}
            {step === 12 && (
              <StepCard label="Almost there." caption="A few final things.">
                <div className="space-y-6 mt-4">
                  <div>
                    <p className="font-mono text-white/40 text-xs tracking-widest mb-2">
                      Any injuries, health notes, or access needs?
                    </p>
                    <textarea
                      value={form.healthNotes}
                      onChange={(e) => set("healthNotes", e.target.value)}
                      placeholder="Optional — stays private."
                      rows={3}
                      className="w-full bg-black/30 border border-white/20 focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-sm p-4 transition-colors placeholder:text-white/20 resize-none"
                    />
                  </div>
                  <div>
                    <p className="font-mono text-white/40 text-xs tracking-widest mb-3">
                      Happy for 6+1 to use photos/videos of you for social content?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: "yes" as const, label: "YES" },
                        { val: "no" as const, label: "NO" },
                        { val: "ask" as const, label: "ASK ME" },
                      ].map(({ val, label }) => (
                        <button
                          key={val}
                          onClick={() => set("contentConsent", val)}
                          className={`py-4 border font-display text-lg tracking-widest transition-all active:scale-95 ${
                            form.contentConsent === val
                              ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                              : "border-white/20 text-[#F2F0EB] hover:border-white/40"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-white/40 text-xs tracking-widest mb-3">
                      Would you vote for team captains on Instagram?
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: "yes" as const, label: "YES" },
                        { val: "no" as const, label: "NO" },
                        { val: "maybe" as const, label: "MAYBE" },
                      ].map(({ val, label }) => (
                        <button
                          key={val}
                          onClick={() => set("captainVoteInterest", val)}
                          className={`py-4 border font-display text-lg tracking-widest transition-all active:scale-95 ${
                            form.captainVoteInterest === val
                              ? "border-[#FF5500] text-[#FF5500] bg-[#FF5500]/10"
                              : "border-white/20 text-[#F2F0EB] hover:border-white/40"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <NextBtn onClick={handleNext} className="mt-6" />
              </StepCard>
            )}

            {/* ─── STEP 13 — Motivation + Submit ─── */}
            {step === 13 && (
              <StepCard label="What would make this worth it?" caption="Optional — but we're listening.">
                <textarea
                  value={form.eventMotivation}
                  onChange={(e) => set("eventMotivation", e.target.value)}
                  placeholder="Tell us..."
                  rows={4}
                  className="w-full bg-black/30 border border-white/20 focus:border-[#FF5500] outline-none text-[#F2F0EB] font-mono text-sm p-4 mt-4 transition-colors placeholder:text-white/20 resize-none"
                />
                <button
                  onClick={handleSubmit}
                  disabled={registerMutation.isPending}
                  className="w-full mt-8 bg-[#FF5500] text-[#0A0A0A] font-display text-2xl tracking-widest py-5 hover:bg-[#F2F0EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {registerMutation.isPending ? "ENTERING THE SYSTEM..." : "ENTER THE SYSTEM →"}
                </button>
                <p className="font-mono text-white/20 text-xs text-center mt-4 tracking-wider">
                  By submitting, you agree to be contacted about Sports Day 002.
                </p>
              </StepCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepCard({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2
        className="font-display text-[#F2F0EB] leading-tight mb-1"
        style={{ fontSize: "clamp(1.7rem, 5.5vw, 2.8rem)", letterSpacing: "0.02em" }}
      >
        {label}
      </h2>
      {caption && (
        <p className="font-mono text-white/40 text-xs tracking-widest mb-2">{caption}</p>
      )}
      {children}
    </div>
  );
}

function ChoiceCard({
  label,
  sub,
  icon,
  selected,
  onClick,
  fullWidth = false,
}: {
  label: string;
  sub?: string;
  icon?: string;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${fullWidth ? "w-full" : ""} flex items-start gap-3 p-4 border text-left transition-all active:scale-[0.97] ${
        selected
          ? "border-[#FF5500] bg-[#FF5500]/10"
          : "border-white/15 hover:border-white/35 bg-white/[0.02]"
      }`}
    >
      {icon && <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>}
      <div className="min-w-0">
        <div
          className={`font-display tracking-widest leading-tight ${selected ? "text-[#FF5500]" : "text-[#F2F0EB]"}`}
          style={{ fontSize: "clamp(0.85rem, 3vw, 1.1rem)" }}
        >
          {selected && "✓ "}{label}
        </div>
        {sub && <div className="font-mono text-white/30 text-xs mt-0.5 tracking-wider">{sub}</div>}
      </div>
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
          ? "border border-white/20 text-white/40 hover:border-white/40 hover:text-white/70"
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
