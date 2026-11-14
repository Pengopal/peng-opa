import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/CopyButton";
import { PageHeader } from "@/components/PageHeader";
import { api } from "@/lib/api";
import { buildSamples, LANGUAGE_LABELS, type SampleLanguage } from "@/lib/code-samples";
import type { PolicySummary, Sample } from "@/lib/types";
import { can, useWorkspace } from "@/lib/workspace";
import { ApiKeysCard } from "./ApiKeysCard";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3">
      <span className="flex size-6 items-center justify-center rounded-full border text-xs font-medium text-muted-foreground" data-numeric>
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-2 pt-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {children}
      </div>
    </li>
  );
}

/** The shape every decision comes back in; values are placeholders. */
const responseExample = (policyKey: string) =>
  JSON.stringify({ allowed: true, reason: "…", outcomes: {}, rule: "…", policy: { key: policyKey, version: 1 }, decisionId: "…" }, null, 2);

/** Everything a developer needs: the endpoint, a key, and a working call to copy. */
export function Connect() {
  const { current } = useWorkspace();
  const policies = useQuery({ queryKey: ["policies"], queryFn: () => api<PolicySummary[]>("/api/policies") });
  const live = policies.data?.filter((p) => p.status === "LIVE") ?? [];
  const [chosen, setChosen] = useState<string>();
  const [tab, setTab] = useState<string>("curl");
  const policy = live.find((p) => p.id === chosen) ?? live[0];
  const samples = useQuery({
    queryKey: ["samples", policy?.id],
    enabled: !!policy,
    queryFn: () => api<Sample[]>(`/api/policies/${policy!.id}/samples`),
  });
  const input = samples.data?.[0]?.input ?? {};
  const baseUrl = window.location.origin;
  const key = policy?.key ?? "your-policy-key";
  const code = buildSamples({ baseUrl, policyKey: key, input });
  const languages = Object.keys(code) as SampleLanguage[];
  const shown = tab === "response" ? responseExample(key) : code[tab as SampleLanguage];
  const endpoint = `${baseUrl}/v1/decide/${policy?.key ?? "<policy-key>"}`;

  return (
    <div className="flex flex-col">
      <PageHeader title="Connect" description="Call your policies from any system with one HTTPS request." />

      <section aria-labelledby="decide-title" className="grid gap-8 pb-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <h2 id="decide-title" className="text-sm font-medium">
              Make a decision
            </h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Send the input, get back <code className="font-mono">allowed</code>, a <code className="font-mono">reason</code> and any results.
            </p>
          </div>
          <ol className="flex flex-col gap-6">
            <Step n={1} title="Pick a policy">
              {live.length > 0 ? (
                <Select value={policy?.id} onValueChange={setChosen}>
                  <SelectTrigger aria-label="Policy" className="w-full max-w-xs">
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
              ) : (
                <p className="text-[13px] text-muted-foreground">Publish a policy to call it. The samples use a placeholder key until then.</p>
              )}
            </Step>
            <Step n={2} title="Copy the endpoint">
              <div className="flex items-center gap-2 rounded-md border py-1 pr-1 pl-3">
                <code className="min-w-0 flex-1 truncate font-mono text-xs">
                  <span className="text-muted-foreground">POST</span> {endpoint}
                </code>
                <CopyButton text={endpoint} />
              </div>
            </Step>
            <Step n={3} title="Run the sample">
              <p className="text-[13px] text-muted-foreground">
                Replace <code className="font-mono">YOUR_API_KEY</code> with a key from below and run it. The input is this policy's first saved sample.
              </p>
            </Step>
          </ol>
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border bg-code text-code-foreground">
          <Tabs value={tab} onValueChange={setTab} className="gap-0">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3">
              <TabsList variant="line" aria-label="Code sample" className="min-w-0 flex-1 border-b-0 max-sm:[mask-image:linear-gradient(to_right,#000_82%,transparent)] [&_[data-slot=tabs-trigger]]:text-code-foreground/60 [&_[data-slot=tabs-trigger][data-active]]:text-code-foreground [&_[data-slot=tabs-trigger]]:after:bg-code-foreground">
                {languages.map((l) => (
                  <TabsTrigger key={l} value={l}>
                    {l === "javascript" ? (
                      <>
                        <span className="sm:hidden">JS</span>
                        <span className="max-sm:hidden">{LANGUAGE_LABELS[l]}</span>
                      </>
                    ) : (
                      LANGUAGE_LABELS[l]
                    )}
                  </TabsTrigger>
                ))}
                <span aria-hidden className="mx-1 h-4 w-px self-center bg-white/15" />
                <TabsTrigger value="response">Response</TabsTrigger>
              </TabsList>
              <CopyButton text={shown} variant="ghost" className="shrink-0 text-code-foreground/80 hover:bg-white/10 hover:text-code-foreground" />
            </div>
            {[...languages, "response"].map((l) => (
              <TabsContent key={l} value={l} className="w-full min-w-0">
                <pre className="max-h-[420px] overflow-auto p-4 font-mono text-xs leading-relaxed">{l === "response" ? responseExample(key) : code[l as SampleLanguage]}</pre>
              </TabsContent>
            ))}
          </Tabs>
          <ul className="flex flex-col gap-1 border-t border-white/10 px-4 py-3 text-xs text-code-foreground/70">
            <li>
              Errors come back as <code className="font-mono">{'{ "error": { "code", "message" } }'}</code>.
            </li>
            <li>
              <code className="font-mono">404 policy_not_found</code> — no policy with that key.
            </li>
            <li>
              <code className="font-mono">409 policy_not_live</code> — the policy has no published version.
            </li>
          </ul>
        </div>
      </section>

      <div className="border-t pt-6">{can(current?.role, "OWNER") ? <ApiKeysCard /> : <p className="py-8 text-sm text-muted-foreground">Ask a workspace owner for an API key.</p>}</div>
    </div>
  );
}
