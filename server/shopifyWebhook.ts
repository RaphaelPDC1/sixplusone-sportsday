import crypto from "crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { sportsDayRegistrations } from "../drizzle/schema";
import { getDb } from "./db";
import { buildPaymentKlaviyoTags, getRegistrationByEmail } from "./sportsday.db";

// In-memory store for processed webhook event IDs (idempotency)
const processedWebhooks = new Set<string>();

export function registerShopifyWebhook(app: Router) {
  // Raw body needed for HMAC verification
  app.post(
    "/api/shopify/webhook",
    // We need raw body for HMAC — express.raw() middleware
    (req, res, next) => {
      let data = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => { data += chunk; });
      req.on("end", () => {
        (req as any).rawBody = data;
        next();
      });
    },
    async (req, res) => {
      try {
        const hmacHeader = req.headers["x-shopify-hmac-sha256"] as string;
        const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

        // SECURITY: HMAC verification is mandatory (fail if missing)
        if (!webhookSecret) {
          console.error("[Shopify Webhook] SHOPIFY_WEBHOOK_SECRET not configured");
          res.status(500).json({ error: "Webhook secret not configured" });
          return;
        }

        if (!hmacHeader) {
          console.error("[Shopify Webhook] Missing HMAC header");
          res.status(401).json({ error: "Missing HMAC header" });
          return;
        }

        // SECURITY: Always verify HMAC
        const hash = crypto
          .createHmac("sha256", webhookSecret)
          .update((req as any).rawBody, "utf8")
          .digest("base64");

        if (hash !== hmacHeader) {
          console.error("[Shopify Webhook] Invalid HMAC signature");
          res.status(401).json({ error: "Invalid HMAC" });
          return;
        }

        const payload = JSON.parse((req as any).rawBody || "{}");
        const eventId = payload?.id?.toString();
        const customerEmail = payload?.customer?.email || payload?.email;
        const orderId = payload?.id?.toString();
        const orderTotal = payload?.total_price;

        // SECURITY: Check for duplicate webhook (idempotency)
        if (eventId && processedWebhooks.has(eventId)) {
          console.log(`[Shopify Webhook] Duplicate event ${eventId}, ignoring`);
          res.status(200).json({ ok: true, message: "Already processed" });
          return;
        }

        if (!customerEmail) {
          res.status(200).json({ ok: true, message: "No email found" });
          return;
        }

        // SECURITY: Verify order amount (£10 = 10.00)
        const expectedAmount = "10.00";
        if (orderTotal && orderTotal !== expectedAmount) {
          console.error(`[Shopify Webhook] Amount mismatch: expected ${expectedAmount}, got ${orderTotal}`);
          res.status(400).json({ error: "Amount mismatch" });
          return;
        }

        const db = await getDb();
        if (!db) {
          res.status(200).json({ ok: true, message: "DB unavailable" });
          return;
        }

        const reg = await getRegistrationByEmail(customerEmail);
        if (!reg) {
          res.status(200).json({ ok: true, message: "User not found" });
          return;
        }

        if (reg.paymentStatus === "paid") {
          res.status(200).json({ ok: true, message: "Already paid" });
          return;
        }

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
            shopifyOrderId: orderId ?? null,
            paidAt: new Date(),
            klaviyoTags: updatedTags,
          })
          .where(eq(sportsDayRegistrations.id, reg.id));

        // SECURITY: Mark webhook as processed
        if (eventId) {
          processedWebhooks.add(eventId);
          // Clean up old entries (keep only last 1000)
          if (processedWebhooks.size > 1000) {
            const arr = Array.from(processedWebhooks);
            arr.slice(0, arr.length - 1000).forEach(id => processedWebhooks.delete(id));
          }
        }

        console.log(`[Shopify Webhook] Payment processed for ${customerEmail}`);
        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[Shopify Webhook] Error:", err instanceof Error ? err.message : "Unknown error");
        res.status(200).json({ ok: true }); // Always 200 to Shopify
      }
    }
  );
}
