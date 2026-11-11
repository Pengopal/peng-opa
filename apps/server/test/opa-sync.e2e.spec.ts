import type { INestApplication } from "@nestjs/common";
import { sampleRuleSet } from "@peng/shared";
import { OPA_GATEWAY, OpaGateway } from "../src/opa-gateway/opa-gateway.js";
import { OpaSyncService } from "../src/opa-gateway/opa-sync.service.js";
import { opaNames, draftNames } from "../src/rego-compiler/naming.js";
import { startTestStack, TestStack } from "./support/stack.js";
import { createTestApp } from "./support/app.js";
import { signUpWithWorkspace } from "./support/users.js";

const goldOrder = { customer: { tier: "gold" }, order: { total: 600 } };

describe("OPA sync", () => {
  let stack: TestStack;
  let app: INestApplication;
  let opa: OpaGateway;
  let sync: OpaSyncService;

  beforeAll(async () => {
    stack = await startTestStack();
    app = await createTestApp(stack);
    opa = app.get(OPA_GATEWAY);
    sync = app.get(OpaSyncService);
  });
  afterAll(async () => {
    await app?.close();
    await stack?.stop();
  });

  async function livePolicy(key: string) {
    const o = await signUpWithWorkspace(app);
    const ws = (r: ReturnType<typeof o.agent.get>) => r.set("x-workspace-id", o.workspaceId);
    const p = await ws(o.agent.post("/api/policies")).send({ key, name: key, ruleSet: sampleRuleSet() });
    await ws(o.agent.post(`/api/policies/${p.body.id}/publish`)).send({});
    return { o, ws, id: p.body.id as string, names: opaNames(o.shortId, key) };
  }

  it("recovers_after_opa_restart: live policies are pushed back", async () => {
    const { names } = await livePolicy("restart-me");
    await stack.killOpa();
    await stack.startOpa(); // a fresh OPA has no policies
    expect(await opa.evaluate(names.dataPath, goldOrder)).toBeUndefined();

    await sync.syncAll();
    expect((await opa.evaluate(names.dataPath, goldOrder))?.allowed).toBe(true);
  });

  it("removes orphaned and paused modules and repairs a changed module", async () => {
    const live = await livePolicy("keep-me");
    const paused = await livePolicy("pause-me");
    await paused.ws(paused.o.agent.post(`/api/policies/${paused.id}/pause`)).send({});

    await opa.upsertPolicy(paused.names.policyId, `package ${paused.names.packageName}\nimport rego.v1\nx := 1\n`); // stray copy
    await opa.upsertPolicy("t_gone00/old", "package t_gone00.old\nimport rego.v1\nx := 1\n"); // workspace no longer exists
    await opa.upsertPolicy(live.names.policyId, `package ${live.names.packageName}\nimport rego.v1\ndecision := {"allowed": false}\n`); // tampered

    await sync.syncAll();
    const ids = await opa.listPolicyIds("t_");
    expect(ids).toContain(live.names.policyId);
    expect(ids).not.toContain(paused.names.policyId);
    expect(ids).not.toContain("t_gone00/old");
    expect((await opa.evaluate(live.names.dataPath, goldOrder))?.allowed).toBe(true);
  });

  it("sweeps Try-it drafts unused for over an hour", async () => {
    const { o } = await livePolicy("drafty");
    const fresh = draftNames(o.shortId, "fresh1");
    const stale = draftNames(o.shortId, "stale1");
    for (const d of [fresh, stale]) await opa.upsertPolicy(d.policyId, `package ${d.packageName}\nimport rego.v1\nx := 1\n`);
    sync.markDraftUsed(fresh.policyId);
    sync.markDraftUsed(stale.policyId, Date.now() - 61 * 60_000);

    await sync.syncAll();
    const ids = await opa.listPolicyIds(`t_${o.shortId}/`);
    expect(ids).toContain(fresh.policyId);
    expect(ids).not.toContain(stale.policyId);
  });
});
