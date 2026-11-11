import { PrismaService } from "../src/prisma/prisma.service.js";
import { MissingWorkspaceContextError, runWithWorkspace } from "../src/prisma/request-context.js";
import { newShortId } from "../src/prisma/short-id.js";
import { startTestStack, TestStack } from "./support/stack.js";

describe("workspace-scoped Prisma client", () => {
  let stack: TestStack;
  let prisma: PrismaService;
  let a: string;
  let b: string;

  beforeAll(async () => {
    stack = await startTestStack();
    prisma = new PrismaService({ databaseUrl: stack.databaseUrl } as never);
    const mk = (name: string) =>
      prisma.unscoped.workspace.create({ data: { name, slug: `${name}-${newShortId()}`, shortId: newShortId() } });
    a = (await mk("a")).id;
    b = (await mk("b")).id;
    for (const ws of [a, b]) {
      await prisma.unscoped.apiKey.create({ data: { workspaceId: ws, name: `key-${ws}`, prefix: "pk_live_x", hash: `h-${ws}` } });
    }
  });
  afterAll(async () => {
    await prisma?.$disconnect();
    await stack?.stop();
  });

  it("scoped_find_only_returns_own_workspace", async () => {
    const keys = await runWithWorkspace(a, () => prisma.scoped.apiKey.findMany());
    expect(keys.map((k) => k.workspaceId)).toEqual([a]);
    // Unique lookups are scoped too: B's key is invisible from A.
    const other = await runWithWorkspace(a, () => prisma.scoped.apiKey.findUnique({ where: { hash: `h-${b}` } }));
    expect(other).toBeNull();
  });

  it("scoped_create_sets_workspaceId", async () => {
    // Even if a caller passes another workspace's id, the context wins.
    const key = await runWithWorkspace(a, () =>
      prisma.scoped.apiKey.create({ data: { workspaceId: b, name: "new", prefix: "pk_live_y", hash: "h-new" } }),
    );
    expect(key.workspaceId).toBe(a);
  });

  it("scoped_update_cannot_touch_other_workspace", async () => {
    const res = await runWithWorkspace(a, () =>
      prisma.scoped.apiKey.updateMany({ where: { hash: `h-${b}` }, data: { name: "hijacked" } }),
    );
    expect(res.count).toBe(0);
    await expect(
      runWithWorkspace(a, () => prisma.scoped.apiKey.update({ where: { hash: `h-${b}` }, data: { name: "hijacked" } })),
    ).rejects.toThrow();
    expect((await prisma.unscoped.apiKey.findUnique({ where: { hash: `h-${b}` } }))?.name).toBe(`key-${b}`);
  });

  it("throws_without_context", async () => {
    await expect(prisma.scoped.apiKey.findMany()).rejects.toBeInstanceOf(MissingWorkspaceContextError);
  });
});
