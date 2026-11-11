import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { validateRuleSet, type RuleSet } from "@peng/shared";
import { api } from "@/lib/api";

export type SaveState = "saved" | "saving" | "unsaved" | "error";
const DEBOUNCE_MS = 1_500;

/**
 * Local copy of the policy draft with autosave: every change is saved 1.5 s after the last one.
 * Issues are computed locally on each change so the editor can show them inline at once.
 * `flush()` saves immediately (used before testing or publishing).
 */
export function useDraft(policyId: string, initial: RuleSet) {
  const qc = useQueryClient();
  const [ruleSet, setLocal] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const latest = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dirty = useRef(false);

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    setSaveState("saving");
    try {
      await api(`/api/policies/${policyId}/draft`, { method: "PUT", body: { ruleSet: latest.current } });
      setSaveState(dirty.current ? "unsaved" : "saved");
      void qc.invalidateQueries({ queryKey: ["policies"] });
    } catch {
      dirty.current = true;
      setSaveState("error");
    }
  }, [policyId, qc]);

  const setRuleSet = useCallback(
    (next: RuleSet | ((prev: RuleSet) => RuleSet)) => {
      const value = typeof next === "function" ? next(latest.current) : next;
      latest.current = value;
      dirty.current = true;
      setLocal(value);
      setSaveState("unsaved");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), DEBOUNCE_MS);
    },
    [save],
  );

  // Leaving the editor saves what is pending.
  useEffect(() => () => void save(), [save]);

  const issues = useMemo(() => validateRuleSet(ruleSet), [ruleSet]);
  return { ruleSet, setRuleSet, saveState, issues, flush: save };
}
