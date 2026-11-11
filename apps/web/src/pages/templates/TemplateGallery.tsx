import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorText } from "@/components/ErrorText";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import type { PolicyDetail, TemplateSummary } from "@/lib/types";
import { can, useWorkspace } from "@/lib/workspace";

const CATEGORIES: TemplateSummary["category"][] = ["Commerce", "Access", "Finance", "HR"];

function TemplateCard({ t, canUse }: { t: TemplateSummary; canUse: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const use = useMutation({
    mutationFn: () => api<PolicyDetail>(`/api/templates/${t.id}/use`, { method: "POST", body: {} }),
    onSuccess: async (p) => {
      await qc.invalidateQueries({ queryKey: ["policies"] });
      void navigate({ to: "/policies/$policyId", params: { policyId: p.id } });
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h3>{t.name}</h3>
        </CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ol className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          {t.preview.map((line, i) => (
            <li key={i} className="rounded-md bg-muted/60 px-2.5 py-1.5">
              {line}
            </li>
          ))}
        </ol>
        <ErrorText error={use.error} />
      </CardContent>
      {canUse && (
        <CardFooter>
          <Button className="w-full" disabled={use.isPending} onClick={() => use.mutate()}>
            {use.isPending ? "Creating…" : "Use template"}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export function TemplateGallery() {
  const { current } = useWorkspace();
  const { data, isLoading, error } = useQuery({ queryKey: ["templates"], queryFn: () => api<TemplateSummary[]>("/api/templates") });
  const canUse = can(current?.role, "EDITOR");

  return (
    <>
      <PageHeader title="Templates" description="Ready-made policies. Use one, then change any rule to fit your business." />
      <ErrorText error={error} />
      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}
      <div className="flex flex-col gap-8">
        {CATEGORIES.map((category) => {
          const items = data?.filter((t) => t.category === category) ?? [];
          if (!items.length) return null;
          return (
            <section key={category} aria-label={category}>
              <h2 className="mb-3 text-lg font-semibold">{category}</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((t) => (
                  <TemplateCard key={t.id} t={t} canUse={canUse} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
