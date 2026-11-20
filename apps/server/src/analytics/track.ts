import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { tap } from "rxjs";
import type { AppRequest } from "../auth/request-types.js";
import { Analytics, EventProps } from "./analytics.service.js";

const TRACK = "analytics:track";

interface TrackSpec {
  event: string;
  props?: (req: AppRequest, result: unknown) => EventProps;
}

/**
 * Sends `event` to PostHog after the route succeeds, as the signed-in user, with the workspace id.
 * `props` adds small labels (a role, a template id): never request bodies, names or emails.
 */
export const Track = (event: string, props?: TrackSpec["props"]) => SetMetadata(TRACK, { event, props } satisfies TrackSpec);

/** The `id` of a route's result, when it has one (e.g. the workspace just created). */
export const resultId = (result: unknown): string | undefined => {
  const id = (result as { id?: unknown } | null)?.id;
  return typeof id === "string" ? id : undefined;
};

@Injectable()
export class TrackInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly analytics: Analytics,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const spec = this.reflector.get<TrackSpec | undefined>(TRACK, context.getHandler());
    if (!spec || context.getType() !== "http") return next.handle();
    const req = context.switchToHttp().getRequest<AppRequest>();
    return next.handle().pipe(
      tap((result) => {
        if (!req.user) return;
        try {
          this.analytics.capture(spec.event, req.user, { workspace_id: req.member?.workspaceId, ...spec.props?.(req, result) });
        } catch {
          /* analytics never fails a request */
        }
      }),
    );
  }
}
