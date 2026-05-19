/**
 * PaymentForm — Embedded Stripe Payment Element
 *
 * Renders a full Stripe Payment Element (card, Apple Pay, Google Pay) inline
 * in the app. No popup, no redirect. On success, calls onSuccess() so the
 * parent can poll the backend for unlock confirmation.
 */

import { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, Lock } from "lucide-react";

// Initialise Stripe once — outside component to avoid re-creating on render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "");

// ─── Inner form (must be inside <Elements>) ──────────────────────────────────

interface InnerFormProps {
  displayPrice: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function InnerForm({ displayPrice, onSuccess, onCancel }: InnerFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // No redirect — we handle success in-app
        return_url: window.location.href,
      },
      // Don't redirect after payment — handle result here
      redirect: "if_required",
    });

    if (error) {
      // Show user-friendly error
      if (error.type === "card_error" || error.type === "validation_error") {
        setErrorMessage(error.message ?? "Payment failed. Please check your card details.");
      } else {
        setErrorMessage("Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
    } else {
      // Payment succeeded — notify parent to poll for webhook unlock
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Stripe Payment Element */}
      <div
        className={`transition-opacity duration-300 ${isReady ? "opacity-100" : "opacity-0"}`}
      >
        <PaymentElement
          onReady={() => setIsReady(true)}
          options={{
            layout: "tabs",
            wallets: {
              applePay: "auto",
              googlePay: "auto",
            },
          }}
        />
      </div>

      {/* Loading skeleton while Stripe loads */}
      {!isReady && (
        <div className="space-y-3 animate-pulse">
          <div className="h-12 bg-white/5 rounded-lg" />
          <div className="h-12 bg-white/5 rounded-lg" />
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      {/* Trust badges */}
      <div className="flex items-center gap-2 text-xs text-white/40">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Secured by Stripe. We never store your card details.</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 pt-1">
        <Button
          type="submit"
          disabled={!stripe || !elements || isSubmitting || !isReady}
          className="w-full bg-orange-500 hover:bg-orange-400 text-black font-bold text-base py-6 rounded-xl disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Pay {displayPrice} — Unlock My Player Pack
            </span>
          )}
        </Button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="text-sm text-white/40 hover:text-white/60 transition-colors py-1"
        >
          Cancel — keep my registration
        </button>
      </div>
    </form>
  );
}

// ─── Outer wrapper — fetches clientSecret then mounts Elements ───────────────

interface PaymentFormProps {
  uid: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({ uid, onSuccess, onCancel }: PaymentFormProps) {
  const createIntent = trpc.sportsday.createPaymentIntent.useMutation();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [displayPrice, setDisplayPrice] = useState("£25");
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    createIntent.mutateAsync({ uid })
      .then((result) => {
        setClientSecret(result.clientSecret);
        setDisplayPrice(result.displayPrice);
      })
      .catch((err) => {
        if (err?.message === "ALREADY_UNLOCKED") {
          // Already paid — parent should handle this
          onSuccess();
        } else {
          setInitError("Unable to initialise payment. Please try again.");
          console.error("[PaymentForm] createPaymentIntent error:", err);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (initError) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {initError}
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-white/40 hover:text-white/60 transition-colors"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="flex items-center justify-center py-12 gap-3 text-white/40 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Setting up secure payment…
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#f97316", // orange-500
            colorBackground: "#1a1a1a",
            colorText: "#ffffff",
            colorDanger: "#ef4444",
            fontFamily: "inherit",
            borderRadius: "8px",
            spacingUnit: "4px",
          },
          rules: {
            ".Input": {
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#ffffff",
            },
            ".Input:focus": {
              border: "1px solid rgba(249,115,22,0.6)",
              boxShadow: "0 0 0 2px rgba(249,115,22,0.2)",
            },
            ".Label": {
              color: "rgba(255,255,255,0.6)",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            },
            ".Tab": {
              backgroundColor: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.7)",
            },
            ".Tab--selected": {
              backgroundColor: "rgba(249,115,22,0.15)",
              border: "1px solid rgba(249,115,22,0.4)",
              color: "#f97316",
            },
          },
        },
      }}
    >
      <InnerForm
        displayPrice={displayPrice}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
