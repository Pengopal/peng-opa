import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { BACKCHANNEL_LOGOUT_EVENT, verifyIdToken, verifyLogoutToken, type KeySource } from "./tokens.js";

const issuer = "http://auth.tenantry.localhost:8080/realms/platform";
const clientId = "pengopa";
let keys: KeySource;
let sign: (claims: Record<string, unknown>, opts?: { iat?: number; kid?: string }) => Promise<string>;
let otherSign: typeof sign;

async function signer(kid: string) {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" };
  const fn = (claims: Record<string, unknown>, opts: { iat?: number } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuer(issuer)
      .setAudience(clientId)
      .setIssuedAt(opts.iat ?? Math.floor(Date.now() / 1000))
      .setExpirationTime("5m")
      .sign(privateKey);
  return { jwk, fn };
}

beforeAll(async () => {
  const a = await signer("a");
  const b = await signer("b");
  keys = createLocalJWKSet({ keys: [a.jwk] });
  sign = a.fn;
  otherSign = b.fn;
});

const logout = (extra: Record<string, unknown> = {}) => ({
  sub: "u1",
  sid: "s1",
  jti: "j1",
  events: { [BACKCHANNEL_LOGOUT_EVENT]: {} },
  ...extra,
});

describe("verifyIdToken", () => {
  it("returns the claims of a token signed by the realm for this client", async () => {
    const claims = await verifyIdToken(await sign({ sub: "u1", email: "a@b.test" }), keys, { issuer, clientId });
    expect(claims).toMatchObject({ sub: "u1", email: "a@b.test" });
  });

  it("refuses a token signed by another key", async () => {
    await expect(verifyIdToken(await otherSign({ sub: "u1" }), keys, { issuer, clientId })).rejects.toThrow();
  });
});

describe("verifyLogoutToken", () => {
  it("returns the Keycloak session and user", async () => {
    expect(await verifyLogoutToken(await sign(logout()), keys, { issuer, clientId })).toEqual({ sid: "s1", sub: "u1" });
  });

  it("accepts a token with only sub", async () => {
    expect(await verifyLogoutToken(await sign(logout({ sid: undefined })), keys, { issuer, clientId })).toEqual({ sub: "u1" });
  });

  it.each([
    ["another audience", { clientId: "someone-else" }],
    ["another issuer", { issuer: "https://evil.test/realms/platform" }],
  ])("refuses %s", async (_name, override) => {
    await expect(verifyLogoutToken(await sign(logout()), keys, { issuer, clientId, ...override })).rejects.toThrow();
  });

  it("refuses a token without the logout event", async () => {
    await expect(verifyLogoutToken(await sign(logout({ events: {} })), keys, { issuer, clientId })).rejects.toThrow(/event/);
  });

  it("refuses a token with a nonce", async () => {
    await expect(verifyLogoutToken(await sign(logout({ nonce: "n" })), keys, { issuer, clientId })).rejects.toThrow(/nonce/);
  });

  it("refuses a token naming neither session nor user", async () => {
    await expect(verifyLogoutToken(await sign(logout({ sid: undefined, sub: undefined })), keys, { issuer, clientId })).rejects.toThrow(/sid or sub/);
  });

  it("refuses a token issued more than five minutes ago", async () => {
    const iat = Math.floor(Date.now() / 1000) - 6 * 60;
    await expect(verifyLogoutToken(await sign(logout(), { iat }), keys, { issuer, clientId })).rejects.toThrow();
  });

  it("refuses a token signed by another key", async () => {
    await expect(verifyLogoutToken(await otherSign(logout()), keys, { issuer, clientId })).rejects.toThrow();
  });
});
