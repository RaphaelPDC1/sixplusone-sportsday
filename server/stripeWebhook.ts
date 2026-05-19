import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { sportsDayRegistrations, unmatchedPayments } from "../drizzle/schema";
import { getDb } from "./db";
import { buildPaymentKlaviyoTags } from "./sportsday.db";
import { ENV } from "./_core/env";

const stripe = new Stripe(ENV.stripeSecretKey);

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      ENV.stripeWebhookSecret
    );
  } catch (err: any) {
    console.error("[Stripe Webhook] Signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── CRITICAL: Handle test events ─────────────────────────────────────────
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  console.log(`[Stripe Webhook] Event received: ${event.type} | id: ${event.id}`);

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "payment_intent.succeeded":
        // Primary unlock path for embedded Payment Element (no checkout session)
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error processing event:", error);
    // Always return 200 to Stripe to prevent retries on our processing errors
    res.json({ received: true, error: error.message });
  }
}

// ── Token-based matching with fallback chain ──────────────────────────────────
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database connection failed");
    return;
  }

  const sessionId = session.id;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  const paymentEmail = session.customer_details?.email ?? session.customer_email ?? null;
  const amountTotal = session.amount_total ?? 0;
  const currency = (session.currency ?? "gbp").toUpperCase();

  // Extract metadata
  const unlockToken = session.metadata?.unlock_token ?? null;
  const registrationId = session.metadata?.registration_id ?? session.metadata?.user_id ?? null;
  const registeredEmail = session.metadata?.registered_email ?? session.metadata?.email ?? null;

  console.log(
    `[Stripe Webhook] checkout.session.completed | session: ${sessionId} | ` +
    `paymentEmail: ${paymentEmail} | unlockToken: ${unlockToken ?? "none"} | ` +
    `registrationId: ${registrationId ?? "none"}`
  );

  // ── Idempotency: skip if session already processed ─────────────────────────
  const alreadyProcessed = await db
    .select({ id: sportsDayRegistrations.id })
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.stripeCheckoutSessionId, sessionId))
    .limit(1);

  if (alreadyProcessed.length > 0) {
    console.log(`[Stripe Webhook] Session ${sessionId} already processed — skipping`);
    return;
  }

  // ── Matching chain ─────────────────────────────────────────────────────────
  let reg: typeof sportsDayRegistrations.$inferSelect | null = null;
  let matchMethod: "matched_by_token" | "matched_by_id" | "matched_by_email" | "unmatched" =
    "unmatched";

  // 1. Match by unlock_token (primary — most reliable, survives email changes)
  if (unlockToken) {
    const rows = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.unlockToken, unlockToken))
      .limit(1);
    if (rows.length > 0) {
      reg = rows[0];
      matchMethod = "matched_by_token";
      console.log(`[Stripe Webhook] Matched by token: ${reg.id}`);
    }
  }

  // 2. Fallback: match by registration_id
  if (!reg && registrationId) {
    const rows = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.id, registrationId))
      .limit(1);
    if (rows.length > 0) {
      reg = rows[0];
      matchMethod = "matched_by_id";
      console.log(`[Stripe Webhook] Matched by registration_id: ${reg.id}`);
    }
  }

  // 3. Fallback: match by registered email from metadata
  if (!reg && registeredEmail) {
    const rows = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.email, registeredEmail.toLowerCase()))
      .limit(1);
    if (rows.length > 0) {
      reg = rows[0];
      matchMethod = "matched_by_email";
      console.log(`[Stripe Webhook] Matched by registered email: ${reg.id}`);
    }
  }

  // 4. Fallback: match by payment email (if different from registered)
  if (!reg && paymentEmail) {
    const rows = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.email, paymentEmail.toLowerCase()))
      .limit(1);
    if (rows.length > 0) {
      reg = rows[0];
      matchMethod = "matched_by_email";
      console.log(`[Stripe Webhook] Matched by payment email: ${reg.id}`);
    }
  }

  // ── No match: store in unmatched_payments for admin review ────────────────
  if (!reg) {
    console.warn(
      `[Stripe Webhook] UNMATCHED PAYMENT | session: ${sessionId} | ` +
      `paymentEmail: ${paymentEmail} | amount: ${amountTotal} ${currency}`
    );
    try {
      await db.insert(unmatchedPayments).values({
        eventId: "sports_day_002",
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId,
        paymentEmail: paymentEmail ?? "unknown",
        amountPaid: amountTotal,
        currency,
        metadata: session.metadata as Record<string, string>,
      });
    } catch (insertErr: any) {
      // Might be a duplicate insert on retry — log and continue
      console.error("[Stripe Webhook] Failed to insert unmatched payment:", insertErr.message);
    }
    return;
  }

  // ── Idempotency: skip if already unlocked ─────────────────────────────────
  if (
    reg.revealStatus === "unlocked" ||
    reg.accessType === "priority" ||
    reg.paidAt != null
  ) {
    console.log(`[Stripe Webhook] Registration ${reg.id} already unlocked — skipping`);
    return;
  }

  // ── Unlock the registration ────────────────────────────────────────────────
  const updatedTags = buildPaymentKlaviyoTags(
    (reg.klaviyoTags as string[]) ?? [],
    reg.team as "red" | "blue" | "pink" | "orange"
  );

  await db
    .update(sportsDayRegistrations)
    .set({
      paymentStatus: "paid",
      accessType: "priority",
      revealStatus: "unlocked",
      paidAt: new Date(),
      stripeCheckoutSessionId: sessionId,
      stripePaymentIntentId: paymentIntentId,
      paymentEmail: paymentEmail,
      paymentMatchStatus: matchMethod,
      klaviyoTags: updatedTags,
    })
    .where(eq(sportsDayRegistrations.id, reg.id));

  console.log(
    `[Stripe Webhook] ✅ Unlocked registration ${reg.id} | ` +
    `match: ${matchMethod} | session: ${sessionId} | ` +
    `paymentEmail: ${paymentEmail} | registeredEmail: ${reg.email}`
  );
}

