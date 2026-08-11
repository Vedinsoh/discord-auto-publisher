# Paddle billing — setup guide

How premium billing works and how to configure it, for sandbox testing and production. Architecture background: [ADR 0004](./adr/0004-paddle-merchant-of-record.md) and the Billing section of [CONTEXT.md](../CONTEXT.md).

## How it flows

```
web (Paddle.js overlay)                    premium backend
  │ POST /api/guild/:id/subscription/checkout {interval}
  ├──────────────────────────────────────────►│ paddle.transactions.create
  │◄── { transactionId } ─────────────────────┤   (custom_data: guildId + discordUserId)
  │ Paddle.Checkout.open({ transactionId })
  │ … customer pays in overlay …
  │                            Paddle ──POST /webhooks/paddle──► backend
  │                                             │ verify Paddle-Signature
  │                                             │ dedupe eventId (Redis DB 6)
  │                                             │ upsert Postgres subscription
  │                                             │ entitled→revoked ⇒ bot leaves guild
```

- Entitled statuses: `active`, `trialing`, `past_due`. Revoked: `canceled`, `paused`.
- "Manage Billing" opens a Paddle Customer Portal session (cancel, payment method, invoices) — created server-side, subscriber-only.
- Daily cron (04:00) re-lists all subscriptions from Paddle and repairs any drift from missed webhooks.

## 1. Sandbox setup (testing)

### Paddle dashboard (sandbox account — sandbox-vendors.paddle.com)

1. **Catalog → Products**: create product `Auto Publisher Premium`.
2. Add two recurring prices to it:
   - Monthly: `4.99 USD`, billing period 1 month → copy the `pri_...` ID
   - Yearly: `49.99 USD`, billing period 1 year → copy the `pri_...` ID
3. **Developer tools → Authentication**: create an API key → `PADDLE_API_KEY` (`pdl_sdbx_apikey_...`).
   Grant it read + write on the entities the backend calls — **transactions** (`transactions.create`
   for the overlay checkout, `transactions.list` to find the payment to refund), **subscriptions**
   (`subscriptions.list` for the reconcile cron, `subscriptions.cancel`), **adjustments**
   (`adjustments.create`), and **customer portal sessions** (`customerPortalSessions.create`).
   ⚠️ **Adjustments is the one people miss, and it fails late.** It is only used by the statutory
   withdrawal refund, so a key without it works fine until a consumer withdraws — at which point the
   withdrawal is already recorded, the consumer is owed money, and `withdrawal.refundOutcome` reads
   `failed: not authorized to create|read adjustment`. Recovery is a manual refund in Paddle. This
   happened on the first sandbox run.
4. **Developer tools → Client-side tokens**: create a token → `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (`test_...`).
5. **Developer tools → Notifications**: create a notification destination:
   - Type: webhook, URL: your tunnel URL + `/webhooks/paddle` (see below)
   - Events: `subscription.created`, `subscription.activated`, `subscription.trialing`, `subscription.updated`, `subscription.past_due`, `subscription.paused`, `subscription.resumed`, `subscription.canceled`
   - Copy the secret key → `PADDLE_WEBHOOK_SECRET` (`pdl_ntfset_...`)
6. **Checkout → Checkout settings**: set default payment link to `http://localhost:3100` (sandbox allows localhost).

### Local tunnel for webhooks

Paddle sandbox needs a public HTTPS URL to deliver webhooks. The dev compose exposes the backend on `localhost:3101`:

```bash
# either
ngrok http 3101
# or
cloudflared tunnel --url http://localhost:3101
```

Point the notification destination at `https://<tunnel-host>/webhooks/paddle`. Re-update it whenever the tunnel URL changes (or use a named/reserved tunnel).

### Environment

In `.env.local` (premium instance):

```
APP_EDITION = "premium"
PADDLE_ENVIRONMENT = "sandbox"
PADDLE_API_KEY = "pdl_sdbx_apikey_..."
PADDLE_WEBHOOK_SECRET = "pdl_ntfset_..."
PADDLE_PRICE_MONTHLY = "pri_..."
PADDLE_PRICE_YEARLY = "pri_..."
NEXT_PUBLIC_PADDLE_ENVIRONMENT = "sandbox"
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = "test_..."
```

