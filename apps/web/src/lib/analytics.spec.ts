import { cleanEvent, cleanUrl } from "./analytics";

describe("analytics URL cleaning", () => {
  it("keeps campaign tags and drops every other query value, hash and invite token", () => {
    expect(cleanUrl("https://opa.pengopal.com/home?utm_source=linkedin&code=abc&state=xyz#frag")).toBe(
      "https://opa.pengopal.com/home?utm_source=linkedin",
    );
    expect(cleanUrl("https://opa.pengopal.com/invite/s3cr3t-token")).toBe("https://opa.pengopal.com/invite/[token]");
    expect(cleanUrl("/invite/s3cr3t-token")).toBe("/invite/[token]");
    expect(cleanUrl("$direct")).toBe("$direct");
  });

  it("cleans the URLs in an event's properties and person properties", () => {
    const event = cleanEvent({
      uuid: "1",
      event: "$pageview",
      properties: { $current_url: "https://opa.pengopal.com/invite/t0k?x=1", $pathname: "/invite/t0k" },
      $set_once: { $initial_current_url: "https://opa.pengopal.com/sign-in?redirect=%2Fhome" },
    } as never);
    expect(event?.properties.$current_url).toBe("https://opa.pengopal.com/invite/[token]");
    expect(event?.properties.$pathname).toBe("/invite/[token]");
    expect(event?.properties.product).toBe("pengopal-opa");
    expect(event?.$set_once?.$initial_current_url).toBe("https://opa.pengopal.com/sign-in");
  });
});
