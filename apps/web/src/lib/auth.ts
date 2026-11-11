import { createAuthClient } from "better-auth/react";

/** Better Auth client; the API is same-origin (Vite proxy in dev, Nest serves the app in production). */
export const authClient = createAuthClient({ basePath: "/api/auth" });

export const { useSession, signIn, signUp, signOut } = authClient;
