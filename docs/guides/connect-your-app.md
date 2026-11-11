# Connect your app

Your systems ask peng-opa for a decision with one HTTPS call. They never see Rego or OPA.

## 1. Create an API key

In the app, go to **Connect → API keys → Create key**. The key (`pk_live_…`) is shown once; store it as a secret.
Keys belong to one workspace and can only see that workspace's policies. Revoke a key from the same page; it stops
working immediately.

## 2. Ask for a decision

```http
POST /v1/decide/<policy-key>
Authorization: Bearer pk_live_…
Content-Type: application/json

{ "input": { "customer": { "tier": "gold" }, "order": { "total": 620 } } }
```

The policy key is shown under the policy's name in the editor (for example `checkout-discount`). Only **live**
policies answer; drafts and paused policies return `409`.

```json
{
  "allowed": true,
  "reason": "Gold loyalty discount",
  "outcomes": { "discount": 15 },
  "rule": "Gold customers on bigger orders",
  "policy": { "key": "checkout-discount", "version": 3 },
  "decisionId": "dec_…"
}
```

| Field | Meaning |
|---|---|
| `allowed` | The decision |
| `reason` | The matched rule's reason, or the **Otherwise** reason when no rule matched |
| `outcomes` | Extra results the rule sets, such as a discount or an approval limit |
| `rule` | The name of the rule that matched, or `null` when none did |
| `policy.version` | The live version that answered |
| `decisionId` | Look it up under **Activity** to see the full input and replay it in the playground |

**Missing fields are not errors.** A condition on a field you didn't send simply doesn't match. A field with the
wrong type (`"620"` where a number is expected) is rejected with `422`, so mistakes don't silently deny.

## 3. Many decisions at once

`POST /v1/decide/<policy-key>/batch` with `{ "inputs": [ … ] }` (up to 100) returns `{ "results": [ … ] }` in the
same order. An input with a type error gets an error object in its slot; the others are still answered. A batch counts
as one request against the rate limit.

## Errors

Errors always have the shape `{ "error": { "code": "…", "message": "…" } }`.

| Status | Code | When | What to do |
|---|---|---|---|
| 401 | `invalid_api_key` | Missing, unknown or revoked key | Check the key and the `Bearer ` prefix |
| 404 | `policy_not_found` | No policy with that key in the key's workspace | Check the policy key |
| 409 | `policy_not_live` | The policy is a draft or paused | Publish or resume it |
| 413 | `payload_too_large` | Body over 64 KB | Send less input, or split a batch |
| 422 | `invalid_input` | A field has the wrong type, or a batch has more than 100 inputs | Fix the input; don't retry as is |
| 429 | `rate_limited` | Over the workspace's requests per second | Retry after the `Retry-After` header (1 second) |
| 503 | `engine_unavailable` | OPA is down or restarting | Retry with backoff; decide what your system does meanwhile (fail open or closed) |

## Code samples

The **Connect** page has ready-to-copy samples in curl, JavaScript, Python and C#, filled in with your workspace's
policy keys.

```bash
curl -X POST http://localhost:3000/v1/decide/checkout-discount \
  -H "Authorization: Bearer $PENG_OPA_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"customer":{"tier":"gold"},"order":{"total":620}}}'
```
