/**
 * PaymentForm
 *
 * Embedded Stripe Payment Element — no popup, no redirect.
 * The payment form lives directly on the holding page.
 */

import { useState, useEffect } from "react";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { loadStripe, type Stripe as StripeType } from "@stripe/stripe-js";

// ─── Stripe singleton ─────────────────────────────────────────────────────────

let stripePromise: Promise<StripeType | null> | null = null;

function getStripePromise() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
    if (!key) {
      console.error("[PaymentForm] VITE_STRIPE_PUBLISHABLE_KEY not set");
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(key);
    }
  }
  return stripePromise;
}

// ─── Inner form (must be inside <Elements>) ───────────────────────────────────

interface InnerFormProps {
  amount: number;
  currency: string;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

function InnerPaymentForm({ amount, currency, onPaymentSuccess, onCancel }: InnerFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorMsg("");

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/holding?payment_confirmed=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMsg(error.message ?? "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      onPaymentSuccess();
    }
  };

  const formattedAmount = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-black/20 border border-white/10 rounded-lg p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
          }}
        />
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm font-mono">{errorMsg}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={processing || !stripe || !elements}
        className="w-full bg-[#FF5500] hover:bg-[#FF5500]/90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-mono text-sm tracking-widest uppercase py-4 transition-all"
      >
        {processing ? "PROCESSING…" : `PAY ${formattedAmount} — UNLOCK MY PLAYER PACK`}
      </button>

      <button
        type="button"
        onClick={onCancel}
        disabled={processing}
        className="w-full text-[#F2F0EB]/40 hover:text-[#F2F0EB]/70 font-mono text-xs tracking-widest uppercase py-2 transition-colors"
      >
        Cancel — keep my registration
      </button>

      <p className="text-[#F2F0EB]/25 text-xs text-center font-mono">
        Secured by Stripe · Your registration is safe either way
      </p>
    </form>
  );
}

// ─── Outer wrapper ────────────────────────────────────────────────────────────

interface PaymentFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export function PaymentForm({
  clientSecret,
  amount,
  currency,
  onPaymentSuccess,
  onCancel,
}: PaymentFormProps) {
  const [stripeReady, setStripeReady] = useState(false);

  useEffect(() => {
    getStripePromise().then((s) => {
      if (s) setStripeReady(true);
      else console.error("[PaymentForm] Stripe failed to load");
    });
  }, []);

  if (!stripeReady) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-[#F2F0EB]/40 font-mono text-xs tracking-widest animate-pulse">
          LOADING PAYMENT FORM…
        </div>
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripePromise()}
      options={{
        clientSecret,
        appearance: {
          theme: "night",
          variables: {
            colorPrimary: "#FF5500",
            colorBackground: "#0a0a0a",
            colorText: "#F2F0EB",
            colorDanger: "#ef4444",
            fontFamily: "monospace",
            borderRadius: "4px",
          },
        },
      }}
    >
      <InnerPaymentForm
        amount={amount}
        currency={currency}
        onPaymentSuccess={onPaymentSuccess}
        onCancel={onCancel}
      />
    </Elements>
  );
}
