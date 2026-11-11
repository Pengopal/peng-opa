import { HttpOpaGateway } from "../src/opa-gateway/http-opa-gateway";
import { OpaCompileError, OpaUnavailableError } from "../src/opa-gateway/errors";
import { OpaProcess } from "../src/opa-gateway/opa-process.service";
import { freePort, startTestOpa, TestOpa } from "./support/stack";

const POLICY = `package t_gw.p
import rego.v1
default decision := {"allowed": false, "reason": "no", "outcomes": {}, "rule": null}
decision := {"allowed": true, "reason": "yes", "outcomes": {"n": 1}, "rule": "r1"} if input.ok == true
`;

describe("HttpOpaGateway", () => {
  let opa: TestOpa;
  let gateway: HttpOpaGateway;

  beforeAll(async () => {
    opa = await startTestOpa();
    gateway = new HttpOpaGateway(() => opa.url, opa.token);
  });
  afterAll(async () => opa?.kill());

  it("upsert_then_evaluate", async () => {
    await gateway.upsertPolicy("t_gw/p", POLICY);
    expect(await gateway.evaluate("t_gw/p/decision", { ok: true })).toEqual({ allowed: true, reason: "yes", outcomes: { n: 1 }, rule: "r1" });
  });

  it("compile_error_surfaces_messages", async () => {
    const err = await gateway.upsertPolicy("t_gw/bad", "package t_gw.bad\nfoo :=").catch((e) => e);
    expect(err).toBeInstanceOf(OpaCompileError);
    expect((err as OpaCompileError).messages.length).toBeGreaterThan(0);
  });

  it("evaluate_unknown_path_returns_undefined", async () => {
    expect(await gateway.evaluate("t_gw/nothing_here/decision", {})).toBeUndefined();
  });

  it("delete_is_idempotent_and_list_filters_by_prefix", async () => {
    await gateway.upsertPolicy("t_gw/p", POLICY);
    await gateway.upsertPolicy("t_other/p", POLICY.replace("t_gw.p", "t_other.p"));
    expect(await gateway.listPolicyIds("t_gw/")).toEqual(["t_gw/p"]);
    await gateway.deletePolicy("t_gw/p");
    await gateway.deletePolicy("t_gw/p");
    expect(await gateway.listPolicyIds("t_gw/")).toEqual([]);
  });

  it("requires_token", async () => {
    const wrong = new HttpOpaGateway(() => opa.url, "wrong-token");
    await expect(wrong.listPolicyIds("t_")).rejects.toBeInstanceOf(OpaUnavailableError);
  });

  it("unavailable_when_opa_is_down", async () => {
    await opa.kill();
    try {
      await expect(gateway.evaluate("t_gw/p/decision", {})).rejects.toBeInstanceOf(OpaUnavailableError);
      expect(await gateway.health()).toBe(false);
    } finally {
      await opa.start();
    }
  });
});

describe("OpaProcess", () => {
  it("spawns OPA, becomes healthy, and restarts it after a crash", async () => {
    const port = await freePort();
    const proc = new OpaProcess({ opaPort: port, opaToken: "tok", opaUrl: undefined });
    await proc.onModuleInit();
    try {
      const gateway = new HttpOpaGateway(() => proc.baseUrl, "tok");
      expect(await gateway.health()).toBe(true);

      proc.killForTest();
      await proc.ready(10_000);
      expect(await gateway.health()).toBe(true);
    } finally {
      await proc.onApplicationShutdown();
    }
  });
});
