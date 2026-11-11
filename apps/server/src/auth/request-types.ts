import type { Request } from "express";
import type { Role } from "../generated/prisma/client.js";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export interface CurrentMember {
  workspaceId: string;
  workspaceShortId: string;
  userId: string;
  role: Role;
}

export interface AppRequest extends Request {
  user?: SessionUser;
  member?: CurrentMember;
}

export const ROLE_RANK: Record<Role, number> = { VIEWER: 1, EDITOR: 2, OWNER: 3 };