### Test it

1. `supabase start`, `bun run dev:start`, run the web app.
2. Dashboard → guild → Subscription → toggle interval → **Upgrade to Premium**.
3. Pay in the overlay with Paddle's test card: `4242 4242 4242 4242`, any future expiry, any CVC.
4. Verify:
   - Backend logs `Paddle webhook: subscription.created` / `subscription.activated`.
   - `subscription` row exists in Postgres with `status = 'active'` and correct `guild_id`.
   - Dashboard shows the Active Subscription card after refresh; **Manage Billing** opens the Paddle portal.
5. Cancel from the portal → dashboard shows "Access Until" (scheduled change). To test revocation without waiting for the period end, cancel the subscription immediately from the Paddle dashboard (Subscriptions → cancel → "immediately") — `subscription.canceled` arrives and the premium bot leaves the guild. Paddle's notification **simulator** (Developer tools → Notifications) can also send synthetic events, but simulated payloads carry no real `custom_data`, so prefer real sandbox subscriptions for end-to-end tests.
6. Replay/duplicate deliveries are ignored (Redis `paddle_event:{id}` dedupe) — safe to use the dashboard's "resend" button while testing.

## 2. Production setup

### Paddle dashboard (live account — vendors.paddle.com)

1. Complete Paddle's **website verification** for `auto-publisher.gg` (required before live checkouts; do this first, it can take a few days).
2. Recreate the catalog exactly as in sandbox (product + monthly/yearly prices) — sandbox and live catalogs are separate; new `pri_...` IDs.
3. Create a live API key and a live client-side token (`live_...`). Same permissions as the sandbox key
   in §1 step 3 — **adjustments included**, or withdrawal refunds fail in production.
4. **Checkout settings**: set default payment link to `https://auto-publisher.gg`.
5. Notification destination: `https://<api-host>/webhooks/paddle` with the same event list; copy the live secret.
6. **Customer Portal**: review the portal settings (branding, cancellation surveys) — cancel + payment-method actions are used by the app.

### Webhook ingress

Paddle must reach the premium backend over public HTTPS. The prod compose exposes no ports, so put a TLS-terminating reverse proxy (Caddy/nginx/Cloudflare Tunnel) in front that forwards **only** `POST /webhooks/paddle` to `backend:8080` (e.g. `https://api.auto-publisher.gg/webhooks/paddle`). Signature verification rejects anything unsigned, but there is no reason to expose the rest of the internal API.

### Environment

In `.env.production` (premium instance):

```
PADDLE_ENVIRONMENT = "production"
PADDLE_API_KEY = "pdl_live_apikey_..."
PADDLE_WEBHOOK_SECRET = "pdl_ntfset_..."   # from the live notification destination
PADDLE_PRICE_MONTHLY = "pri_..."           # live price IDs
PADDLE_PRICE_YEARLY = "pri_..."
NEXT_PUBLIC_PADDLE_ENVIRONMENT = "production"
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = "live_..."
```

### Go-live checklist

- [ ] Website verification approved for `auto-publisher.gg`
- [ ] Live product + prices created; IDs in env
- [ ] Webhook destination reachable (Paddle dashboard shows delivery successes)
- [ ] One real end-to-end purchase + refund tested
- [ ] Customer Portal branding reviewed
- [ ] Payout details / tax profile completed in Paddle (business verification)

## Operational notes

- **Self-hosted instances** skip all of this: no Paddle client, no webhook route, no billing crons, no withdrawal flow (`DEPLOYMENT_MODE` unset or `self-host`). The backend is edition-agnostic and always configures Paddle on the public instance — both editions' bots share it (ADR 0006).
- **Missed webhooks**: the daily reconcile cron corrects Postgres from the Paddle API and enforces revocations; nothing needs manual replay.
- **Re-subscribing**: a new Paddle subscription for the same guild replaces the local row (stale events from the old subscription are ignored).
- **Kick/guild delete does not cancel billing** by design — the subscription row has no FK to `guild`; re-inviting the premium bot restores service instantly. Customers cancel via the portal.
- **Refunds** are issued from the Paddle dashboard; the resulting `subscription.canceled` webhook revokes access automatically.
