import express from "express";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The web app's own scripts only, API calls to this host, never framed. Monaco needs inline styles. */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Content-Security-Policy": CSP,
};

/** Every response: security headers, and no "X-Powered-By: Express". */
export function useSecurityHeaders(server: express.Express) {
  server.disable("x-powered-by");
  server.use((_req, res, next) => {
    res.set(SECURITY_HEADERS);
    next();
  });
}

// A name with an extension, or any dotfile path: a file that isn't there, not a page of the app.
const FILE_LIKE = /\.[A-Za-z0-9]+$|\/\./;

/**
 * Serves the built web app. Unknown page paths get index.html, where the router shows its own
 * "Page not found"; a missing file (/.env, /wp-login.php, /app.js.map) is a plain 404.
 */
export function serveWebApp(server: express.Express, dist: string, apiPaths: RegExp) {
  // Read once: the page routes then never touch the disk.
  const indexHtml = readFileSync(join(dist, "index.html"), "utf8");
  server.use(express.static(dist, { index: false, maxAge: "1h" }));
  server.get("{*splat}", (req, res, next) => {
    if (apiPaths.test(req.path)) return next();
    if (FILE_LIKE.test(req.path)) return res.status(404).type("text/plain").send("Not found");
    res.type("html").send(indexHtml);
  });
}
