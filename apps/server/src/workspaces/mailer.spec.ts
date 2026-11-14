import { afterEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config/config.js";
import { Mailer } from "./mailer.js";

const base = { DATABASE_URL: "postgres://x", BETTER_AUTH_SECRET: "s", APP_URL: "https://opa.pengopal.com", OPA_TOKEN: "t" };

describe("Mailer with Resend", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends the invite through the Resend API from MAIL_FROM", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "em_1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const mailer = new Mailer(loadConfig({ ...base, RESEND_API_KEY: "re_test", MAIL_FROM: "peng-opa <no-reply@pengopal.com>" }));

    expect(mailer.enabled).toBe(true);
    await mailer.sendInvite("sam@acme.test", "Acme", "https://opa.pengopal.com/invite/abc");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({
      from: "peng-opa <no-reply@pengopal.com>",
      to: ["sam@acme.test"],
      subject: "You're invited to Acme on PengOPA",
    });
    expect(JSON.parse(init.body).text).toContain("https://opa.pengopal.com/invite/abc");
  });

  it("refuses to start with RESEND_API_KEY but no MAIL_FROM", () => {
    expect(() => loadConfig({ ...base, RESEND_API_KEY: "re_test" })).toThrow("MAIL_FROM");
  });
});
