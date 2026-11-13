import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenCheck,
  FlaskConical,
  History,
  LayoutTemplate,
  ListChecks,
  MousePointerClick,
  PlugZap,
  ScrollText,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { ErrorText } from "@/components/ErrorText";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/lib/config";
import { openPublicDemo } from "@/lib/demo";
import { DecisionPreview } from "./DecisionPreview";
import { LandingNav } from "./LandingNav";

const STEPS = [
  { icon: LayoutTemplate, title: "Pick a template", body: "Start from discounts, approvals or access rules, or a blank policy. Every rule reads like a sentence." },
  { icon: FlaskConical, title: "Test with sample data", body: "Try any order or customer before going live and see exactly which rule decided." },
  { icon: PlugZap, title: "Connect with one call", body: "Your app sends the facts to one endpoint and gets allow or deny, with a reason, in milliseconds." },
];

const FEATURES = [
  { icon: MousePointerClick, title: "No-code rule editor", body: "Fields, conditions and outcomes in plain language. Drag rules to change which one wins." },
  { icon: FlaskConical, title: "Test before you publish", body: "Run the draft or the live version side by side with saved samples." },
  { icon: History, title: "Versions and rollback", body: "Every publish is a version. Compare any two and roll back in one click." },
  { icon: ScrollText, title: "Activity log", body: "Every decision with its input, matched rule and timing. Replay any of them." },
  { icon: Users, title: "Teams and workspaces", body: "Invite people as owners, editors or viewers. Keep each business unit separate." },
  { icon: ShieldCheck, title: "Built on Open Policy Agent", body: "Rules compile to Rego and run on OPA, the open standard for policy decisions." },
];

const CURL = `curl -X POST https://your-pengopa/v1/decide/checkout-discount \\
  -H "Authorization: Bearer pk_live_..." \\
  -d '{"input": {"customer": {"tier": "gold"}, "order": {"total": 250}}}'`;

function DemoButton({ size = "lg" }: { size?: "lg" | "default" }) {
  const { data: config } = useConfig();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (!config?.demoPublic) return null;
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size={size}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            await openPublicDemo();
          } catch (e) {
            setError(e);
            setPending(false);
          }
        }}
      >
        {pending ? "Opening demo…" : "Try the live demo"}
      </Button>
      <ErrorText error={error} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{title}</h2>
      {body && <p className="mt-3 text-base text-pretty text-muted-foreground">{body}</p>}
    </div>
  );
}

/** Public marketing page at `/`. */
export function Landing() {
  return (
    <div id="top" className="min-h-svh bg-background">
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_70%_0%,color-mix(in_oklch,var(--primary)_12%,transparent),transparent)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" aria-hidden /> Policy management on Open Policy Agent
              </p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.4rem] lg:leading-[1.05]">
                Business rules, decided in milliseconds
              </h1>
              <p className="mt-5 max-w-xl text-lg text-pretty text-muted-foreground">
                Write discounts, approvals and access rules in plain language. Test them, publish them, and let your apps ask PengOPA what to do.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-start">
                <Button asChild size="lg">
                  <Link to="/sign-up" search={{ redirect: undefined }}>
                    Get started <ArrowRight aria-hidden />
                  </Link>
                </Button>
                <DemoButton />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Free to try. No code needed to write rules.</p>
            </div>
            <DecisionPreview className="mx-auto w-full max-w-md lg:max-w-none" />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 border-t bg-canvas py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="How it works" title="From idea to live rule in three steps" />
            <ol className="mt-12 grid gap-4 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="rounded-xl border bg-card p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading eyebrow="Features" title="Everything a rule needs, nothing it doesn't" body="Made for the people who own the rules, with the controls the people who ship the app expect." />
            <ul className="mt-12 grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="bg-card p-6">
                  <Icon className="size-5 text-primary" aria-hidden />
                  <h3 className="mt-4 text-base font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Audiences */}
        <section id="developers" className="scroll-mt-20 border-t bg-canvas py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:px-6 lg:grid-cols-2">
            <div className="flex flex-col rounded-xl border bg-card p-6 sm:p-8">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ListChecks className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">For operations teams</h2>
              <p className="mt-2 text-sm text-muted-foreground">Change a discount threshold or an approval limit yourself, test it against real examples, and publish when you're sure. No ticket, no deploy.</p>
              <ul className="mt-5 grid gap-2 text-sm">
                {["Rules read like sentences", "See which rule decided, and why", "Undo any change with a rollback"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <BookOpenCheck className="size-4 text-success" aria-hidden /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex min-w-0 flex-col rounded-xl border bg-card p-6 sm:p-8">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Workflow className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight">For developers</h2>
              <p className="mt-2 text-sm text-muted-foreground">One HTTP call per decision, an API key per service, and a versioned answer with the matched rule and outcomes.</p>
              <div className="relative mt-5 min-w-0">
                <pre className="overflow-x-auto rounded-lg bg-code p-4 pr-24 font-mono text-xs leading-relaxed text-code-foreground">{CURL}</pre>
                <div className="absolute top-2 right-2">
                  <CopyButton text={CURL} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-center rounded-2xl bg-code px-6 py-12 text-center text-code-foreground sm:py-16">
              <Logo variant="mark" className="text-code-foreground [&_svg]:size-10" />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">Put your first rule live today</h2>
              <p className="mt-3 max-w-md text-sm text-code-foreground/70">Start from a template and make your first decision in a few minutes.</p>
              <Button asChild size="lg" className="mt-8">
                <Link to="/sign-up" search={{ redirect: undefined }}>
                  Get started <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo variant="mark" />
            <span>PengOPA by Pengopal Technologies</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/sign-in" search={{ redirect: undefined }} className="hover:text-foreground">
              Sign in
            </Link>
            <a href="https://github.com/Pengopal/peng-opa/blob/main/docs/guides/writing-policies.md" className="hover:text-foreground">
              Writing policies
            </a>
            <a href="https://github.com/Pengopal/peng-opa/blob/main/docs/guides/connect-your-app.md" className="hover:text-foreground">
              Connect your app
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
