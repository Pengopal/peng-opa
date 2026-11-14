import { api } from "./api";

/** Signs in to the shared public demo workspace and opens its dashboard. */
export async function openPublicDemo() {
  const res = await api<{ workspaceId: string }>("/api/demo/public-login", { method: "POST", body: {} });
  try {
    localStorage.setItem("peng-opa.workspace", res.workspaceId);
  } catch {
    /* not remembered */
  }
  window.location.assign("/home");
}
