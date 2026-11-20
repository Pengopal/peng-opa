import { Inject, Injectable, Optional } from "@nestjs/common";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { createAuthMiddleware } from "better-auth/api";
import { genericOAuth } from "better-auth/plugins";
import { decodeJwt } from "jose";
import { APP_CONFIG, AppConfig, TenantryConfig } from "../config/config.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { tenantryEndpoints } from "../tenantry/tenantry-endpoints.js";
import { linkTenantrySession } from "../tenantry/tenantry-sign-in.js";
import { remoteKeys, verifyIdToken, type KeySource } from "../tenantry/tokens.js";
import { Analytics } from "../analytics/analytics.service.js";
import { PUBLIC_DEMO_EMAIL } from "../demo/public-demo.js";

export const TENANTRY_PROVIDER_ID = "tenantry";

/**
 * Sign in with Tenantry (Tenantry ADR-0032): Keycloak's code flow with PKCE. Endpoints are named, not
 * discovered, so this server can reach Keycloak at an internal address while the browser uses the public one;
 * the ID token is checked against the realm's keys here. Signing out of PengOPA also ends the Keycloak session.
 */
function tenantryProvider(tenantry: TenantryConfig, keys: KeySource) {
  const endpoints = tenantryEndpoints(tenantry);
  return genericOAuth({
    config: [
      {
        providerId: TENANTRY_PROVIDER_ID,
        name: "Tenantry",
        clientId: tenantry.clientId,
        clientSecret: tenantry.clientSecret,
        authorizationUrl: endpoints.authorization,
        tokenUrl: endpoints.token,
        endSessionEndpoint: endpoints.endSession,
        postLogoutRedirectURI: "/sign-in",
        scopes: ["openid", "email", "profile", "organization"],
        pkce: true,
        async getUserInfo(tokens) {
          if (!tokens.idToken) return null;
          const claims = await verifyIdToken(tokens.idToken, keys, tenantry);
          const email = typeof claims.email === "string" ? claims.email : undefined;
          if (!claims.sub || !email) return null;
          const name = [claims.name, claims.preferred_username, email].find((v): v is string => typeof v === "string");
          return { id: claims.sub, email, emailVerified: claims.email_verified === true, name };
        },
      },
    ],
  });
}

/** How someone signed up or in, from Better Auth's endpoint: "email", "google" or "tenantry". */
export function authMethod(path: string | undefined, params?: Record<string, unknown>): string {
  const provider = params?.providerId ?? params?.id;
  if (typeof provider === "string" && /^[a-z0-9-]{1,40}$/.test(provider)) return provider;
  return path?.endsWith("/email") ? "email" : "other";
}

function createAuth(prisma: PrismaService, config: AppConfig, tenantryKeys?: KeySource, analytics?: Analytics) {
  const google =
    config.googleClientId && config.googleClientSecret
      ? { google: { clientId: config.googleClientId, clientSecret: config.googleClientSecret } }
      : {};
  return betterAuth({
    database: prismaAdapter(prisma.unscoped, { provider: "postgresql" }),
    secret: config.betterAuthSecret,
    baseURL: config.appUrl,
    basePath: "/api/auth",
    trustedOrigins: [config.appUrl],
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    socialProviders: google,
    plugins: config.tenantry ? [tenantryProvider(config.tenantry, tenantryKeys ?? remoteKeys(tenantryEndpoints(config.tenantry).jwks))] : [],
    databaseHooks: {
      user: {
        create: {
          after: async (user, ctx) => {
            if (user.email === PUBLIC_DEMO_EMAIL) return;
            analytics?.capture("user_signed_up", { id: user.id }, { method: authMethod(ctx?.path, ctx?.params) });
          },
        },
      },
    },
    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        const signedIn = ctx.context.newSession;
        if (signedIn && !ctx.path.startsWith("/sign-up") && signedIn.user.email !== PUBLIC_DEMO_EMAIL) {
          analytics?.capture("user_signed_in", { id: signedIn.user.id }, { method: authMethod(ctx.path, ctx.params) });
        }
        if (!config.tenantry || !ctx.path.startsWith("/callback/") || ctx.params?.id !== TENANTRY_PROVIDER_ID) return;
        const created = ctx.context.newSession;
        if (!created) return;
        const account = await prisma.unscoped.account.findFirst({
          where: { userId: created.user.id, providerId: TENANTRY_PROVIDER_ID },
          orderBy: { updatedAt: "desc" },
        });
        // Verified in getUserInfo moments ago, on its way from the token endpoint.
        if (!account?.idToken) return;
        await linkTenantrySession(prisma.unscoped, {
          sessionId: created.session.id,
          userId: created.user.id,
          claims: decodeJwt(account.idToken),
        });
      }),
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Keys for checking Tenantry's tokens; tests replace them with a local set. */
export const TENANTRY_KEYS = Symbol("TENANTRY_KEYS");

/** Holds the Better Auth instance (email/password, optional Google and Tenantry). */
@Injectable()
export class AuthService {
  readonly auth: Auth;

  readonly tenantryKeys: KeySource | undefined;

  constructor(
    prisma: PrismaService,
    @Inject(APP_CONFIG) config: AppConfig,
    @Optional() @Inject(TENANTRY_KEYS) keys?: KeySource | null,
    @Optional() analytics?: Analytics,
  ) {
    this.tenantryKeys = config.tenantry ? (keys ?? remoteKeys(tenantryEndpoints(config.tenantry).jwks)) : undefined;
    this.auth = createAuth(prisma, config, this.tenantryKeys, analytics);
  }
}
