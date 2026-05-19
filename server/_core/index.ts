import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerShopifyWebhook } from "../shopifyWebhook";
import { handleStripeWebhook } from "../stripeWebhook";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // SECURITY: Add security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        // Scripts: self + inline + Stripe (all versions) + Facebook Pixel + analytics
        "script-src 'self' 'unsafe-inline' https://js.stripe.com https://connect.facebook.net https://manus-analytics.com",
        // Stripe iframes (Payment Element renders inside iframes)
        "frame-src https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
        // Styles: self + inline + Google Fonts
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Fonts: self + Google Fonts CDN
        "font-src 'self' https://fonts.gstatic.com",
        // Images: self + data URIs + blob + any https/http (CDN storage, Facebook pixel)
        "img-src 'self' data: blob: https: http:",
        // XHR/fetch: self + Stripe API + analytics
        "connect-src 'self' https://api.stripe.com https://manus-analytics.com wss: ws:",
        // Workers (Stripe uses service workers)
        "worker-src blob:",
      ].join("; ")
    );
    next();
  });
  
  // SECURITY: Configure body parser with reasonable size limit (10MB instead of 50MB)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerShopifyWebhook(app);
  
  // Stripe webhook — must use raw body for signature verification
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Warn if optional secrets are missing (non-fatal)
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) {
    console.warn("WARNING: ADMIN_PASSWORD is not set. Admin login will be disabled.");
  }
  if (process.env.NODE_ENV === "production" && !process.env.SHOPIFY_WEBHOOK_SECRET) {
    console.warn("WARNING: SHOPIFY_WEBHOOK_SECRET is not set. Webhook HMAC verification will reject all requests.");
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
