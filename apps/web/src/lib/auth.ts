import { createAuthClient } from "better-auth/react";

/** Better Auth client; the API is same-origin (Vite proxy in dev, Nest serves the app in production). */
export const authClient = createAuthClient({ basePath: "/api/auth" });

export const { useSession, signIn, signUp, signOut } = authClient;

/** Sign in with Tenantry (a generic OAuth provider on the server, used like Google). */
export const signInWithTenantry = (callbackURL: string) =>
  signIn.social({ provider: "tenantry" as Parameters<typeof signIn.social>[0]["provider"], callbackURL });
