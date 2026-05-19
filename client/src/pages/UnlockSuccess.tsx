import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { BackNav } from "@/components/ui/back-nav";

const LOGO_URL = "/manus-storage/logo-61_bea00c75.webp";

export default function UnlockSuccess() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const uid = params.get("uid") || localStorage.getItem("sd_user_id");
  const orderId = params.get("ref") || undefined;

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  const confirmMutation = trpc.sportsday.confirmPayment.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setStatus("success");
        setTimeout(() => navigate("/reveal"), 1500);
      } else {
        setStatus("error");
      }
    },
    onError: () => {
      setStatus("error");
    },
  });

  useEffect(() => {
    if (!uid) {
      navigate("/enter");
      return;
    }
    confirmMutation.mutate({ uid, orderId });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col px-5">
      <div className="h-[2px] bg-[#FF5500]" />
      <header className="flex items-center justify-between py-5">
        <BackNav to="/holding" inline />
        <img src={LOGO_URL} alt="6+1" className="h-12 w-auto" style={{ filter: "invert(1)" }} />
        <div className="w-16" />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center">

      {status === "verifying" && (
        <div className="text-center">
          <div className="font-display text-[#FF5500] text-5xl tracking-widest mb-4 animate-pulse">
            VERIFYING
          </div>
          <p className="font-mono text-[#555] text-sm tracking-wider">
            Confirming payment...
          </p>
          <div className="mt-8 flex gap-2 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-[#FF5500] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="text-center">
          <div className="font-display text-[#FF5500] text-5xl tracking-widest mb-4">
            PAYMENT CONFIRMED.
          </div>
          <p className="font-mono text-[#F2F0EB] opacity-60 text-sm tracking-wider">
            Your reveal is loading...
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="text-center">
          <div className="font-display text-[#F2F0EB] text-4xl tracking-widest mb-4">
            SOMETHING WENT WRONG.
          </div>
          <p className="font-mono text-[#555] text-sm tracking-wider mb-8">
            Payment may still be processing. Give it a moment, then check back.
          </p>
          <button
            onClick={() => navigate("/holding")}
            className="border border-[#FF5500] text-[#FF5500] font-mono text-sm tracking-widest px-8 py-4 hover:bg-[#FF5500]/10 transition-colors"
          >
            ← BACK TO HOLDING
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
