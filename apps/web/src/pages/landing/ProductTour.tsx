import { cn } from "@/lib/utils";

/** A real app screen (from the demo workspace) in a light window frame, swapped for its dark capture in dark mode. */
function Shot({ name, alt, eager = false, className }: { name: string; alt: string; eager?: boolean; className?: string }) {
  const img = "block h-auto w-full";
  const loading = eager ? "eager" : "lazy";
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-sidebar p-1.5 shadow-[0_24px_48px_-24px_rgb(10_10_11/0.25)]", className)}>
      <div className="overflow-hidden rounded-lg border bg-background">
        <img src={`/landing/${name}-light.webp`} alt={alt} width={2160} height={1200} loading={loading} decoding="async" className={cn(img, "dark:hidden")} />
        <img src={`/landing/${name}-dark.webp`} alt="" aria-hidden width={2160} height={1200} loading="lazy" decoding="async" className={cn(img, "hidden dark:block")} />
      </div>
    </div>
  );
}

const SCREENS = [
  { name: "home", title: "Home", body: "Today’s decisions, the allow rate and response time, with the last two weeks at a glance.", alt: "PengOPA Home: decisions today, allow rate, live policies, response time, a 14-day chart and the latest decisions" },
  { name: "activity", title: "Activity", body: "Every decision with its input, the rule that matched and where it came from. Filter, open, replay.", alt: "PengOPA Activity: a filterable log of decisions with policy, result, matched rule and source" },
  { name: "connect", title: "Connect", body: "Pick a policy, copy a ready-made request in curl, JavaScript, Python or C#, and create an API key.", alt: "PengOPA Connect: steps to call a policy, a code sample and API keys" },
];

/** Real screens from the app, so visitors see what they would use before they sign up. */
export function ProductTour() {
  return (
    <section id="product" aria-labelledby="product-heading" className="scroll-mt-16 border-t bg-sidebar">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-2xl">
          <h2 id="product-heading" className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            See the whole thing before you sign up
          </h2>
          <p className="mt-3 text-[15px] text-pretty text-muted-foreground">
            These are real screens from the Acme Retail demo workspace. Here the Checkout discount policy has just been tested: rule 1 matched, and the answer explains why.
          </p>
        </div>

        <figure className="mt-10">
          <Shot name="editor" eager alt="The PengOPA policy editor: Checkout discount's rules written as sentences, rule 1 marked Matched, and the Try it panel showing Allowed with a 15% discount" />
          <figcaption className="mt-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Policy editor.</span> Change a value inline, run a sample, and see which rule decided before you publish.
          </figcaption>
        </figure>

        <ul className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
          {SCREENS.map((s) => (
            <li key={s.name}>
              <Shot name={s.name} alt={s.alt} />
              <h3 className="mt-4 font-medium">{s.title}</h3>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
