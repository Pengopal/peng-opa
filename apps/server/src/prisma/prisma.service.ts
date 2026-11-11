import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { APP_CONFIG, AppConfig } from "../config/config.js";

/** Postgres via Prisma's pg driver adapter. `?schema=` in DATABASE_URL selects the schema (used by tests). */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    const url = new URL(config.databaseUrl);
    const schema = url.searchParams.get("schema") ?? undefined;
    url.searchParams.delete("schema");
    super({ adapter: new PrismaPg({ connectionString: url.toString() }, schema ? { schema } : undefined) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
