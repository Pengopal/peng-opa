import { Inject, Injectable, Logger } from "@nestjs/common";
import nodemailer, { Transporter } from "nodemailer";
import { APP_CONFIG, AppConfig } from "../config/config.js";

interface Email {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends invite emails through Resend (RESEND_API_KEY + MAIL_FROM) or, failing that, SMTP_URL.
 * With neither it does nothing and the UI shows the invite link to copy.
 */
@Injectable()
export class Mailer {
  private readonly logger = new Logger(Mailer.name);
  private readonly send?: (email: Email) => Promise<void>;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    if (config.resendApiKey) {
      const { resendApiKey, mailFrom } = config;
      this.send = async ({ to, subject, text }) => {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: mailFrom, to: [to], subject, text }),
        });
        if (!res.ok) throw new Error(`Resend answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
      };
    } else if (config.smtpUrl) {
      const transport: Transporter = nodemailer.createTransport(config.smtpUrl);
      this.send = async (email) => void (await transport.sendMail({ from: config.mailFrom, ...email }));
    }
  }

  get enabled(): boolean {
    return !!this.send;
  }

  async sendInvite(to: string, workspaceName: string, inviteUrl: string): Promise<void> {
    if (!this.send) return;
    try {
      await this.send({
        to,
        subject: `You're invited to ${workspaceName} on PengOPA`,
        text: `You've been invited to join ${workspaceName}.\n\nAccept the invite: ${inviteUrl}\n\nThis link expires in 7 days.`,
      });
    } catch (e) {
      // The invite still exists; the owner can copy the link from the UI.
      this.logger.warn(`Could not send invite email to ${to}: ${(e as Error).message}`);
    }
  }
}
