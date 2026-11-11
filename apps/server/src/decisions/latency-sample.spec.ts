import { LatencySample } from "./latency-sample.js";

describe("LatencySample", () => {
  it("gives the exact p95 for small days and a close one for large days in bounded memory", () => {
    const small = new LatencySample(1000, () => 0.5);
    for (let i = 1; i <= 100; i++) small.add(i);
    expect(small.p95()).toBe(95);

    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const big = new LatencySample(1000, rng);
    for (let n = 0; n < 50; n++) for (let i = 1; i <= 1000; i++) big.add(i);
    expect(big.size).toBe(1000);
    expect(big.p95()).toBeGreaterThan(920);
    expect(big.p95()).toBeLessThan(980);
  });
});
