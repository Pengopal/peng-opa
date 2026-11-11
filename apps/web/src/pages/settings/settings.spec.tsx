import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { fakeWorkspace, renderPage, serveApi } from "@/test/render";
import { DangerZone } from "./DangerZone";
import { InviteDialog } from "./InviteDialog";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/workspace", async (orig) => ({
  ...(await orig<typeof import("@/lib/workspace")>()),
  useWorkspace: () => ({ current: fakeWorkspace, list: [fakeWorkspace], isLoading: false, switchTo: vi.fn(), refresh: vi.fn() }),
}));

describe("DangerZone", () => {
  it("deletes the workspace only after its exact name is typed", async () => {
    serveApi({ "DELETE /api/workspaces/current": undefined, "/api/workspaces": [] });
    await renderPage(<DangerZone />);
    await userEvent.click(screen.getByRole("button", { name: "Delete workspace" }));
    const confirm = await screen.findByRole("button", { name: "Delete forever" });
    await userEvent.type(screen.getByLabelText(/Type Acme to confirm/), "acme");
    expect(confirm).toBeDisabled();
    await userEvent.clear(screen.getByLabelText(/Type Acme to confirm/));
    await userEvent.type(screen.getByLabelText(/Type Acme to confirm/), "Acme");
    await userEvent.click(confirm);
    await waitFor(() => expect(vi.mocked(api)).toHaveBeenCalledWith("/api/workspaces/current", { method: "DELETE" }));
  });
});

describe("InviteDialog", () => {
  it("shows the invite link to copy when email sending is not set up", async () => {
    serveApi({
      "/api/config": { googleEnabled: false, demoPublic: false, smtpEnabled: false },
      "POST /api/invites": { id: "i1", email: "sam@example.com", role: "EDITOR", inviteUrl: "http://localhost:5180/invite/tok123", emailSent: false },
      "/api/invites": [],
    });
    await renderPage(<InviteDialog />);
    await userEvent.click(screen.getByRole("button", { name: "Invite" }));
    await userEvent.type(await screen.findByLabelText("Email"), "sam@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Send invite" }));
    expect(await screen.findByText("http://localhost:5180/invite/tok123")).toBeInTheDocument();
    expect(screen.getByText(/Email isn't set up/)).toBeInTheDocument();
  });
});
