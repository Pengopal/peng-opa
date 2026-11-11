import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, setWorkspaceId } from "./api";
import type { Workspace } from "./types";

const STORAGE_KEY = "peng-opa.workspace";

function readStored(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable: the choice just isn't remembered */
  }
}

interface WorkspaceContextValue {
  current: Workspace | undefined;
  list: Workspace[];
  isLoading: boolean;
  switchTo(id: string): void;
  refresh(): Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/** The signed-in user's workspaces and the one currently chosen (remembered per browser). */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { data: list = [], isLoading, refetch } = useQuery({ queryKey: ["workspaces"], queryFn: () => api<Workspace[]>("/api/workspaces") });
  const [chosen, setChosen] = useState<string | undefined>(readStored);
  const current = list.find((w) => w.id === chosen) ?? list[0];

  // Set synchronously during render so the first queries already carry the header.
  setWorkspaceId(current?.id);
  useEffect(() => {
    if (current) writeStored(current.id);
  }, [current]);

  const switchTo = useCallback(
    (id: string) => {
      setWorkspaceId(id);
      setChosen(id);
      writeStored(id);
      // Everything except the workspace list belongs to the old workspace.
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "workspaces" });
    },
    [qc],
  );

  const value = useMemo(
    () => ({ current, list, isLoading, switchTo, refresh: async () => void (await refetch()) }),
    [current, list, isLoading, switchTo, refetch],
  );
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}

/** Roles in order of power; `can(role, "EDITOR")` = role is EDITOR or OWNER. */
export const can = (role: Workspace["role"] | undefined, needed: Workspace["role"]) =>
  !!role && { VIEWER: 1, EDITOR: 2, OWNER: 3 }[role] >= { VIEWER: 1, EDITOR: 2, OWNER: 3 }[needed];
