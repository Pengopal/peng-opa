import { OpaCompileError, OpaUnavailableError } from "./errors.js";
import type { OpaDecision, OpaGateway } from "./opa-gateway.js";

const TIMEOUT_MS = 2_000;

/** OpaGateway over OPA's REST API with bearer-token auth. */
export class HttpOpaGateway implements OpaGateway {
  constructor(
    private readonly baseUrl: () => string,
    private readonly token: string,
  ) {}

  async upsertPolicy(policyId: string, rego: string): Promise<void> {
    const res = await this.call("PUT", `/v1/policies/${encodePath(policyId)}`, rego, "text/plain");
    if (res.status === 400) {
      const body = (await res.json().catch(() => ({}))) as { message?: string; errors?: { message: string; location?: { row: number } }[] };
      const messages = body.errors?.map((e) => (e.location ? `line ${e.location.row}: ${e.message}` : e.message)) ?? [body.message ?? "invalid policy"];
      throw new OpaCompileError(messages);
    }
    await this.expectOk(res, "upsert policy");
  }

  async deletePolicy(policyId: string): Promise<void> {
    const res = await this.call("DELETE", `/v1/policies/${encodePath(policyId)}`);
    if (res.status === 404) return;
    await this.expectOk(res, "delete policy");
  }

  async listPolicyIds(prefix: string): Promise<string[]> {
    return (await this.listPolicies(prefix)).map((p) => p.id);
  }

  async listPolicies(prefix: string): Promise<{ id: string; raw: string }[]> {
    const res = await this.call("GET", "/v1/policies");
    await this.expectOk(res, "list policies");
    const body = (await res.json()) as { result: { id: string; raw: string }[] };
    return body.result
      .filter((p) => p.id.startsWith(prefix))
      .map(({ id, raw }) => ({ id, raw }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  async evaluate(dataPath: string, input: unknown): Promise<OpaDecision | undefined> {
    const res = await this.call("POST", `/v1/data/${encodePath(dataPath)}`, JSON.stringify({ input }), "application/json");
    await this.expectOk(res, "evaluate");
    return ((await res.json()) as { result?: OpaDecision }).result;
  }

  async health(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl()}/health`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      return res.ok;
    } catch {
      return false;
    }
  }

  private async call(method: string, path: string, body?: string, contentType?: string): Promise<Response> {
    try {
      return await fetch(`${this.baseUrl()}${path}`, {
        method,
        body,
        headers: { Authorization: `Bearer ${this.token}`, ...(contentType ? { "Content-Type": contentType } : {}) },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      throw new OpaUnavailableError(`OPA unreachable (${method} ${path})`, { cause });
    }
  }

  private async expectOk(res: Response, what: string) {
    if (res.ok) return;
    const detail = await res.text().catch(() => "");
    // 401/403 means the token is wrong: the engine is unusable, same as down.
    throw new OpaUnavailableError(`OPA ${what} failed with ${res.status}: ${detail.slice(0, 200)}`);
  }
}

const encodePath = (p: string) => p.split("/").map(encodeURIComponent).join("/");
