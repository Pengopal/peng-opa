import { BadRequestException } from "@nestjs/common";
import type { Role } from "../generated/prisma/client.js";

const ROLES: Role[] = ["OWNER", "EDITOR", "VIEWER"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Small request-body readers that throw 400 with a readable message. */
export function readString(body: unknown, key: string, opts: { min?: number; max?: number; optional?: boolean } = {}): string | undefined {
  const v = (body as Record<string, unknown> | undefined)?.[key];
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return undefined;
    throw new BadRequestException(`${key} is required`);
  }
  if (typeof v !== "string") throw new BadRequestException(`${key} must be text`);
  const s = v.trim();
  if (s.length < (opts.min ?? 1) || s.length > (opts.max ?? 500)) {
    throw new BadRequestException(`${key} must be ${opts.min ?? 1}–${opts.max ?? 500} characters`);
  }
  return s;
}

export function readRole(body: unknown, key = "role"): Role {
  const v = (body as Record<string, unknown> | undefined)?.[key];
  if (!ROLES.includes(v as Role)) throw new BadRequestException(`${key} must be one of ${ROLES.join(", ")}`);
  return v as Role;
}

export function readEmail(body: unknown, key = "email"): string {
  const v = readString(body, key, { max: 254 })!;
  if (!EMAIL.test(v)) throw new BadRequestException(`${key} must be an email address`);
  return v;
}
