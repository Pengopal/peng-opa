import express from "express";
import { gunzipSync } from "node:zlib";

/** The only PostHog endpoints the browser library posts events to. Flags, recordings and scripts stay off. */
const ALLOWED = new Set(["/e/", "/e", "/i/v0/e/", "/i/v0/e", "/batch/", "/batch"]);
const MAX_BODY = 1024 * 1024;

/**
 * First-party relay for posthog-js: the browser posts to /ingest/… on this origin and this forwards it to
 * PostHog, so the CSP stays connect-src 'self' and no third-party host sees the visitor.
 * It is not an open proxy: POST only, a fixed upstream, a short list of paths, a size limit, and the body
 * must carry this installation's project key (gzip bodies are unpacked to check). No key: 404.
 */
export function ingestRelay(key: string | undefined, host: string, fetchFn: typeof fetch = fetch): express.Router {
  const router = express.Router();
  router.use(express.raw({ type: () => true, limit: MAX_BODY }));
  router.use(async (req, res) => {
    if (!key || req.method !== "POST" || !ALLOWED.has(req.path)) return res.status(404).end();
    const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (!carriesKey(raw, key)) return res.status(403).end();
    const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    const forwardedFor = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress;
    try {
      const upstream = await fetchFn(`${host}${req.path}${query}`, {
        method: "POST",
        headers: {
          "content-type": req.headers["content-type"] ?? "text/plain",
          ...(forwardedFor ? { "x-forwarded-for": String(forwardedFor) } : {}),
        },
        body: new Uint8Array(raw),
        signal: AbortSignal.timeout(10_000),
      });
      res.status(upstream.ok ? 200 : upstream.status).json({ status: upstream.ok ? 1 : 0 });
    } catch {
      res.status(502).end();
    }
  });
  // Too large, or unreadable: the same short answer, never an error page.
  router.use((err: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(err.status === 413 ? 413 : 400).end();
  });
  return router;
}

/** Reads the body the way PostHog does: gzip (spotted by its magic bytes, with or without ?compression=) or plain JSON. */
function carriesKey(raw: Buffer, key: string): boolean {
  try {
    const gzip = raw[0] === 0x1f && raw[1] === 0x8b;
    const text = gzip ? gunzipSync(raw, { maxOutputLength: 8 * MAX_BODY }).toString("utf8") : raw.toString("utf8");
    return text.includes(key);
  } catch {
    return false;
  }
}
