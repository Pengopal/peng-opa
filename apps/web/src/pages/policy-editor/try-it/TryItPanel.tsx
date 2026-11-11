import { useEffect, useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
export function TryItPanel({ policy, draft, canEdit, initialInput }: EditorContext & { initialInput?: unknown }) {
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
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Try it</h2>
        </CardTitle>
        <CardAction>
          <SamplesMenu policyId={policy.id} current={input} canSave={canEdit} onLoad={(i) => setValues(flattenInput(fields, i))} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div role="radiogroup" aria-label="Test against" className="inline-flex w-fit rounded-lg border p-0.5 text-sm">
          {(["draft", "live"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={target === t}
              disabled={t === "live" && !policy.liveVersion}
              onClick={() => setTarget(t)}
              className={cn("rounded-md px-3 py-1", target === t ? "bg-muted font-medium" : "text-muted-foreground hover:bg-muted/50", "disabled:opacity-50")}
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
        {run.data && <ResultCard result={run.data} />}
      </CardContent>
    </Card>
  );
}
