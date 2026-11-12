# Known issues

Limits of v1 and findings from the final review that were deliberately left for later. The reasoning behind each is in
the [build log](superpowers/build-log-2026-11-11.md).

## Security

| Issue | Effect | Before going public |
|---|---|---|
| Email addresses are not verified | The secret invite link is what really grants access; someone holding a forwarded link could sign up as the invited address | Set up email (`RESEND_API_KEY`) and turn on email verification |
| No cap on invite emails per workspace | A workspace owner could send many invite emails | Add a per-workspace limit if sign-up is open |
| The bundled OPA inherits the server's environment | OPA can read the app's settings (including `DATABASE_URL`) through its runtime API; it only listens on 127.0.0.1 and requires the token | Start OPA with a reduced environment |

## Behaviour

| Issue | Effect |
|---|---|
| Policy keys may start with `-` or a digit | Rare clashes between generated OPA package names (for example `1abc` and `p-1abc`) |
| A publish landing during a sync pass | The 60-second sync can briefly re-push the previous version; the next pass corrects it |
| Saving while a save is already in flight | `flush()` in the editor doesn't wait for the in-flight save, so a publish immediately after typing may miss the last keystrokes |
| Reopening the Publish dialog | Shows the previous change summary for a moment while it refreshes |
| "Try the live demo" failing | If the public demo can't sign in, the sign-in page shows no error message |

## Not in v1

Billing, Arabic and right-to-left layouts, SSO beyond Google, and a bundle server for OPA (the gateway is built so it
can be added without touching the rest of the app).
