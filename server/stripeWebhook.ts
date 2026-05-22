/**
 * Stripe Webhook Handler
 *
 * Payment source of truth: Stripe
 * Unlock source of truth: Database (revealStatus field)
 * Shopify: audit/ops mirror only (Phase 2)
 *
 * Matching order:
 *   1. unlock_token (primary — survives Apple Pay / Google Pay email mismatch)
 *   2. registration_id (fallback)
 *   3. registered_email (last resort)
 *   4. unmatched_payments table (admin review)
 */

import { Request, Response } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { sportsDayRegistrations, unmatchedPayments } from "../drizzle/schema";
import { ENV } from "./_core/env";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(event: string, data: Record<string, unknown>) {
  console.log(`[Stripe Webhook] ${event}`, JSON.stringify(data));
}

async function unlockRegistration(
  db: Awaited<ReturnType<typeof getDb>>,
  registrationId: string,
  paymentIntentId: string,
  checkoutSessionId: string | null,
  paymentEmail: string | null,
  matchStatus: "matched_by_token" | "matched_by_id" | "matched_by_email",
  topName: string | null,
) {
  if (!db) return;
  await db
    .update(sportsDayRegistrations)
    .set({
      revealStatus: "unlocked",
      accessType: "priority",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: checkoutSessionId ?? undefined,
      paymentEmail: paymentEmail ?? undefined,
      paymentMatchStatus: matchStatus,
      ...(topName ? { topName, topNameLastEditedAt: new Date() } : {}),
    })
    .where(eq(sportsDayRegistrations.id, registrationId));

  log("UNLOCKED", { registrationId, paymentIntentId, matchStatus, topName });
}

async function createUnmatchedPayment(
  db: Awaited<ReturnType<typeof getDb>>,
  paymentIntentId: string,
  checkoutSessionId: string | null,
  paymentEmail: string | null,
  metadata: Record<string, string>,
  amount: number,
  currency: string,
) {
  if (!db) return;
  await db.insert(unmatchedPayments).values({
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: checkoutSessionId ?? undefined,
    paymentEmail: paymentEmail ?? undefined,
    amountPaid: amount,
    currency,
    metaUnlockToken: metadata.unlock_token ?? metadata.unlockToken ?? undefined,
    metaRegistrationId: metadata.registration_id ?? metadata.registrationId ?? undefined,
    metaRegisteredEmail: metadata.registered_email ?? metadata.registeredEmail ?? undefined,
    metaPlayerName: metadata.player_name ?? metadata.playerName ?? undefined,
    metaTopName: metadata.top_name ?? metadata.topName ?? undefined,
    createdAt: new Date(),
  });
  log("UNMATCHED_PAYMENT_CREATED", { paymentIntentId, paymentEmail, metadata });
}

// ─── Core matching logic ──────────────────────────────────────────────────────

async function handlePaymentSucceeded(
  db: Awaited<ReturnType<typeof getDb>>,
  paymentIntentId: string,
  checkoutSessionId: string | null,
  paymentEmail: string | null,
  metadata: Record<string, string>,
  amount: number,
  currency: string,
) {
  if (!db) return;

  const unlockToken = metadata.unlock_token ?? metadata.unlockToken ?? null;
  const registrationId = metadata.registration_id ?? metadata.registrationId ?? null;
  const registeredEmail = metadata.registered_email ?? metadata.registeredEmail ?? null;
  const topName = metadata.top_name ?? metadata.topName ?? null;

  log("PAYMENT_RECEIVED", {
    paymentIntentId, checkoutSessionId, paymentEmail,
    unlockToken, registrationId, registeredEmail, topName,
  });

  // 1. Match by unlock_token (primary)
  if (unlockToken) {
    const [reg] = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.unlockToken, unlockToken))
      .limit(1);

    if (reg) {
      if (reg.revealStatus === "unlocked") {
        log("ALREADY_UNLOCKED", { registrationId: reg.id, paymentIntentId });
        return;
      }
      await unlockRegistration(db, reg.id, paymentIntentId, checkoutSessionId, paymentEmail, "matched_by_token", topName);
      return;
    }
    log("TOKEN_NO_MATCH", { unlockToken });
  }

  // 2. Match by registration_id (fallback)
  if (registrationId) {
    const [reg] = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.id, registrationId))
      .limit(1);

    if (reg) {
      if (reg.revealStatus === "unlocked") {
        log("ALREADY_UNLOCKED", { registrationId: reg.id, paymentIntentId });
        return;
      }
      await unlockRegistration(db, reg.id, paymentIntentId, checkoutSessionId, paymentEmail, "matched_by_id", topName);
      return;
    }
    log("ID_NO_MATCH", { registrationId });
  }

  // 3. Match by email (last resort)
  const emailToMatch = registeredEmail ?? paymentEmail;
  if (emailToMatch) {
    const [reg] = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.email, emailToMatch))
      .limit(1);

    if (reg) {
      if (reg.revealStatus === "unlocked") {
        log("ALREADY_UNLOCKED", { registrationId: reg.id, paymentIntentId });
        return;
      }
      await unlockRegistration(db, reg.id, paymentIntentId, checkoutSessionId, paymentEmail, "matched_by_email", topName);
      return;
    }
    log("EMAIL_NO_MATCH", { emailToMatch });
  }

  // 4. No match — store for admin review
  await createUnmatchedPayment(db, paymentIntentId, checkoutSessionId, paymentEmail, metadata, amount, currency);
}

// ─── Main webhook handler ─────────────────────────────────────────────────────

export async function stripeWebhookHandler(req: Request, res: Response) {
  const stripeSecretKey = ENV.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    console.error("[Stripe Webhook] STRIPE_SECRET_KEY not configured");
    return res.status(500).json({ error: "Stripe not configured" });
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: "2026-04-22.dahlia" });
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    const sig = req.headers["stripe-signature"] as string;
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString()) as Stripe.Event;
      console.warn("[Stripe Webhook] No STRIPE_WEBHOOK_SECRET — skipping signature verification");
    }
  } catch (err) {
    console.error("[Stripe Webhook] Signature verification failed:", err);
    return res.status(400).json({ error: "Webhook signature verification failed" });
  }

  // ⚠️ Required: test event detection for Stripe webhook verification
  if (event.id.startsWith("evt_test_")) {
    log("TEST_EVENT", { eventId: event.id, type: event.type });
    return res.json({ verified: true });
  }

  log("EVENT_RECEIVED", { eventId: event.id, type: event.type });

  const db = await getDb();

  try {
    switch (event.type) {
      // ── Embedded Payment Element path ─────────────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metadata = (pi.metadata ?? {}) as Record<string, string>;
        const paymentEmail = pi.receipt_email ?? metadata.registered_email ?? null;

        await handlePaymentSucceeded(
          db, pi.id, metadata.checkout_session_id ?? null,
          paymentEmail, metadata, pi.amount, pi.currency,
        );
        break;
      }

      // ── Checkout Session path (legacy / fallback) ──────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = (session.metadata ?? {}) as Record<string, string>;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent as Stripe.PaymentIntent)?.id ?? "unknown";

        await handlePaymentSucceeded(
          db, paymentIntentId, session.id,
          session.customer_email ?? null, metadata,
          session.amount_total ?? 0, session.currency ?? "gbp",
        );
        break;
      }

      default:
        log("UNHANDLED_EVENT", { type: event.type });
    }
  } catch (err) {
    console.error("[Stripe Webhook] Processing error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  return res.json({ received: true });
}
