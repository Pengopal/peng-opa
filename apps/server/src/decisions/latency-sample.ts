/**
 * Bounded uniform sample of latencies (reservoir sampling, algorithm R). p95 is exact while fewer
 * than `capacity` values were added and a close estimate after, in constant memory.
 */
export class LatencySample {
  private readonly values: number[] = [];
  private seen = 0;

  constructor(
    private readonly capacity = 1000,
    private readonly rng: () => number = Math.random,
  ) {}

  get size(): number {
    return this.values.length;
  }

  add(latencyMs: number): void {
    this.seen++;
    if (this.values.length < this.capacity) {
      this.values.push(latencyMs);
      return;
    }
    const j = Math.floor(this.rng() * this.seen);
    if (j < this.capacity) this.values[j] = latencyMs;
  }

  /** Nearest-rank 95th percentile; 0 when empty. */
  p95(): number {
    if (!this.values.length) return 0;
    const sorted = [...this.values].sort((a, b) => a - b);
    return sorted[Math.ceil(0.95 * sorted.length) - 1];
  }
}
