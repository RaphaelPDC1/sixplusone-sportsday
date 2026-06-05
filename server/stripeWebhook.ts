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
import { handleSportsDayPayment } from "./_core/klaviyo";
import { sendPurchaseEvent, extractUserDataFromRequest } from "./_core/metaConversionsApi";

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
  const updatePayload = {
    // Access/unlock fields — both must be set for consistent truth
    revealStatus: "unlocked" as const,
    paymentStatus: "paid" as const,
    accessType: "priority" as const,
    // Payment audit fields
    paidAt: new Date(),
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: checkoutSessionId ?? undefined,
    paymentEmail: paymentEmail ?? undefined,
    paymentMatchStatus: matchStatus,
    // Top name — only overwrite if provided in metadata
    ...(topName ? { topName, topNameLastEditedAt: new Date() } : {}),
  };

  await db
    .update(sportsDayRegistrations)
    .set(updatePayload)
    .where(eq(sportsDayRegistrations.id, registrationId));

  log("UNLOCKED", { registrationId, paymentIntentId, matchStatus, topName, fields: Object.keys(updatePayload) });
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
    unlockToken: unlockToken ? `${unlockToken.substring(0, 8)}...` : null,
    registrationId: registrationId ? `${registrationId.substring(0, 8)}...` : null,
    registeredEmail,
    topName,
    metadataKeys: Object.keys(metadata),
  });

  // Idempotency: check if this PaymentIntent was already processed
  const [alreadyProcessed] = await db
    .select({ id: sportsDayRegistrations.id, revealStatus: sportsDayRegistrations.revealStatus })
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (alreadyProcessed) {
    log("IDEMPOTENT_SKIP", { paymentIntentId, registrationId: alreadyProcessed.id, revealStatus: alreadyProcessed.revealStatus });
    return;
  }

  // 1. Match by unlock_token (primary — survives Apple Pay / Google Pay email mismatch)
  if (unlockToken) {
    log("MATCHING_BY_TOKEN", { unlockToken: `${unlockToken.substring(0, 8)}...` });
    const [reg] = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.unlockToken, unlockToken))
      .limit(1);

    if (reg) {
      if (reg.revealStatus === "unlocked" || reg.paymentStatus === "paid") {
        log("ALREADY_UNLOCKED", { registrationId: reg.id, paymentIntentId });
        return;
      }
      await unlockRegistration(db, reg.id, paymentIntentId, checkoutSessionId, paymentEmail, "matched_by_token", topName);
      log("DB_UPDATE_SUCCESS", { registrationId: reg.id, method: "matched_by_token" });
      // Sync to Klaviyo (non-blocking)
      handleSportsDayPayment(reg.email, reg.team).catch((err) => {
        console.error("[Stripe Webhook] Klaviyo sync failed:", err);
      });
      // Send Meta Conversions API Purchase event (non-blocking)
      sendPurchaseEvent(paymentIntentId, amount, currency, {
        email: reg.email,
        ...extractUserDataFromRequest({ headers: {} }),
      }).catch((err) => {
        console.error("[Stripe Webhook] Meta Conversions API failed:", err);
      });
      return;
    }
    log("TOKEN_NO_MATCH", { unlockToken: `${unlockToken.substring(0, 8)}...` });
  }

  // 2. Match by registration_id (fallback)
  if (registrationId) {
    log("MATCHING_BY_ID", { registrationId: `${registrationId.substring(0, 8)}...` });
    const [reg] = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.id, registrationId))
      .limit(1);

    if (reg) {
      if (reg.revealStatus === "unlocked" || reg.paymentStatus === "paid") {
        log("ALREADY_UNLOCKED", { registrationId: reg.id, paymentIntentId });
        return;
      }
      await unlockRegistration(db, reg.id, paymentIntentId, checkoutSessionId, paymentEmail, "matched_by_id", topName);
      log("DB_UPDATE_SUCCESS", { registrationId: reg.id, method: "matched_by_id" });
      // Sync to Klaviyo (non-blocking)
      handleSportsDayPayment(reg.email, reg.team).catch((err) => {
        console.error("[Stripe Webhook] Klaviyo sync failed:", err);
      });
      // Send Meta Conversions API Purchase event (non-blocking)
      sendPurchaseEvent(paymentIntentId, amount, currency, {
        email: reg.email,
        ...extractUserDataFromRequest({ headers: {} }),
      }).catch((err) => {
        console.error("[Stripe Webhook] Meta Conversions API failed:", err);
      });
      return;
    }
    log("ID_NO_MATCH", { registrationId: `${registrationId.substring(0, 8)}...` });
  }

  // 3. Match by email (last resort)
  const emailToMatch = registeredEmail ?? paymentEmail;
  if (emailToMatch) {
    log("MATCHING_BY_EMAIL", { emailToMatch });
    const [reg] = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.email, emailToMatch))
      .limit(1);

    if (reg) {
      if (reg.revealStatus === "unlocked" || reg.paymentStatus === "paid") {
        log("ALREADY_UNLOCKED", { registrationId: reg.id, paymentIntentId });
        return;
      }
      await unlockRegistration(db, reg.id, paymentIntentId, checkoutSessionId, paymentEmail, "matched_by_email", topName);
      log("DB_UPDATE_SUCCESS", { registrationId: reg.id, method: "matched_by_email" });
      // Sync to Klaviyo (non-blocking)
      handleSportsDayPayment(reg.email, reg.team).catch((err) => {
        console.error("[Stripe Webhook] Klaviyo sync failed:", err);
      });
      // Send Meta Conversions API Purchase event (non-blocking)
      sendPurchaseEvent(paymentIntentId, amount, currency, {
        email: reg.email,
        ...extractUserDataFromRequest({ headers: {} }),
      }).catch((err) => {
        console.error("[Stripe Webhook] Meta Conversions API failed:", err);
      });
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

  log("EVENT_RECEIVED", { eventId: event.id, type: event.type, livemode: event.livemode });

  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database connection failed — cannot process event", event.id);
    return res.status(500).json({ error: "Database unavailable" });
  }

  try {
    switch (event.type) {
      // ── Embedded Payment Element path ─────────────────────────────────────
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const metadata = (pi.metadata ?? {}) as Record<string, string>;
        const paymentEmail = pi.receipt_email ?? metadata.registered_email ?? null;

        log("PROCESSING_PAYMENT_INTENT", {
          paymentIntentId: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          hasMetadata: Object.keys(metadata).length > 0,
          metadataKeys: Object.keys(metadata),
        });

        await handlePaymentSucceeded(
          db, pi.id, metadata.checkout_session_id ?? null,
          paymentEmail, metadata, pi.amount, pi.currency,
        );
        log("PAYMENT_INTENT_PROCESSED", { paymentIntentId: pi.id });
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
