import { tenantryEndpoints } from "./tenantry-endpoints.js";

describe("tenantryEndpoints", () => {
  const issuer = "http://auth.tenantry.localhost:8080/realms/platform";

  it("sends the browser to the public issuer and the server to the internal address", () => {
    expect(tenantryEndpoints({ issuer, internalUrl: "http://127.0.0.1:8180" })).toEqual({
      authorization: `${issuer}/protocol/openid-connect/auth`,
      endSession: `${issuer}/protocol/openid-connect/logout`,
      token: "http://127.0.0.1:8180/realms/platform/protocol/openid-connect/token",
      jwks: "http://127.0.0.1:8180/realms/platform/protocol/openid-connect/certs",
    });
  });

  it("uses the issuer for everything without an internal address", () => {
    const e = tenantryEndpoints({ issuer: "https://auth.tenantry.pengopal.com/realms/platform" });
    expect(e.token).toBe("https://auth.tenantry.pengopal.com/realms/platform/protocol/openid-connect/token");
    expect(e.jwks).toBe("https://auth.tenantry.pengopal.com/realms/platform/protocol/openid-connect/certs");
  });
});
