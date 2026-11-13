import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { buildSamples, LANGUAGE_LABELS, type SampleLanguage } from "@/lib/code-samples";
import type { PolicySummary, Sample } from "@/lib/types";
import { can, useWorkspace } from "@/lib/workspace";
import { ApiKeysCard } from "./ApiKeysCard";

/** Everything a developer needs: the endpoint, a key, and a working call to copy. */
export function Connect() {
  const { current } = useWorkspace();
  const policies = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies") });
  const live = policies.data?.filter((p) => p.status === "LIVE") ?? [];
  const [chosen, setChosen] = useState<string>();
  const policy = live.find((p) => p.id === chosen) ?? live[0];
  const samples = useQuery({
    queryKey: ["samples", policy?.id],
    enabled: !!policy,
    queryFn: () => api<Sample[]>(`/api/policies/${policy!.id}/samples`),
  });
  const input = samples.data?.[0]?.input ?? {};
  const baseUrl = window.location.origin;
  const code = buildSamples({ baseUrl, policyKey: policy?.key ?? "your-policy-key", input });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Connect" description="Call your policies from any system with one HTTPS request." />

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Make a decision</h2>
          </CardTitle>
          <CardDescription>
            <code>POST {baseUrl}/v1/decide/&lt;policy-key&gt;</code> with your API key. You get back <code>allowed</code>, a <code>reason</code> and any results.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2 pl-3">
            <code className="min-w-0 flex-1 truncate font-mono text-xs sm:text-sm">
              POST {baseUrl}/v1/decide/{policy?.key ?? "<policy-key>"}
            </code>
            <CopyButton text={`${baseUrl}/v1/decide/${policy?.key ?? "<policy-key>"}`} />
          </div>
          {live.length > 0 ? (
            <div className="grid max-w-xs gap-1.5">
              <Label htmlFor="connect-policy">Policy</Label>
              <Select value={policy?.id} onValueChange={setChosen}>
                <SelectTrigger id="connect-policy" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {live.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Publish a policy to call it. The samples below use a placeholder key.</p>
          )}
          <Tabs defaultValue="curl" className="w-full">
            <TabsList variant="line">
              {(Object.keys(code) as SampleLanguage[]).map((l) => (
                <TabsTrigger key={l} value={l}>
                  {LANGUAGE_LABELS[l]}
                </TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(code) as SampleLanguage[]).map((l) => (
              <TabsContent key={l} value={l} className="mt-3 w-full min-w-0">
                <div className="relative">
                  <pre className="overflow-x-auto rounded-lg bg-code p-4 pr-24 font-mono text-xs leading-relaxed text-code-foreground">{code[l]}</pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={code[l]} />
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
          <p className="text-xs text-muted-foreground">
            Replace <code>YOUR_API_KEY</code> with a key from below. Errors come back as <code>{"{ \"error\": { \"code\", \"message\" } }"}</code> — for example 404 policy_not_found or 409 policy_not_live.
          </p>
        </CardContent>
      </Card>

      {can(current?.role, "OWNER") ? <ApiKeysCard /> : <p className="text-sm text-muted-foreground">Ask a workspace owner for an API key.</p>}
    </div>
  );
}
