export interface AppConfig {
  databaseUrl: string;
  betterAuthSecret: string;
  appUrl: string;
  googleClientId?: string;
  googleClientSecret?: string;
  /** External OPA; when unset the app spawns the bundled binary on opaPort. */
  opaUrl?: string;
  opaPort: number;
  opaToken: string;
  rateLimitRps: number;
  demoPublic: boolean;
  smtpUrl?: string;
  /** Resend API key; preferred over SMTP (Railway blocks outbound SMTP on most plans). */
  resendApiKey?: string;
  /** Sender for emails, e.g. "peng-opa <no-reply@pengopal.com>". Required with RESEND_API_KEY. */
  mailFrom?: string;
  /** Sign in with Tenantry (Tenantry ADR-0032); unset when Tenantry sign-in is off. */
  tenantry?: TenantryConfig;
  /** PostHog project key (public, phc_…); unset turns analytics off. */
  posthogKey?: string;
  /** PostHog ingestion host; EU cloud unless set. */
  posthogHost: string;
}

export interface TenantryConfig {
  /** The realm's issuer as the browser and tokens see it, e.g. https://auth.tenantry.pengopal.com/realms/platform. */
  issuer: string;
  /** Where this server reaches Keycloak when the public host does not resolve here (local *.localhost). */
  internalUrl?: string;
  clientId: string;
  clientSecret: string;
}

const optional = (v: string | undefined) => (v && v.trim() !== "" ? v : undefined);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = (name: string) => {
    const v = optional(env[name]);
    if (!v) throw new Error(`Missing required env var ${name}`);
    return v;
  };
  if (optional(env.RESEND_API_KEY) && !optional(env.MAIL_FROM)) {
    throw new Error("MAIL_FROM is required with RESEND_API_KEY (an address on a domain verified in Resend)");
  }
  const tenantry = loadTenantry(env);
  return {
    databaseUrl: required("DATABASE_URL"),
    betterAuthSecret: required("BETTER_AUTH_SECRET"),
    appUrl: required("APP_URL"),
    googleClientId: optional(env.GOOGLE_CLIENT_ID),
    googleClientSecret: optional(env.GOOGLE_CLIENT_SECRET),
    opaUrl: optional(env.OPA_URL),
    opaPort: Number(env.OPA_PORT ?? 8181),
    opaToken: required("OPA_TOKEN"),
    rateLimitRps: Number(env.RATE_LIMIT_RPS ?? 50),
    demoPublic: env.DEMO_PUBLIC === "true",
    smtpUrl: optional(env.SMTP_URL),
    resendApiKey: optional(env.RESEND_API_KEY),
    mailFrom: optional(env.MAIL_FROM),
    posthogKey: optional(env.POSTHOG_KEY),
    posthogHost: (optional(env.POSTHOG_HOST) ?? "https://eu.i.posthog.com").replace(/\/+$/, ""),
    ...(tenantry ? { tenantry } : {}),
  };
}

function loadTenantry(env: NodeJS.ProcessEnv): TenantryConfig | undefined {
  const issuer = optional(env.TENANTRY_ISSUER);
  const clientId = optional(env.TENANTRY_CLIENT_ID);
  const clientSecret = optional(env.TENANTRY_CLIENT_SECRET);
  if (!issuer && !clientId && !clientSecret) return undefined;
  if (!issuer || !clientId || !clientSecret) {
    throw new Error("Set all of TENANTRY_ISSUER, TENANTRY_CLIENT_ID and TENANTRY_CLIENT_SECRET, or none of them");
  }
  const internalUrl = optional(env.TENANTRY_INTERNAL_URL);
  return {
    issuer: issuer.replace(/\/+$/, ""),
    ...(internalUrl ? { internalUrl: internalUrl.replace(/\/+$/, "") } : {}),
    clientId,
    clientSecret,
  };
}

export const APP_CONFIG = Symbol("APP_CONFIG");
