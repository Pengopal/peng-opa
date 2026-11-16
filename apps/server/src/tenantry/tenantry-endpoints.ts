import type { TenantryConfig } from "../config/config.js";

export interface TenantryEndpoints {
  /** Opened in the browser. */
  authorization: string;
  endSession: string;
  /** Called by this server. */
  token: string;
  jwks: string;
}

/** Keycloak's OpenID Connect endpoints for the realm, public for the browser and internal for the server. */
export function tenantryEndpoints({ issuer, internalUrl }: Pick<TenantryConfig, "issuer" | "internalUrl">): TenantryEndpoints {
  const oidc = "/protocol/openid-connect";
  const server = internalUrl ? `${internalUrl}${new URL(issuer).pathname.replace(/\/+$/, "")}` : issuer;
  return {
    authorization: `${issuer}${oidc}/auth`,
    endSession: `${issuer}${oidc}/logout`,
    token: `${server}${oidc}/token`,
    jwks: `${server}${oidc}/certs`,
  };
}
