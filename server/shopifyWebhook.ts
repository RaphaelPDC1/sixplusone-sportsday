import crypto from "crypto";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { sportsDayRegistrations } from "../drizzle/schema";
import { getDb } from "./db";
import { buildPaymentKlaviyoTags, getRegistrationByEmail } from "./sportsday.db";

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

        if (webhookSecret && hmacHeader) {
          const hash = crypto
            .createHmac("sha256", webhookSecret)
            .update((req as any).rawBody, "utf8")
            .digest("base64");

          if (hash !== hmacHeader) {
            res.status(401).json({ error: "Invalid HMAC" });
            return;
          }
        }

        const payload = JSON.parse((req as any).rawBody || "{}");
        const customerEmail = payload?.customer?.email || payload?.email;
        const orderId = payload?.id?.toString();

        if (!customerEmail) {
          res.status(200).json({ ok: true, message: "No email found" });
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

        res.status(200).json({ ok: true });
      } catch (err) {
        console.error("[Shopify Webhook] Error:", err);
        res.status(200).json({ ok: true }); // Always 200 to Shopify
      }
    }
  );
}
