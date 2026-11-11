import { ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Inject, Injectable, Logger, OnApplicationShutdown, OnModuleInit } from "@nestjs/common";
import { APP_CONFIG, AppConfig } from "../config/config.js";

const repoRoot = join(import.meta.dirname, "..", "..", "..", "..");
const binary = join(repoRoot, "tools", "opa", process.platform === "win32" ? "opa.exe" : "opa");
const authzPolicy = join(repoRoot, "ops", "opa", "authz.rego");
const MAX_RESTARTS_PER_MINUTE = 5;

/** Wait before restart number `recent + 1` within a minute: 1s, 2s, 4s, 8s, 16s, then once a minute — never giving up. */
export function restartDelay(recent: number): number {
  return recent >= MAX_RESTARTS_PER_MINUTE ? 60_000 : 1_000 * 2 ** recent;
}

type OpaProcessConfig = Pick<AppConfig, "opaPort" | "opaToken" | "opaUrl">;

/**
 * Runs the bundled OPA binary on 127.0.0.1 next to the app (no Docker), restarting it with
 * backoff if it exits. When OPA_URL is set, it does nothing and points at that OPA instead.
 */
@Injectable()
export class OpaProcess implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(OpaProcess.name);
  private child?: ChildProcess;
  private stopping = false;
  private restarts: number[] = [];

  constructor(@Inject(APP_CONFIG) private readonly config: OpaProcessConfig) {}

  get baseUrl(): string {
    return this.config.opaUrl ?? `http://127.0.0.1:${this.config.opaPort}`;
  }

  get managed(): boolean {
    return !this.config.opaUrl;
  }

  async onModuleInit(): Promise<void> {
    if (!this.managed) return;
    if (!existsSync(binary)) throw new Error(`OPA binary not found at ${binary}. Run: node scripts/fetch-opa.mjs`);
    this.spawn();
    await this.ready();
  }

  /** Resolves once OPA answers /health. */
  async ready(timeoutMs = 15_000): Promise<void> {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      try {
        if ((await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(1_000) })).ok) return;
      } catch {
        /* starting */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error(`OPA did not become healthy at ${this.baseUrl} within ${timeoutMs} ms`);
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopping = true;
    const child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise((r) => child.once("exit", r));
    child.kill();
    await exited;
  }

  /** Test hook: simulate a crash. */
  killForTest(): void {
    this.child?.kill();
  }

  private spawn() {
    const child = spawn(
      binary,
      ["run", "--server", `--addr=127.0.0.1:${this.config.opaPort}`, "--authentication=token", "--authorization=basic", "--log-level=error", authzPolicy],
      { env: { ...process.env, OPA_TOKEN: this.config.opaToken }, stdio: ["ignore", "ignore", "pipe"] },
    );
    child.stderr?.on("data", (d: Buffer) => this.logger.warn(d.toString().trim()));
    child.once("exit", (code) => {
      if (this.stopping) return;
      const now = Date.now();
      this.restarts = this.restarts.filter((t) => now - t < 60_000);
      const delay = restartDelay(this.restarts.length);
      if (delay >= 60_000) this.logger.error(`OPA keeps exiting (code ${code}); retrying once a minute`);
      else this.logger.warn(`OPA exited (code ${code}); restarting in ${delay} ms`);
      this.restarts.push(now);
      setTimeout(() => !this.stopping && this.spawn(), delay);
    });
    this.child = child;
  }
}
