import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [loading, setLoading] = useState(false);

  const emailLogin = trpc.sportsday.emailLogin.useMutation({
    onSuccess: () => {
      setStep("sent");
      toast.success("Check your email for the login link!");
      // Reset after 5 seconds
      setTimeout(() => {
        setEmail("");
        setStep("email");
        onClose();
      }, 5000);
    },
    onError: (err) => {
      toast.error(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    },
  });

  const handleRequestLink = useCallback(async () => {
    if (!email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setLoading(true);
    await emailLogin.mutateAsync({ email: email.toLowerCase() });
  }, [email, emailLogin]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-white/10 rounded-lg w-full max-w-md mx-4 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl text-white tracking-widest">
            {step === "email" ? "LOG IN" : "CHECK YOUR EMAIL"}
          </h2>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white/60 transition-colors text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {step === "email" ? (
          <>
            {/* Email input */}
            <div className="mb-6">
              <label className="block font-mono text-xs text-white/60 tracking-wider mb-3">
                YOUR EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRequestLink()}
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 px-4 py-3 font-mono text-sm focus:outline-none focus:border-[#FF5500] transition-colors"
                disabled={loading}
              />
            </div>

            {/* Submit button */}
            <button
              onClick={handleRequestLink}
              disabled={loading}
              className="w-full bg-[#FF5500] text-[#0A0A0A] font-display tracking-widest py-3 hover:bg-[#F2F0EB] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "SENDING..." : "SEND LOGIN LINK →"}
            </button>

            {/* Help text */}
            <p className="font-mono text-[10px] text-white/30 tracking-wider mt-4 text-center">
              We'll send you a magic link. Click it to log in instantly.
            </p>
          </>
        ) : (
          <>
            {/* Sent state */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
                <p className="font-mono text-sm text-[#22c55e] tracking-wider">LINK SENT</p>
              </div>
              <p className="font-mono text-white/60 text-sm mb-6">
                We've sent a login link to <span className="text-[#FF5500]">{email}</span>
              </p>
              <p className="font-mono text-[10px] text-white/40 tracking-wider">
                Check your inbox and click the link to log in. Redirecting in a moment...
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
