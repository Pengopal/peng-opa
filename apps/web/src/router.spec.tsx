import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { authClient } from "@/lib/auth";
import { createAppRouter } from "./router";

vi.mock("@/lib/auth", () => ({
  authClient: { getSession: vi.fn() },
  useSession: () => ({ data: null }),
  signIn: { email: vi.fn(), social: vi.fn() },
  signUp: { email: vi.fn() },
  signOut: vi.fn(),
}));

const session = (signedIn: boolean) =>
  vi.mocked(authClient.getSession).mockResolvedValue({ data: signedIn ? { user: { id: "u1" } } : null } as never);

test("signed-out visitor sees the landing page at /", async () => {
  session(false);
  const router = createAppRouter(createMemoryHistory({ initialEntries: ["/"] }));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  expect(await screen.findByRole("heading", { level: 1, name: "Write the rule once. Every system gets the same answer." })).toBeInTheDocument();
});

test("signed-in user at / goes to /home", async () => {
  session(true);
  const router = createAppRouter(createMemoryHistory({ initialEntries: ["/"] }));
  await router.load();
  expect(router.state.location.pathname).toBe("/home");
});
