import { Request, Response } from "express";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { sportsDayRegistrations } from "../drizzle/schema";
import { getDb } from "./db";
import { buildPaymentKlaviyoTags } from "./sportsday.db";
import { ENV } from "./_core/env";

const stripe = new Stripe(ENV.stripeSecretKey);

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"] as string;

  let event;

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

  // Handle test events
  if (event.id.startsWith("evt_test_")) {
    console.log("[Stripe Webhook] Test event detected, returning verification response");
    return res.json({ verified: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case "payment_intent.succeeded":
        console.log("[Stripe Webhook] Payment intent succeeded:", event.data.object.id);
        break;

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error("[Stripe Webhook] Error processing event:", error);
    res.status(500).json({ error: error.message });
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  const db = await getDb();
  if (!db) {
    console.error("[Stripe Webhook] Database connection failed");
    return;
  }

  const userId = session.metadata?.user_id;
  const email = session.metadata?.email;

  if (!userId) {
    console.error("[Stripe Webhook] No user_id in metadata");
    return;
  }

  console.log(`[Stripe Webhook] Processing payment for user: ${userId}`);

  try {
    // Get the registration
    const regs = await db
      .select()
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.id, userId))
      .limit(1);

    const reg = regs[0];

    if (!reg) {
      console.error(`[Stripe Webhook] Registration not found: ${userId}`);
      return;
    }

    if (reg.paymentStatus === "paid") {
      console.log(`[Stripe Webhook] User already paid: ${userId}`);
      return;
    }

    // Update registration to mark as paid
    const updatedTags = buildPaymentKlaviyoTags(
      (reg.klaviyoTags as string[]) ?? [],
      reg.team!
    );

    await db
      .update(sportsDayRegistrations)
      .set({
        paymentStatus: "paid",
        accessType: "priority",
        revealStatus: "unlocked",
        shopifyOrderId: session.id, // Using shopifyOrderId field to store Stripe session ID
        paidAt: new Date(),
        klaviyoTags: updatedTags,
      })
      .where(eq(sportsDayRegistrations.id, userId));

    console.log(`[Stripe Webhook] Payment confirmed for user: ${userId}`);
  } catch (error: any) {
    console.error("[Stripe Webhook] Error updating registration:", error);
    throw error;
  }
}
