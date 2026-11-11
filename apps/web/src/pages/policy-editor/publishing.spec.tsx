import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { api } from "@/lib/api";
import { renderPage, serveApi } from "@/test/render";
import { PublishDialog, summarizeChanges } from "./PublishDialog";
import { VersionsTab } from "./VersionsTab";
import type { EditorContext } from "./PolicyEditor";

vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), api: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const ctx = (over = {}) =>
  ({
    policy: { id: "p1", key: "k", name: "Checkout", status: "LIVE", liveVersion: { number: 2, publishedAt: "2026-11-01T00:00:00Z" }, ...over },
    draft: { flush: vi.fn().mockResolvedValue(undefined), issues: [] },
    canEdit: true,
    reload: vi.fn(),
  }) as unknown as EditorContext;

describe("PublishDialog", () => {
  it("summarizes changes in words", () => {
    expect(summarizeChanges([])).toBe("No rule changes");
    expect(
      summarizeChanges([
        { ruleId: "a", label: "A", kind: "changed" },
        { ruleId: "b", label: "B", kind: "changed" },
        { ruleId: "c", label: "C", kind: "added" },
      ]),
    ).toBe("2 rules changed, 1 added");
  });

  it("blocks publishing while there are errors, otherwise publishes with the note", async () => {
    serveApi({ "/api/policies/p1/publish-preview": { issues: [{ severity: "error", code: "empty_value", path: "rules[0]", message: "Rule 1 needs a value" }], changes: [] } });
    const view = await renderPage(<PublishDialog {...ctx()} />);
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText("Rule 1 needs a value")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish v3" })).toBeDisabled();
    view.unmount();

    serveApi({
      "/api/policies/p1/publish-preview": { issues: [], changes: [{ ruleId: "a", label: "Gold", kind: "changed" }] },
      "POST /api/policies/p1/publish": { version: 3 },
    });
    await renderPage(<PublishDialog {...ctx()} />);
    await userEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(await screen.findByText("1 rule changed")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Note/), "Raise gold discount");
    await userEvent.click(screen.getByRole("button", { name: "Publish v3" }));
    await waitFor(() =>
      expect(vi.mocked(api).mock.calls.find(([p]) => p === "/api/policies/p1/publish")?.[1]?.body).toEqual({ note: "Raise gold discount" }),
    );
  });
});

describe("VersionsTab", () => {
  it("asks for confirmation before rolling back the live version", async () => {
    serveApi({
      "/api/policies/p1/versions": [
        { number: 2, note: null, publishedAt: "2026-11-02T00:00:00Z", publishedBy: "Ana" },
        { number: 1, note: "First", publishedAt: "2026-11-01T00:00:00Z", publishedBy: "Ana" },
      ],
      "POST /api/policies/p1/versions/1/rollback": { version: 3 },
    });
    await renderPage(<VersionsTab {...ctx()} />);
    await userEvent.click(await screen.findByRole("button", { name: "Roll back live to v1" }));
    expect(vi.mocked(api).mock.calls.some(([p]) => String(p).includes("rollback"))).toBe(false);
    expect(await screen.findByRole("alertdialog")).toHaveTextContent(/v1 becomes live again as v3/);
    await userEvent.click(screen.getByRole("button", { name: "Roll back" }));
    await waitFor(() => expect(vi.mocked(api).mock.calls.some(([p]) => p === "/api/policies/p1/versions/1/rollback")).toBe(true));
  });

  it("saves pending edits before restoring a version, so they can't overwrite the restored draft", async () => {
    const order: string[] = [];
    serveApi({
      "/api/policies/p1/versions": [{ number: 1, note: null, publishedAt: "2026-11-01T00:00:00Z", publishedBy: "Ana" }],
      "POST /api/policies/p1/versions/1/restore-draft": () => {
        order.push("restore");
        return { restored: 1 };
      },
    });
    const c = ctx() as unknown as { draft: { flush: () => Promise<void> } };
    c.draft.flush = vi.fn(async () => void order.push("flush"));
    await renderPage(<VersionsTab {...(c as unknown as EditorContext)} />);
    await userEvent.click(await screen.findByRole("button", { name: "Restore as draft" }));
    await waitFor(() => expect(order).toEqual(["flush", "restore"]));
  });
});
