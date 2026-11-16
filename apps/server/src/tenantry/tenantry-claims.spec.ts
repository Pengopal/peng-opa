import { roleFromGroups, workspaceFromClaims } from "./tenantry-claims.js";

describe("Tenantry claims", () => {
  it("maps owners, admins and members to OWNER, EDITOR and VIEWER", () => {
    expect(roleFromGroups(["owners"])).toBe("OWNER");
    expect(roleFromGroups(["admins"])).toBe("EDITOR");
    expect(roleFromGroups(["members"])).toBe("VIEWER");
  });

  it("reads Keycloak's group paths and ignores nested groups", () => {
    expect(roleFromGroups(["/owners"])).toBe("OWNER");
    expect(roleFromGroups(["/team/owners"])).toBeNull();
    expect(workspaceFromClaims({ organization: { pengopal: { groups: ["/admins"] } } })).toEqual({ alias: "pengopal", role: "EDITOR" });
  });

  it("takes the highest role and ignores unknown groups", () => {
    expect(roleFromGroups(["members", "admins"])).toBe("EDITOR");
    expect(roleFromGroups(["auditors", "members"])).toBe("VIEWER");
    expect(roleFromGroups(["auditors"])).toBeNull();
    expect(roleFromGroups([])).toBeNull();
  });

  it("reads the chosen workspace and its role", () => {
    expect(workspaceFromClaims({ organization: { pengopal: { groups: ["owners"] } } })).toEqual({ alias: "pengopal", role: "OWNER" });
  });

  it("names no workspace without the claim, with several, or with no known group", () => {
    expect(workspaceFromClaims({})).toBeNull();
    expect(workspaceFromClaims({ organization: { a: { groups: ["owners"] }, b: { groups: ["owners"] } } })).toBeNull();
    expect(workspaceFromClaims({ organization: { a: { groups: ["auditors"] } } })).toBeNull();
    expect(workspaceFromClaims({ organization: ["a"] })).toBeNull();
  });
});
