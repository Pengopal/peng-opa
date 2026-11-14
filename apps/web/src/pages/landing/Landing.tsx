import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ErrorText } from "@/components/ErrorText";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useConfig } from "@/lib/config";
import { openPublicDemo } from "@/lib/demo";
import { cn } from "@/lib/utils";
import { DecisionPreview } from "./DecisionPreview";
import { LandingNav } from "./LandingNav";

const AUDIENCES = [
  { who: "Ops", what: "writes and changes the rules, without code" },
  { who: "Engineers", what: "call one endpoint from any system" },
  { who: "Sales", what: "opens a live demo workspace in a click" },
];

const STEPS: { who: string; title: string; body: string; detail: ReactNode; code?: boolean }[] = [
  {
    who: "Ops",
    title: "Write the rule as a sentence",
    body: "Pick the field, the comparison and the value. Rules are checked in order and the first one that matches decides.",
    detail: "When Order total is at least 200, allow with 15% discount",
  },
  {
    who: "Ops",
    title: "Test it, then publish",
    body: "Run a sample order against the draft and see which rule matched. Publish when it’s right; every publish is a version you can compare and roll back.",
    detail: "Published v2 · 1 rule changed",
  },
  {
    who: "Engineers",
    title: "Call one endpoint",
    body: "Each system sends the facts with its own API key and gets back allowed or denied, the reason, and any results such as a discount.",
    detail: "POST /v1/decide/checkout-discount",
    code: true,
  },
  {
    who: "Sales",
    title: "Show it working",
    body: "The Acme Retail demo has four live policies, two weeks of decisions and live traffic, and resets in one click.",
    detail: "Acme Retail (Demo)",
  },
];

/** The nine templates every new workspace can start from. */
const TEMPLATES = [
  { category: "Commerce", name: "Checkout discount", body: "Give loyal and first-time customers a discount at checkout." },
  { category: "Commerce", name: "Free shipping eligibility", body: "Decide when an order ships for free." },
  { category: "Commerce", name: "Refund approval", body: "Approve small refunds automatically and send the rest to a person." },
  { category: "Access", name: "Admin console access", body: "Only admins and support staff with MFA may open the admin console." },
  { category: "Access", name: "Feature access by plan", body: "Turn features on or off depending on the customer’s plan." },
  { category: "Access", name: "Working-hours access", body: "Allow access during business hours, and any time for on-call staff." },
  { category: "Finance", name: "Loan pre-approval", body: "Pre-approve loan applicants and pick their rate and limit." },
  { category: "Finance", name: "Expense auto-approval", body: "Approve routine expenses without waiting for a manager." },
  { category: "HR", name: "Leave request approval", body: "Approve sick leave and short, well-planned annual leave automatically." },
];

/** How workspaces are kept apart, from the README's isolation table, in plain words. */
const ISOLATION = [
  { attempt: "Someone sends another workspace’s id", result: "Refused. Membership is checked on every request." },
  { attempt: "A system puts a workspace id in its decision request", result: "Ignored. The workspace comes only from the API key." },
  { attempt: "An API key asks for another workspace’s policy", result: "Not found. Keys only see their own workspace." },
  { attempt: "A query in the code forgets its workspace filter", result: "The filter is added below the application code; a query with no workspace fails." },
  { attempt: "Someone tries to reach the policy engine directly", result: "It listens on the server only and rejects calls without the app’s token." },
  { attempt: "One workspace floods the decision API", result: "It is rate-limited on its own; other workspaces are unaffected." },
];

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
        {pending ? "Opening the demo…" : "Open the demo"}
      </Button>
      <ErrorText error={error} />
    </div>
  );
}

function Actions() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <Button asChild size="lg">
        <Link to="/sign-up" search={{ redirect: undefined }}>
          Sign up <ArrowRight aria-hidden />
        </Link>
      </Button>
      <DemoButton />
    </div>
  );
}

/** A section's heading and lead, left-aligned above a 1px rule. */
function Section({ id, title, lead, children }: { id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-16 border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16">
        <div>
          <h2 id={`${id}-heading`} className="text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h2>
          <p className="mt-3 text-[15px] text-pretty text-muted-foreground">{lead}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}

/** Public marketing page at `/`. */
export function Landing() {
  return (
    <div id="top" className="min-h-svh bg-background">
      <LandingNav />

      <main>
        <section aria-labelledby="hero-heading">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-12 pb-16 sm:px-6 sm:pt-20 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16 lg:pb-24">
            <div>
              <h1 id="hero-heading" className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.05]">
                Write the rule once. Every system gets the same answer.
              </h1>
              <p className="mt-5 text-lg text-pretty text-muted-foreground">
                Discounts, refunds, access and approvals, written as plain sentences, tested on the spot, and answered by one API with the reason attached.
              </p>
              <div className="mt-8">
                <Actions />
              </div>
              <dl className="mt-12 border-t text-sm">
                {AUDIENCES.map((a) => (
                  <div key={a.who} className="grid grid-cols-[6.5rem_minmax(0,1fr)] border-b py-3">
                    <dt className="font-medium">{a.who}</dt>
                    <dd className="text-muted-foreground">{a.what}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <DecisionPreview />
          </div>
        </section>

        <Section id="how" title="How it works" lead="The people who own a rule change it themselves. The systems that need it ask for the answer.">
          <ol className="divide-y border-y">
            {STEPS.map((s, i) => (
              <li key={s.title} className="grid gap-x-6 gap-y-1 py-5 sm:grid-cols-[2rem_minmax(0,1fr)_minmax(0,16rem)]">
                <span className="font-mono text-xs text-muted-foreground tabular-nums sm:pt-1">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-medium">
                    {s.title} <span className="ml-1 text-sm font-normal text-muted-foreground">· {s.who}</span>
                  </h3>
                  <p className="mt-1 text-sm text-pretty text-muted-foreground">{s.body}</p>
                </div>
                <p className={cn("mt-2 text-xs leading-relaxed text-muted-foreground sm:mt-1", s.code && "font-mono")}>{s.detail}</p>
              </li>
            ))}
          </ol>
        </Section>

        <Section id="templates" title="Start from a template" lead="Nine ready-made policies with sample inputs to test against. Each one opens as a draft you can change.">
          <ul className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((t) => (
              <li key={t.name} className="bg-background p-4">
                <h3 className="font-medium">
                  {t.name} <span className="ml-1 text-sm font-normal text-muted-foreground">· {t.category}</span>
                </h3>
                <p className="mt-1 text-sm text-pretty text-muted-foreground">{t.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="security" title="Workspaces stay apart" lead="Every request is scoped to one workspace, and the scoping is enforced below the application code.">
          <dl className="divide-y border-y text-sm">
            {ISOLATION.map((row) => (
              <div key={row.attempt} className="grid gap-x-8 gap-y-1 py-3.5 sm:grid-cols-2">
                <dt className="font-medium">{row.attempt}</dt>
                <dd className="text-muted-foreground">{row.result}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <section aria-labelledby="cta-heading" className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 id="cta-heading" className="text-3xl font-semibold tracking-tight text-balance">
                Put your first rule live today.
              </h2>
              <p className="mt-3 text-[15px] text-muted-foreground">Start from a template and make your first decision in a few minutes.</p>
            </div>
            <Actions />
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
