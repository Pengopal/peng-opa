import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorText } from "@/components/ErrorText";
import { api } from "@/lib/api";
import type { DecisionDetail, TryResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { EditorContext } from "../PolicyEditor";
import { buildInput, flattenInput, type FormValues } from "./input";
import { InputForm } from "./InputForm";
import { ResultCard } from "./ResultCard";
import { SamplesMenu } from "./SamplesMenu";

/** Try the draft (or the live version) with an input built from the policy's fields. */
export function TryItPanel({ policy, draft, canEdit, initialInput, setTryResult }: EditorContext & { initialInput?: unknown }) {
  const fields = draft.ruleSet.fields;
  const [values, setValues] = useState<FormValues>(() => (initialInput ? flattenInput(fields, initialInput) : {}));
  const [target, setTarget] = useState<"draft" | "live">("draft");
  const errors = draft.issues.filter((i) => i.severity === "error").length;
  const input = buildInput(fields, values);
  const blocked = target === "draft" && errors > 0;

  // ?replay=<decisionId> (from Activity) loads that decision's input into the form.
  const { replay } = useSearch({ strict: false }) as { replay?: string };
  const replayed = useQuery({ queryKey: ["decision", replay], enabled: !!replay, queryFn: () => api<DecisionDetail>(`/api/decisions/${replay}`) });
  useEffect(() => {
    if (replayed.data) setValues(flattenInput(fields, replayed.data.input));
    // Load once per replayed decision; later edits to the fields must not reset the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayed.data]);

  const run = useMutation({
    mutationFn: async () => {
      if (target === "draft") await draft.flush();
      return api<TryResult>(`/api/policies/${policy.id}/try`, { method: "POST", body: { input, target } });
    },
    onSuccess: (r) => setTryResult?.(r),
  });

  return (
    <section aria-labelledby="try-it-heading" className="rounded-lg border">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-2">
        <h2 id="try-it-heading" className="text-sm font-medium">
          Try it
        </h2>
        <SamplesMenu policyId={policy.id} current={input} canSave={canEdit} onLoad={(i) => setValues(flattenInput(fields, i))} />
      </div>
      <div className="flex flex-col gap-4 p-4">
        <div role="radiogroup" aria-label="Test against" className="inline-flex h-8 w-fit items-center rounded-md border bg-muted/50 p-0.5 text-[13px]">
          {(["draft", "live"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={target === t}
              disabled={t === "live" && !policy.liveVersion}
              onClick={() => setTarget(t)}
              className={cn("h-full rounded-[5px] px-2.5 font-medium transition-colors", target === t ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground", "disabled:opacity-50")}
            >
              {t === "draft" ? "Draft" : policy.liveVersion ? `Live v${policy.liveVersion.number}` : "Live (not published)"}
            </button>
          ))}
        </div>
        {replayed.data && <p className="text-xs text-muted-foreground">Loaded the input of a decision from Activity.</p>}
        <InputForm fields={fields} values={values} onChange={setValues} />
        {blocked && <p className="text-sm text-danger">Fix {errors} issue{errors > 1 ? "s" : ""} before testing the draft.</p>}
        <Button onClick={() => run.mutate()} disabled={blocked || run.isPending}>
          <Play aria-hidden /> {run.isPending ? "Running…" : "Run"}
        </Button>
        <ErrorText error={run.error} />
        {run.data && <ResultCard result={run.data} rules={draft.ruleSet.rules} />}
      </div>
    </section>
  );
}
