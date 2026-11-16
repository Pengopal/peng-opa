import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";

/** The realm's signing keys: remote in the app, local in tests. */
export type KeySource = JWTVerifyGetKey;

export const BACKCHANNEL_LOGOUT_EVENT = "http://schemas.openid.net/event/backchannel-logout";

interface Audience {
  issuer: string;
  clientId: string;
}

export function remoteKeys(jwksUrl: string): KeySource {
  return createRemoteJWKSet(new URL(jwksUrl));
}

/** An ID token from Tenantry's token endpoint, checked against the realm's keys, issuer and our client id. */
export async function verifyIdToken(token: string, keys: KeySource, { issuer, clientId }: Audience): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, keys, { issuer, audience: clientId, algorithms: ["RS256"] });
  return payload;
}

/**
 * A back-channel logout token (OpenID Connect Back-Channel Logout 1.0, section 2.6): signed by the realm, for
 * this client, at most five minutes old, carrying the logout event, no nonce, and a sid or a sub.
 */
export async function verifyLogoutToken(
  token: string,
  keys: KeySource,
  { issuer, clientId }: Audience,
): Promise<{ sid?: string; sub?: string }> {
  const { payload } = await jwtVerify(token, keys, { issuer, audience: clientId, algorithms: ["RS256"], maxTokenAge: "5m" });
  const events = payload.events as Record<string, unknown> | undefined;
  if (!events || typeof events !== "object" || !(BACKCHANNEL_LOGOUT_EVENT in events)) {
    throw new Error("logout token lacks the back-channel logout event");
  }
  if ("nonce" in payload) throw new Error("logout token must not carry a nonce");
  const sid = typeof payload.sid === "string" ? payload.sid : undefined;
  const sub = typeof payload.sub === "string" ? payload.sub : undefined;
  if (!sid && !sub) throw new Error("logout token names no sid or sub");
  return { ...(sid ? { sid } : {}), ...(sub ? { sub } : {}) };
}
