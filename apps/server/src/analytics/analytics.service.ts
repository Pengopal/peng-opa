import { Inject, Injectable, Logger } from "@nestjs/common";
import { APP_CONFIG, AppConfig } from "../config/config.js";
import { PUBLIC_DEMO_EMAIL } from "../demo/public-demo.js";

export type EventProps = Record<string, string | number | boolean | null | undefined>;

/** Who did it: a signed-in user. Only the id leaves this server; the email is used to spot the shared demo. */
export interface Actor {
  id: string;
  email?: string;
}

/** Everyone using the shared public demo is one anonymous visitor in PostHog, never a person. */
export const PUBLIC_DEMO_DISTINCT_ID = "public-demo";

/** Every event says which product it came from: Pengopal's sites share one PostHog project. */
export const PRODUCT = "pengopal-opa";

/**
 * Product events sent to PostHog from the server, so counts do not depend on ad blockers.
 * No POSTHOG_KEY (local, tests): every call does nothing. Sending never blocks or fails a request.
 * Events carry ids and small labels only: never emails, names, policy contents or request data.
 */
@Injectable()
export class Analytics {
  private readonly log = new Logger(Analytics.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  capture(event: string, actor: Actor, props: EventProps = {}): void {
    const key = this.config.posthogKey;
    if (!key) return;
    const demo = actor.email === PUBLIC_DEMO_EMAIL;
    const body = {
      api_key: key,
      event,
      distinct_id: demo ? PUBLIC_DEMO_DISTINCT_ID : actor.id,
      timestamp: new Date().toISOString(),
      properties: {
        ...props,
        product: PRODUCT,
        $lib: "peng-opa-server",
        ...(demo ? { demo: true, $process_person_profile: false } : {}),
      },
    };
    void this.send(body);
  }

  private async send(body: object): Promise<void> {
    try {
      const res = await fetch(`${this.config.posthogHost}/i/v0/e/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) this.log.warn(`PostHog answered ${res.status}`);
    } catch (e) {
      this.log.warn(`PostHog unreachable: ${(e as Error).message}`);
    }
  }
}