// ── Handle payment_intent.succeeded (embedded Payment Element flow) ───────────
// This is the primary unlock path when using the embedded Stripe Payment Element.
// Unlike checkout.session.completed, there is no session object — we match by
// unlock_token in the PaymentIntent metadata.
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database connection failed");
    return;
  }

  const paymentIntentId = paymentIntent.id;
  const amountPaid = paymentIntent.amount;
  const currency = (paymentIntent.currency ?? "gbp").toUpperCase();
  const paymentEmail = paymentIntent.receipt_email ?? null;

  // Extract metadata
  const unlockToken = paymentIntent.metadata?.unlock_token ?? null;
  const registrationId = paymentIntent.metadata?.registration_id ?? null;
  const registeredEmail = paymentIntent.metadata?.registered_email ?? null;

  console.log(
    `[Stripe Webhook] payment_intent.succeeded | intent: ${paymentIntentId} | ` +
    `paymentEmail: ${paymentEmail} | unlockToken: ${unlockToken ?? "none"} | ` +
    `registrationId: ${registrationId ?? "none"}`
  );

  // ── Idempotency: skip if already processed by this payment intent ─────────
  const alreadyProcessed = await db
    .select({ id: sportsDayRegistrations.id })
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.stripePaymentIntentId, paymentIntentId))
    .limit(1);

  if (alreadyProcessed.length > 0) {
    const existing = alreadyProcessed[0];
    const existingReg = await db
      .select({ revealStatus: sportsDayRegistrations.revealStatus })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.id, existing.id))
      .limit(1);
    if (existingReg[0]?.revealStatus === "unlocked") {
      console.log(`[Stripe Webhook] PaymentIntent ${paymentIntentId} already processed — skipping`);
      return;
    }
  }

  // ── Match registration: token → registration_id → email ──────────────────
  let reg: typeof sportsDayRegistrations.$inferSelect | null = null;
  let matchMethod: "matched_by_token" | "matched_by_id" | "matched_by_email" | "unmatched" = "unmatched";

  // 1. Match by unlock_token (primary — survives Apple Pay / Google Pay email mismatch)
  if (unlockToken) {
    const rows = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.unlockToken, unlockToken))
      .limit(1);
    if (rows.length > 0) {
      reg = rows[0];
      matchMethod = "matched_by_token";
      console.log(`[Stripe Webhook] Matched by unlock_token: ${unlockToken}`);
    }
  }

  // 2. Fallback: match by registration_id
  if (!reg && registrationId) {
    const rows = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.id, registrationId))
      .limit(1);
    if (rows.length > 0) {
      reg = rows[0];
      matchMethod = "matched_by_id";
      console.log(`[Stripe Webhook] Matched by registration_id: ${registrationId}`);
    }
  }

  // 3. Fallback: match by registered email
  if (!reg && registeredEmail) {
    const rows = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.email, registeredEmail))
      .limit(1);
    if (rows.length > 0) {
      reg = rows[0];
      matchMethod = "matched_by_email";
      console.log(`[Stripe Webhook] Matched by registered_email: ${registeredEmail}`);
    }
  }

  // 4. No match — store as unmatched payment for admin review
  if (!reg) {
    console.warn(`[Stripe Webhook] ⚠️ No registration match for PaymentIntent ${paymentIntentId}`);
    await db.insert(unmatchedPayments).values({
      eventId: "sports_day_002",
      // Use a prefixed intent ID so it doesn't collide with real checkout session IDs
      stripeCheckoutSessionId: `pi_${paymentIntentId}`,
      stripePaymentIntentId: paymentIntentId,
      paymentEmail: paymentEmail ?? "unknown",
      amountPaid,
      currency,
      metadata: {
        ...(paymentIntent.metadata as Record<string, unknown>),
        source: "payment_intent.succeeded",
        unlockToken: unlockToken ?? null,
        registrationId: registrationId ?? null,
        registeredEmail: registeredEmail ?? null,
      },
    });
    return;
  }

  // ── Idempotency: skip if already unlocked ─────────────────────────────────
  if (
    reg.revealStatus === "unlocked" ||
    reg.accessType === "priority" ||
    reg.paidAt != null
  ) {
    console.log(`[Stripe Webhook] Registration ${reg.id} already unlocked — skipping`);
    return;
  }

  // ── Unlock the registration ────────────────────────────────────────────────
  const updatedTags = buildPaymentKlaviyoTags(
    (reg.klaviyoTags as string[]) ?? [],
    reg.team as "red" | "blue" | "pink" | "orange"
  );

  await db
    .update(sportsDayRegistrations)
    .set({
      paymentStatus: "paid",
      accessType: "priority",
      revealStatus: "unlocked",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
      paymentEmail: paymentEmail,
      paymentMatchStatus: matchMethod,
      klaviyoTags: updatedTags,
    })
    .where(eq(sportsDayRegistrations.id, reg.id));

  console.log(
    `[Stripe Webhook] ✅ Unlocked registration ${reg.id} via payment_intent.succeeded | ` +
    `match: ${matchMethod} | intent: ${paymentIntentId} | ` +
    `paymentEmail: ${paymentEmail} | registeredEmail: ${reg.email}`
  );
}
