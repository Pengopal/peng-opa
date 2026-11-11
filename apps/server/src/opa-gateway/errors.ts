/** OPA could not be reached, timed out (2 s), or rejected our token. Maps to 503 engine_unavailable. */
export class OpaUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "OpaUnavailableError";
  }
}

/** OPA refused a policy module. `messages` are OPA's compile errors. */
export class OpaCompileError extends Error {
  constructor(public readonly messages: string[]) {
    super(`OPA rejected the policy: ${messages.join("; ")}`);
    this.name = "OpaCompileError";
  }
}
