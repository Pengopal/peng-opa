import { Inject, Injectable } from "@nestjs/common";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APP_CONFIG, AppConfig } from "../config/config.js";
import { PrismaService } from "../prisma/prisma.service.js";

function createAuth(prisma: PrismaService, config: AppConfig) {
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
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Holds the Better Auth instance (email/password, optional Google). */
@Injectable()
export class AuthService {
  readonly auth: Auth;

  constructor(prisma: PrismaService, @Inject(APP_CONFIG) config: AppConfig) {
    this.auth = createAuth(prisma, config);
  }
}
