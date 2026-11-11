import { spawn, ChildProcess, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { Client } from "pg";

const repoRoot = join(__dirname, "..", "..", "..", "..");
const serverRoot = join(__dirname, "..", "..");
export const opaBinary = join(repoRoot, "tools", "opa", process.platform === "win32" ? "opa.exe" : "opa");
export const opaAuthzPolicy = join(repoRoot, "ops", "opa", "authz.rego");

export interface TestStack {
  databaseUrl: string;
  opaUrl: string;
  opaToken: string;
  /** Kill the spawned OPA (simulates an outage). */
  killOpa(): Promise<void>;
  /** Start OPA again on the same port. */
  startOpa(): Promise<void>;
  stop(): Promise<void>;
}

export async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address() as { port: number };
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

export async function waitForOpa(url: string, timeoutMs = 15_000): Promise<void> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(`${url}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`OPA did not become healthy at ${url}`);
}

export interface TestOpa {
  url: string;
  token: string;
  /** Kill the OPA process (simulates an outage). */
  kill(): Promise<void>;
  /** Start OPA again on the same port. */
  start(): Promise<void>;
}

/** Spawn the bundled OPA on a free port with token auth, like production. */
export async function startTestOpa(): Promise<TestOpa> {
  if (!existsSync(opaBinary)) throw new Error(`OPA binary missing at ${opaBinary}; run node scripts/fetch-opa.mjs`);
  const token = randomBytes(16).toString("hex");
  const port = await freePort();
  const url = `http://127.0.0.1:${port}`;
  let child: ChildProcess | undefined;
  const start = async () => {
    child = spawn(
      opaBinary,
      ["run", "--server", `--addr=127.0.0.1:${port}`, "--authentication=token", "--authorization=basic", "--log-level=error", opaAuthzPolicy],
      { env: { ...process.env, OPA_TOKEN: token }, stdio: "ignore" },
    );
    await waitForOpa(url);
  };
  const kill = async () => {
    if (!child || child.exitCode !== null) return;
    const exited = new Promise((r) => child!.once("exit", r));
    child.kill();
    await exited;
  };
  await start();
  return { url, token, kill, start };
}

export async function startTestStack(): Promise<TestStack> {
  const baseUrl = process.env.TEST_DATABASE_URL;
  if (!baseUrl) throw new Error("TEST_DATABASE_URL is not set (see .env.example)");

  const schema = `t_${randomBytes(4).toString("hex")}`;
  const admin = new Client({ connectionString: baseUrl });
  await admin.connect();
  await admin.query(`CREATE SCHEMA "${schema}"`);
  await admin.end();
  const url = new URL(baseUrl);
  url.searchParams.set("schema", schema);
  const databaseUrl = url.toString();

  if (existsSync(join(serverRoot, "prisma", "migrations"))) {
    execFileSync(process.execPath, [join(serverRoot, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], {
      cwd: serverRoot,
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
    });
  }

  const opa = await startTestOpa();
  return {
    databaseUrl,
    opaUrl: opa.url,
    opaToken: opa.token,
    killOpa: opa.kill,
    startOpa: opa.start,
    async stop() {
      await opa.kill();
      const c = new Client({ connectionString: baseUrl });
      await c.connect();
      await c.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await c.end();
    },
  };
}
