export interface OpaNames {
  /** Rego package, e.g. "t_ab12cd.checkout_discount". */
  packageName: string;
  /** OPA policy-API id, e.g. "t_ab12cd/checkout-discount". */
  policyId: string;
  /** OPA data-API path of the decision, e.g. "t_ab12cd/checkout_discount/decision". */
  dataPath: string;
}

const snake = (key: string) => key.replace(/-/g, "_");

/** Names for a workspace's live policy. Keys are already validated as ^[a-z0-9-]{3,60}$. */
export function opaNames(workspaceShortId: string, policyKey: string): OpaNames {
  const pkg = `t_${workspaceShortId}.${pkgSegment(snake(policyKey))}`;
  return {
    packageName: pkg,
    policyId: `t_${workspaceShortId}/${policyKey}`,
    dataPath: pkg.replace(/\./g, "/") + "/decision",
  };
}

/** Names for the throwaway draft copy used by the Try-it panel. */
export function draftNames(workspaceShortId: string, policyShortId: string): OpaNames {
  const pkg = `t_${workspaceShortId}._draft_${policyShortId}`;
  return { packageName: pkg, policyId: `t_${workspaceShortId}/_draft_${policyShortId}`, dataPath: pkg.replace(/\./g, "/") + "/decision" };
}

/** Package segments must start with a letter or underscore; keys may start with a digit. */
function pkgSegment(s: string) {
  return /^[a-z_]/.test(s) ? s : `p_${s}`;
}

/** Prefix shared by every OPA policy id of a workspace (used by sync and workspace deletion). */
export const workspacePolicyPrefix = (workspaceShortId: string) => `t_${workspaceShortId}/`;
