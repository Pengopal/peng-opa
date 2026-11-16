import { loadConfig } from "./config.js";

const base = { DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "s", APP_URL: "http://localhost:5180", OPA_TOKEN: "t" };

describe("loadConfig: Sign in with Tenantry", () => {
  it("leaves Tenantry off when none of its variables are set", () => {
    expect(loadConfig(base).tenantry).toBeUndefined();
  });

  it("reads the issuer, client and optional internal address", () => {
    const config = loadConfig({
      ...base,
      TENANTRY_ISSUER: "http://auth.tenantry.localhost:8080/realms/platform/",
      TENANTRY_INTERNAL_URL: "http://127.0.0.1:8180",
      TENANTRY_CLIENT_ID: "pengopa",
      TENANTRY_CLIENT_SECRET: "dev-pengopa-secret",
    });
    expect(config.tenantry).toEqual({
      issuer: "http://auth.tenantry.localhost:8080/realms/platform",
      internalUrl: "http://127.0.0.1:8180",
      clientId: "pengopa",
      clientSecret: "dev-pengopa-secret",
    });
  });

  it("refuses a partial Tenantry setup", () => {
    expect(() => loadConfig({ ...base, TENANTRY_ISSUER: "https://auth.example/realms/platform" })).toThrow(
      /TENANTRY_ISSUER, TENANTRY_CLIENT_ID and TENANTRY_CLIENT_SECRET/,
    );
  });
});
