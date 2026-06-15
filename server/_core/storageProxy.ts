import type { Express } from "express";
import { ENV } from "./env";

// ── Image proxy for canvas use ──────────────────────────────────────────────
// Fetches /manus-storage/* images server-side and returns raw bytes with
// Access-Control-Allow-Origin: * so canvas drawImage() works without taint.
export function registerImageProxy(app: Express) {
  app.get("/api/image-proxy", async (req, res) => {
    const key = typeof req.query.key === "string" ? req.query.key : null;
    if (!key || !key.match(/^[\w\-./]+$/)) {
      res.status(400).send("Invalid key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      // Step 1: get presigned URL
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "/"));
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });
      if (!forgeResp.ok) {
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) { res.status(502).send("Empty signed URL"); return; }
      // Step 2: fetch actual image bytes server-side (no CORS restriction)
      const imgResp = await fetch(url);
      if (!imgResp.ok) { res.status(502).send("Image fetch failed"); return; }
      const contentType = imgResp.headers.get("content-type") ?? "image/png";
      const buffer = await imgResp.arrayBuffer();
      res.set("Content-Type", contentType);
      res.set("Access-Control-Allow-Origin", "*");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("[ImageProxy] failed:", err);
      res.status(502).send("Image proxy error");
    }
  });
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)["0"];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
