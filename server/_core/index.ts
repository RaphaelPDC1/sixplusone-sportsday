import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy, registerImageProxy } from "./storageProxy";
import { registerShopifyWebhook } from "../shopifyWebhook";
import { stripeWebhookHandler } from "../stripeWebhook";
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
    // Allow Stripe.js, Google Fonts, and CDN images for the payment form
    res.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://js.stripe.com https://js.stripe.com/v3/ https://dahlia.js.stripe.com https://*.stripe.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "frame-src https://js.stripe.com https://hooks.stripe.com https://*.stripe.com",
        "connect-src 'self' https://api.stripe.com https://r.stripe.com https://*.stripe.com https://apple.com https://*.apple.com",
        "img-src 'self' data: https: blob:",
      ].join("; ")
    );
    next();
  });
  
  // ⚠️ Stripe webhook MUST use raw body — register BEFORE express.json()
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

  // Static map proxy — fetches Google Static Maps using server-side API key
  app.get("/api/static-map", async (req, res) => {
    try {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.ai";
      const apiKey = process.env.BUILT_IN_FORGE_API_KEY || "";
      const { center = "53.3718,-1.5046", zoom = "15", size = "600x260", maptype = "roadmap", markers = "" } = req.query as Record<string, string>;
      const params = new URLSearchParams({ center, zoom, size, scale: "2", maptype, key: apiKey });
      if (markers) params.set("markers", markers);
      const mapUrl = `${forgeUrl}/v1/maps/proxy/maps/api/staticmap?${params.toString()}`;
      const response = await fetch(mapUrl);
      if (!response.ok) {
        res.status(502).json({ error: "Map fetch failed", status: response.status });
        return;
      }
      const contentType = response.headers.get("content-type") || "image/png";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (err) {
      res.status(500).json({ error: "Map proxy error" });
    }
  });

  // SECURITY: Configure body parser with reasonable size limit (10MB instead of 50MB)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  registerStorageProxy(app);
  registerImageProxy(app);
  registerOAuthRoutes(app);
  registerShopifyWebhook(app);
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
