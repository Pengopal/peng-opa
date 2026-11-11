import type { INestApplication } from "@nestjs/common";
import { sampleRuleSet, type RuleSet } from "@peng/shared";
import { signUpWithWorkspace } from "./users.js";

/** A workspace with a published policy and an API key: the setup most decision tests need. */
export async function liveWorkspace(app: INestApplication, key = "checkout-discount", ruleSet: RuleSet = sampleRuleSet()) {
  const o = await signUpWithWorkspace(app);
  const ws = <T extends { set(k: string, v: string): T }>(r: T) => r.set("x-workspace-id", o.workspaceId);
  const p = await ws(o.agent.post("/api/policies")).send({ key, name: key, ruleSet });
  const pub = await ws(o.agent.post(`/api/policies/${p.body.id}/publish`)).send({});
  if (pub.status !== 201) throw new Error(`publish failed ${pub.status}: ${JSON.stringify(pub.body)}`);
  const k = await ws(o.agent.post("/api/api-keys")).send({ name: "test" });
  return { ...o, ws, policyId: p.body.id as string, apiKey: k.body.key as string, policyKey: key };
}
