import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface EmailLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailLoginModal({ isOpen, onClose }: EmailLoginModalProps) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailLoginMutation = trpc.sportsday.emailLogin.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await emailLoginMutation.mutateAsync({ email });
      // Session cookie is set by the server, redirect to holding page
      navigate("/holding");
    } catch (err: any) {
      if (err.data?.code === "NOT_FOUND") {
        setError("No registration found for this email. Please register first.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#0A0A0A] border border-[#FF5500]/30 rounded-lg p-8 max-w-sm w-full mx-4">
        <h2 className="font-bebas text-2xl text-white mb-2 tracking-wider">ALREADY IN?</h2>
        <p className="text-[#999] text-sm mb-6">Enter your email to log back in</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className="bg-[#1a1a1a] border-[#FF5500]/30 text-white placeholder-[#666]"
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isLoading || !email}
              className="flex-1 bg-[#FF5500] hover:bg-[#FF6B1A] text-[#0A0A0A] font-bebas tracking-wider"
            >
              {isLoading ? "LOGGING IN..." : "LOG IN"}
            </Button>
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 bg-transparent border border-[#FF5500]/30 text-white hover:bg-[#FF5500]/10"
            >
              CANCEL
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
