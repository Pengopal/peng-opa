import { api, ApiError, setOnUnauthorized, setWorkspaceId } from "./api";

describe("api", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends the current workspace header and JSON body, and returns parsed JSON", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200, headers: { "Content-Type": "application/json" } }));
    setWorkspaceId("ws-1");
    expect(await api("/api/policies", { method: "POST", body: { name: "x" } })).toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/policies");
    expect(new Headers(init.headers).get("x-workspace-id")).toBe("ws-1");
    expect(init.body).toBe('{"name":"x"}');
    expect(init.credentials).toBe("include");
  });

  it("calls the unauthorized handler on 401 and throws an ApiError with the server message", async () => {
    const onUnauthorized = vi.fn();
    setOnUnauthorized(onUnauthorized);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401 }));
    await expect(api("/api/workspaces")).rejects.toMatchObject({ status: 401, message: "Unauthorized" });
    expect(onUnauthorized).toHaveBeenCalled();

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ message: "Fix 1 issue(s) before publishing", issues: [{ code: "empty_value" }] }), { status: 422 }));
    const err = (await api("/api/x").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.body.issues).toHaveLength(1);
  });
});
