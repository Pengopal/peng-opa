import { HttpOpaGateway } from "../../src/opa-gateway/http-opa-gateway.js";
import { startTestOpa, TestOpa } from "../support/stack.js";
import { goldenFixtures } from "./fixtures.js";
import { runGolden } from "./run-golden.js";

describe("golden: compiled rule sets evaluate correctly in real OPA", () => {
  let opa: TestOpa;
  let gateway: HttpOpaGateway;

  beforeAll(async () => {
    opa = await startTestOpa();
    gateway = new HttpOpaGateway(() => opa.url, opa.token);
  });
  afterAll(async () => opa?.kill());

  it.each(goldenFixtures.map((f) => [f.name, f] as const))("%s", async (_name, fixture) => {
    expect(await runGolden(gateway, fixture)).toEqual([]);
  });
});
