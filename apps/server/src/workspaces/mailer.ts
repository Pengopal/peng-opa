import { Inject, Injectable, Logger } from "@nestjs/common";
import nodemailer, { Transporter } from "nodemailer";
import { APP_CONFIG, AppConfig } from "../config/config.js";

/** Sends invite emails through SMTP_URL. Without SMTP_URL it does nothing and the UI shows the link to copy. */
@Injectable()
export class Mailer {
  private readonly logger = new Logger(Mailer.name);
  private readonly transport?: Transporter;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (config.smtpUrl) this.transport = nodemailer.createTransport(config.smtpUrl);
  }

  get enabled(): boolean {
    return !!this.transport;
  }

  async sendInvite(to: string, workspaceName: string, inviteUrl: string): Promise<void> {
    if (!this.transport) return;
    try {
      await this.transport.sendMail({
        to,
        subject: `You're invited to ${workspaceName} on peng-opa`,
        text: `You've been invited to join ${workspaceName}.\n\nAccept the invite: ${inviteUrl}\n\nThis link expires in 7 days.`,
      });
    } catch (e) {
      // The invite still exists; the owner can copy the link from the UI.
      this.logger.warn(`Could not send invite email to ${to}: ${(e as Error).message}`);
    }
  }
}
