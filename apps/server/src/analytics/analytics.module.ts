import { Global, Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Analytics } from "./analytics.service.js";
import { TrackInterceptor } from "./track.js";

/** PostHog product events (analytics.service.ts) and the @Track route decorator. */
@Global()
@Module({ providers: [Analytics, { provide: APP_INTERCEPTOR, useClass: TrackInterceptor }], exports: [Analytics] })
export class AnalyticsModule {}
