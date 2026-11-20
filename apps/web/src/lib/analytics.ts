import posthog from "posthog-js/dist/module.slim.no-external";
import type { CaptureResult } from "posthog-js/dist/module.slim.no-external";

/**
 * Product analytics (PostHog EU), set up to need no consent banner:
 * - no cookies or storage: ids live in memory for one page load;
 * - events go to /ingest on this origin (the server relays them), so the CSP stays 'self';
 * - no autocapture, recordings, surveys, flags or scripts loaded from PostHog;
 * - Do Not Track and Global Privacy Control are honoured;
 * - URLs lose their query (except utm_* tags) and invite tokens before they leave the browser.
 * Signed-in people are identified by their user id only, never their email or name.
 * The key comes from /api/config; without one nothing starts.
 */

const URL_PROPS = [
  "$current_url",
  "$pathname",
  "$referrer",
  "$initial_referrer",
  "$initial_current_url",
  "$initial_pathname",
  "$prev_pageview_pathname",
  "$session_entry_url",
  "$session_entry_pathname",
  "$session_entry_referrer",
];
const UTM = new Set(["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]);
/** Paths that carry a secret: the token is replaced before the path is sent anywhere. */
const SECRET_PATHS = [/^(\/invite\/)[^/?#]+/];

/** A URL or path without its secrets: no query except utm_* tags, no hash, no invite token. */
export function cleanUrl(value: string): string {
  if (value === "$direct") return value;
  let url: URL;
  try {
    url = new URL(value, "http://relative.invalid");
  } catch {
    return value;
  }
  let path = url.pathname;
  for (const re of SECRET_PATHS) path = path.replace(re, "$1[token]");
  const kept = [...url.searchParams].filter(([k]) => UTM.has(k));
  const query = kept.length ? `?${new URLSearchParams(kept)}` : "";
  const origin = url.origin === "http://relative.invalid" ? "" : url.origin;
  return `${origin}${path}${query}`;
}

function cleanProps(props: Record<string, unknown> | undefined) {
  if (!props) return;
  for (const k of URL_PROPS) if (typeof props[k] === "string") props[k] = cleanUrl(props[k] as string);
}

/** Pengopal's sites share one PostHog project; every event says which product it came from. */
const PRODUCT = "pengopal-opa";

/** Runs on every event before it leaves the browser: tags the product and cleans the URLs. */
export function cleanEvent(event: CaptureResult | null): CaptureResult | null {
  if (!event) return event;
  event.properties.product = PRODUCT;
  cleanProps(event.properties);
  cleanProps(event.$set);
  cleanProps(event.$set_once);
  return event;
}

let started = false;
let pendingUser: string | undefined;

function optedOut(): boolean {
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.globalPrivacyControl === true || n.doNotTrack === "1";
}

export function startAnalytics(key: string | null | undefined): void {
  if (started || !key || optedOut()) return;
  started = true;
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://eu.posthog.com",
    persistence: "memory",
    person_profiles: "identified_only",
    capture_pageview: "history_change",
    capture_pageleave: true,
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_heatmaps: false,
    capture_exceptions: false,
    capture_performance: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_web_experiments: true,
    advanced_disable_flags: true,
    disable_external_dependency_loading: true,
    respect_dnt: true,
    before_send: cleanEvent,
  });
  if (pendingUser) identifyUser(pendingUser);
}

/** Joins this visit to the signed-in user (by id only). Safe to call on every navigation. */
export function identifyUser(userId: string): void {
  pendingUser = userId;
  if (!started || posthog.get_distinct_id() === userId) return;
  posthog.identify(userId);
}

/** After sign-out: the next events belong to a new anonymous visitor. */
export function forgetUser(): void {
  pendingUser = undefined;
  if (started) posthog.reset();
}
