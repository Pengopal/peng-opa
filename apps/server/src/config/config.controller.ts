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
      demoPublic: this.config.demoPublic,
      smtpEnabled: !!this.config.smtpUrl,
    };
  }
}
