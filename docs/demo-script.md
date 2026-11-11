# Demo script

A ten-minute walkthrough for showing peng-opa to someone. It uses the demo workspace, so nothing you change matters:
**Settings → Demo → Reset** puts everything back.

## Before you start

- Sign in and open **Acme Retail (Demo)** from the workspace switcher (or create it from the Welcome screen).
- In **Settings → Demo**, turn on **Simulate traffic** a minute before you begin so the dashboard is moving. It switches
  itself off after ten minutes.

## 1. The problem (1 minute)

Open **Home**. "These are Acme's business rules — discounts, refunds, admin access, loan pre-approval — answering
about 200 decisions a day. Nobody here wrote code to change them."

Point at the decisions chart, the allow rate and the response time (single-digit milliseconds).

## 2. A rule anyone can read (3 minutes)

Open **Policies → Checkout discount**.

- Read the first rule aloud: "When customer tier is gold and order total is at least 200 → allow, 15% discount."
- Change **200** to **150**. Point out **Saved** next to the key: drafts save themselves, and nothing is live yet.
- In **Try it**, choose **Draft**, load the **Gold, $250** sample, change the order total to 160 and **Run**. Show the
  matched rule and the per-rule explanation. Switch to **Live** and run again: today's version still answers the old way.

## 3. Publish and undo (2 minutes)

- **Publish**: show the change summary ("Order total is at least 200 → 150"), add a note, publish.
- Open **Versions**, **Compare** v1 and v2, then **Roll back** to v1. "Undo is one click, and it's recorded."
- Open **Activity → Changes** to show who did what.

## 4. What your systems see (2 minutes)

- Open **Activity**. Filter by **Denied**, open a decision, and show the exact input and matched rule.
  **Replay in playground** loads it straight into the editor's Try it panel.
- Open **Connect**. Show the curl sample: one call, a JSON answer. Mention keys are per workspace and shown once.

## 5. For the engineers (1 minute)

Back in the policy, click **Rego** to show the generated Open Policy Agent code: "Your engineers get a standard,
auditable engine. Your ops team never has to see this."

## Afterwards

**Settings → Demo → Reset** restores the four policies and two weeks of history.
