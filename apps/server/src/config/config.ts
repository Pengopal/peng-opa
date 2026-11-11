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
}

const optional = (v: string | undefined) => (v && v.trim() !== "" ? v : undefined);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const required = (name: string) => {
    const v = optional(env[name]);
    if (!v) throw new Error(`Missing required env var ${name}`);
    return v;
  };
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
  };
}

export const APP_CONFIG = Symbol("APP_CONFIG");
