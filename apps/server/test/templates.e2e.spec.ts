import type { INestApplication } from "@nestjs/common";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUpWithWorkspace } from "./support/users.js";

describe("template gallery API", () => {
  let stack: TestStack;
  let app: INestApplication;

  beforeAll(async () => {
    stack = await startTestStack();
    app = await createTestApp(stack);
  });
  afterAll(async () => {
    await app?.close();
    await stack?.stop();
  });

  it("lists templates with plain-sentence previews and creates a draft (with samples) from one, suffixing a taken key", async () => {
    const o = await signUpWithWorkspace(app);
    const ws = <T extends { set(k: string, v: string): T }>(r: T) => r.set("x-workspace-id", o.workspaceId);

    const list = (await ws(o.agent.get("/api/templates"))).body;
    const checkout = list.find((t: { id: string }) => t.id === "checkout-discount");
    expect(checkout).toMatchObject({ name: "Checkout discount", category: "Commerce" });
    expect(checkout.preview[0]).toMatch(/Customer tier is gold/);

    const first = await ws(o.agent.post("/api/templates/checkout-discount/use")).send({});
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ key: "checkout-discount", status: "DRAFT", issues: [] });
    const samples = (await ws(o.agent.get(`/api/policies/${first.body.id}/samples`))).body;
    expect(samples.length).toBeGreaterThanOrEqual(3);

    const second = await ws(o.agent.post("/api/templates/checkout-discount/use")).send({});
    expect(second.body.key).toBe("checkout-discount-2");
  });
});
