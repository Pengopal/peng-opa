export interface OpaDecision {
  allowed: boolean;
  reason: string;
  outcomes: Record<string, unknown>;
  rule: string | null;
}

/**
 * The only way the app talks to OPA. Every method throws OpaUnavailableError when OPA
 * is unreachable or slower than 2 s. Swapping push for a bundle server only changes the implementation.
 */
export interface OpaGateway {
  /** Create or replace a policy module. Throws OpaCompileError when OPA rejects it. */
  upsertPolicy(policyId: string, rego: string): Promise<void>;
  /** Remove a policy module; removing one that does not exist is not an error. */
  deletePolicy(policyId: string): Promise<void>;
  /** Ids of loaded policy modules starting with `prefix`. */
  listPolicyIds(prefix: string): Promise<string[]>;
  /** Raw module source by id, or undefined when not loaded. */
  getPolicy(policyId: string): Promise<string | undefined>;
  /** Evaluate a decision; undefined when nothing is defined at that path. */
  evaluate(dataPath: string, input: unknown): Promise<OpaDecision | undefined>;
  health(): Promise<boolean>;
}

export const OPA_GATEWAY = Symbol("OPA_GATEWAY");
