import { HttpOpaGateway } from "../../src/opa-gateway/http-opa-gateway";
import { startTestOpa, TestOpa } from "../support/stack";
import { goldenFixtures } from "./fixtures";
import { runGolden } from "./run-golden";

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
