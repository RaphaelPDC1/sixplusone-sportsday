import { useEffect } from "react";
import { useLocation, useParams } from "wouter";

export default function ReferralRedirect() {
  const [, navigate] = useLocation();
  const params = useParams<{ code: string }>();

  useEffect(() => {
    if (params.code) {
      localStorage.setItem("referredBy", params.code);
    }
    navigate("/");
  }, [params.code, navigate]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-[#FF5500] font-display text-3xl tracking-widest animate-pulse">
        ENTERING THE SYSTEM...
      </div>
    </div>
  );
}
