import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { PolicyDetail, TemplateSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { can, useWorkspace } from "@/lib/workspace";

type Category = TemplateSummary["category"];
const CATEGORIES: Category[] = ["Commerce", "Access", "Finance", "HR"];

/** "When … → Allow · …": the decision is the first word after the arrow. */
const allows = (line: string) => line.split(" → ")[1]?.startsWith("Allow") ?? false;

function TemplatePanel({ t, canUse }: { t: TemplateSummary; canUse: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const use = useMutation({
    mutationFn: () => api<PolicyDetail>(`/api/templates/${t.id}/use`, { method: "POST", body: {} }),
    onSuccess: async (p) => {
      await qc.invalidateQueries({ queryKey: ["policies"] });
      void navigate({ to: "/policies/$policyId", params: { policyId: p.id } });
    },
  });
  const shown = t.preview.slice(0, 3);
  return (
    <article aria-labelledby={`tpl-${t.id}`} className="flex flex-col gap-3 rounded-lg border p-4">
      <div>
        <h3 id={`tpl-${t.id}`} className="text-sm font-medium">
          {t.name}
        </h3>
        <p className="mt-0.5 line-clamp-1 text-[13px] text-muted-foreground">{t.description}</p>
      </div>
      <ol className="flex flex-1 flex-col gap-1.5 text-[13px] text-muted-foreground">
        {shown.map((line, i) => (
          <li key={i} className="flex gap-2">
            <span aria-hidden className={cn("mt-[7px] size-1.5 shrink-0 rounded-full", allows(line) ? "bg-success" : "bg-danger")} />
            <span className="line-clamp-2">{line}</span>
          </li>
        ))}
        {t.preview.length > shown.length && <li className="pl-3.5">+{t.preview.length - shown.length} more</li>}
      </ol>
      <ErrorText error={use.error} />
      {canUse && (
        <Button variant="outline" size="sm" className="self-start" disabled={use.isPending} onClick={() => use.mutate()}>
          {use.isPending ? "Creating…" : "Use template"}
        </Button>
      )}
    </article>
  );
}

export function TemplateGallery() {
  const { current } = useWorkspace();
  const { data, isLoading, error } = useQuery({ queryKey: ["templates"], queryFn: () => api<TemplateSummary[]>("/api/templates") });
  const canUse = can(current?.role, "EDITOR");
  const [tab, setTab] = useState<"All" | Category>("All");
  const present = CATEGORIES.filter((category) => data?.some((t) => t.category === category));
  const shown = tab === "All" ? present : present.filter((c) => c === tab);

  return (
    <>
      <PageHeader title="Templates" description="Ready-made policies. Use one, then change any rule to fit your business." />
      <ErrorText error={error} />
      {isLoading && <Skeleton className="h-64 w-full" />}
      {present.length > 1 && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-6">
          <TabsList variant="line" aria-label="Category">
            {(["All", ...present] as const).map((c) => (
              <TabsTrigger key={c} value={c}>
                {c}
                <span className="text-xs font-normal text-muted-foreground" data-numeric>
                  {c === "All" ? data?.length : data?.filter((t) => t.category === c).length}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}
      <div className="flex flex-col gap-8">
        {shown.map((category) => {
          const items = data?.filter((t) => t.category === category) ?? [];
          return (
            <section key={category} aria-label={category}>
              {tab === "All" && <h2 className="mb-3 text-sm font-medium">{category}</h2>}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((t) => (
                  <TemplatePanel key={t.id} t={t} canUse={canUse} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
