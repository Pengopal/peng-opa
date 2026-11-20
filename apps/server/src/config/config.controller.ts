import { Controller, Get, Inject } from "@nestjs/common";
import { APP_CONFIG, AppConfig } from "./config.js";

/** Public switches the web app needs before sign-in. */
@Controller("api/config")
export class ConfigController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Get()
  get() {
    return {
      googleEnabled: !!(this.config.googleClientId && this.config.googleClientSecret),
      tenantryEnabled: !!this.config.tenantry,
      demoPublic: this.config.demoPublic,
      smtpEnabled: !!(this.config.resendApiKey || this.config.smtpUrl),
      /** Public by design (PostHog project keys only write events); null turns browser analytics off. */
      posthogKey: this.config.posthogKey ?? null,
    };
  }
}
