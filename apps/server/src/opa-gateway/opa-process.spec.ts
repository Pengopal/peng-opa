import { restartDelay } from "./opa-process.service.js";

describe("restartDelay", () => {
  it("backs off 1s, 2s, 4s… and then keeps retrying every minute instead of giving up", () => {
    expect([0, 1, 2, 3, 4].map(restartDelay)).toEqual([1_000, 2_000, 4_000, 8_000, 16_000]);
    expect(restartDelay(5)).toBe(60_000);
    expect(restartDelay(50)).toBe(60_000);
  });
});
