# Writing policies

A **policy** answers one question for your systems, such as "Does this order get a discount?". It has fields, rules
and a default.

## Fields

Fields are the facts your system sends. Each has a label people read, a path your system sends
(`customer.tier`, `order.total`), and a type. Open **Fields · Results** above the rules to add or rename them.

| Type | Example | Conditions offered |
|---|---|---|
| Text | `customer.tier` | is, is not, is one of, is not one of, contains, starts with, ends with |
| Number | `order.total` | equals, does not equal, is more than, is at least, is less than, is at most, is between |
| Yes/no | `customer.first_order` | is |
| Date | `request.created_at` | is before, is after, is on, is within the last N days, is more than N days ago |
| List | `user.roles` | includes, includes any of, is empty |

## Rules

Rules are checked **top to bottom, and the first one that matches decides**. Drag rules to reorder them; put the most
specific ones first.

Each rule has:

- **When** ALL or ANY of its conditions are true.
- **Then** Allow or Deny, with a reason people will read in the decision log and your system receives as `reason`.
- **Results** (optional): values your system receives in `outcomes`, such as a discount percentage. Define them under
  **Fields · Results**.

If no rule matches, the **Otherwise (no rule matched)** card at the bottom of the list decides. New policies deny
there, with the reason "No rule matched".

## Test before you publish

Use **Try it** on the right of the editor:

1. Choose **Draft** to test your unsaved changes, or **Live** to see what your systems get today.
2. Fill in fields, or load a saved sample from **Samples**. Save useful inputs with **Save as sample** (the bookmark button).
3. **Run** shows the decision, the matched rule, and for each rule why it did or didn't match.

## Publish, versions and rollback

- **Publish** shows what changed since the live version and asks for an optional note. The new version answers
  decisions within a second.
- **Versions** lists every published version with who published it and when. **Compare** shows two versions side
  by side; **Restore as draft** copies an old version into the draft; **Roll back** makes an old version live again.
- **Pause** (under **Settings → Availability**) stops a policy answering (`409 policy_not_live`) without deleting it.
- **Rego** shows the generated Open Policy Agent code, read-only, for engineers who want to see it.

## Starting from a template

**Policies → New policy → From a template** offers nine starting points:

| Category | Templates |
|---|---|
| Commerce | Checkout discount, Free shipping eligibility, Refund approval |
| Access | Admin console access, Feature access by plan, Working-hours access |
| Finance | Loan pre-approval, Expense auto-approval |
| HR | Leave request approval |

A template creates a draft with fields, rules and sample inputs; change anything before publishing.
