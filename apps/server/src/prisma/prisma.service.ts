import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { APP_CONFIG, AppConfig } from "../config/config.js";
import { workspaceScope } from "./workspace-scope.js";

function createClient(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get("schema") ?? undefined;
  url.searchParams.delete("schema");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }, schema ? { schema } : undefined) });
}

/**
 * Database access. Use `scoped` for anything a workspace owns (it requires runWithWorkspace);
 * `unscoped` only for auth, workspace membership lookups, API-key lookup and background sync.
 */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly unscoped: PrismaClient;
  readonly scoped;

  constructor(@Inject(APP_CONFIG) config: Pick<AppConfig, "databaseUrl">) {
    this.unscoped = createClient(config.databaseUrl);
    this.scoped = this.unscoped.$extends(workspaceScope);
  }

  $queryRaw: PrismaClient["$queryRaw"] = (...args) => this.unscoped.$queryRaw(...args);

  async $disconnect() {
    await this.unscoped.$disconnect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

export type ScopedClient = PrismaService["scoped"];
