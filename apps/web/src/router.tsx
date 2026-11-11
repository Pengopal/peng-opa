import { createRootRoute, createRoute, createRouter, Outlet, redirect } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { WorkspaceProvider } from "@/lib/workspace";
import { AppShell } from "@/components/layout/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { SignIn } from "@/pages/auth/SignIn";
import { SignUp } from "@/pages/auth/SignUp";
import { AcceptInvite } from "@/pages/auth/AcceptInvite";
import { CreateWorkspace } from "@/pages/onboarding/CreateWorkspace";
import { Placeholder } from "@/pages/Placeholder";
import { Home } from "@/pages/home/Home";
import { Welcome } from "@/pages/onboarding/Welcome";
import { PoliciesList } from "@/pages/policies/PoliciesList";
import { TemplateGallery } from "@/pages/templates/TemplateGallery";
import { PolicyEditorPage } from "@/pages/policy-editor/PolicyEditorPage";
import { Activity } from "@/pages/activity/Activity";
import { parseFilters } from "@/pages/activity/filters";

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
    </>
  ),
});

const authSearch = (s: Record<string, unknown>) => ({ redirect: typeof s.redirect === "string" ? s.redirect : undefined });
const signInRoute = createRoute({ getParentRoute: () => rootRoute, path: "/sign-in", validateSearch: authSearch, component: SignIn });
const signUpRoute = createRoute({ getParentRoute: () => rootRoute, path: "/sign-up", validateSearch: authSearch, component: SignUp });
const inviteRoute = createRoute({ getParentRoute: () => rootRoute, path: "/invite/$token", component: AcceptInvite });

/** Everything below needs a session; the workspace list is loaded once here. */
const authedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "authed",
  beforeLoad: async ({ location }) => {
    const { data } = await authClient.getSession();
    if (!data) throw redirect({ to: "/sign-in", search: { redirect: location.href } });
  },
  component: () => (
    <WorkspaceProvider>
      <Outlet />
    </WorkspaceProvider>
  ),
});

const onboardingRoute = createRoute({ getParentRoute: () => authedRoute, path: "/onboarding", component: CreateWorkspace });
const shellRoute = createRoute({ getParentRoute: () => authedRoute, id: "shell", component: AppShell });

export const homeRoute = createRoute({ getParentRoute: () => shellRoute, path: "/", component: Home });
export const welcomeRoute = createRoute({ getParentRoute: () => shellRoute, path: "/welcome", component: Welcome });
export const policiesRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/policies",
  validateSearch: (s: Record<string, unknown>): { new?: "blank" } => (s.new === "blank" ? { new: "blank" } : {}),
  component: PoliciesList,
});
export const policyRoute = createRoute({
  getParentRoute: () => shellRoute,
  path: "/policies/$policyId",
  validateSearch: (s: Record<string, unknown>): { replay?: string } => (typeof s.replay === "string" ? { replay: s.replay } : {}),
  component: PolicyEditorPage,
});
export const templatesRoute = createRoute({ getParentRoute: () => shellRoute, path: "/templates", component: TemplateGallery });
export const activityRoute = createRoute({ getParentRoute: () => shellRoute, path: "/activity", validateSearch: parseFilters, component: Activity });
export const connectRoute = createRoute({ getParentRoute: () => shellRoute, path: "/connect", component: () => <Placeholder title="Connect" /> });
export const settingsRoute = createRoute({ getParentRoute: () => shellRoute, path: "/settings", component: () => <Placeholder title="Settings" /> });

const routeTree = rootRoute.addChildren([
  signInRoute,
  signUpRoute,
  inviteRoute,
  authedRoute.addChildren([onboardingRoute, shellRoute.addChildren([homeRoute, welcomeRoute, policiesRoute, policyRoute, templatesRoute, activityRoute, connectRoute, settingsRoute])]),
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
