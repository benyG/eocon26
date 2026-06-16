# Stripe Webhook & Payment Setup Checklist

> **Architecture reminder:** we use **Stripe Checkout (hosted)**. No card data ever
> touches our server or database — customers enter their card on Stripe's domain.
> We store only the Checkout Session **id** as `paymentRef` to reconcile with the
> Stripe dashboard.

---

## 0 — Tenant arrangement (third-party Stripe owner)

For EOCON 2026 the **Stripe account owner is `examboot.net`**, while the payment
page is **hosted on `eyesopensecurity.com`**. This is the chosen setup ("Option A").

Why this works without any code change:

- Stripe Checkout sessions are created **server-side with examboot.net's API key**.
  The card is collected on `checkout.stripe.com` and the funds settle into
  **examboot.net's** Stripe balance.
- Stripe does **not** require the `success_url` / `cancel_url` redirect domains to
  match the account owner, so redirecting back to `eyesopensecurity.com` is fine.
- examboot.net later settles the collected ticket revenue with EOCON 2026 (manual
  bank transfer / agreement — outside this app).

What examboot.net must provide to eyesopensecurity.com:

1. A **Secret key** from *their* Stripe account — ideally a **Restricted key**
   (Developers → API keys → Create restricted key) limited to:
   - `Checkout Sessions` → **Write**
   - `Payment Intents` → **Read**
2. A **webhook signing secret** for the endpoint configured in *their* dashboard
   (see step 2 below).

> ℹ️ All steps below are performed inside **examboot.net's** Stripe dashboard,
> even though the public payment page lives on eyesopensecurity.com.

---

## 1 — Stripe dashboard (examboot.net): get the API key

1. examboot.net signs in at <https://dashboard.stripe.com/>
2. Go to **Developers → API keys**
3. Create a **Restricted key** (preferred) or copy the **Secret key**
   (`sk_live_...` for production, `sk_test_...` for testing)
4. eyesopensecurity.com adds it to its `.env`:
   ```
   STRIPE_SECRET_KEY="sk_live_examboot_..."
   ```

---

## 2 — Configure the webhook endpoint

1. In the Stripe dashboard go to **Developers → Webhooks → Add endpoint**
2. Set the URL to:
   ```
   https://eyesopensecurity.com/api/payment/stripe/webhook
   ```
3. Under **Events to listen to**, select **exactly one event**:
   ```
   checkout.session.completed
   ```
   (If you later enable Stripe ACH or other async methods, also add
   `checkout.session.async_payment_succeeded`.)
4. Click **Add endpoint**
5. On the endpoint detail page click **Reveal** under "Signing secret"
6. Add the signing secret to your `.env`:
   ```
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

> **Why signing matters:** our webhook route (`/api/payment/stripe/webhook`) checks
> the `Stripe-Signature` header with HMAC-SHA256 before touching any database.
> A request without a valid signature is rejected with HTTP 400.

---

## 3 — Set USD prices on your ticket types

Each ticket type already has a `priceEn` column (USD). Set it in the admin under
**💳 Billets → [ticket] → Prix USD**. Foreign visitors (non-Cameroon) see this
price through Stripe. If `priceEn` is 0, the card button is disabled.

---

## 4 — Environment variables summary

| Variable | Required | Description |
|---|---|---|
| `STRIPE_SECRET_KEY` | ✅ | Stripe secret key **from examboot.net's account** (never expose to browser) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret from **examboot.net's** Stripe dashboard |
| `NEXT_PUBLIC_URL` | ✅ | Base URL used to build Stripe success/cancel URLs (`https://eyesopensecurity.com`) |
| `PAYMENT_ALLOW_CURRENCY_SELECTOR` | QA only | `"true"` exposes a manual XAF/USD toggle in the registration modal |

---

## 5 — Payment flow (end-to-end)

```
Visitor (non-Cameroon)                  Our app                   Stripe
──────────────────────────────────────────────────────────────────────────
1. Opens modal → /api/geo returns USD
2. Selects ticket → clicks "Pay by card"
3.                  POST /api/payment/stripe/create-session
4.                  → createCheckoutSession() (REST API)
5.                  ← { url, sessionId }
6. Redirected to Stripe Checkout (stripe.com/…)
7.   Enters card details on Stripe's hosted page
8.                                           Stripe: checkout.session.completed
9.                  POST /api/payment/stripe/webhook  ←────────────────────
10.                 verifyWebhookSignature() ✓
11.                 finalizeRegistrationPaid(registrationId)
12.                 → registration.status = "paid", ticket email sent
13. Redirected back to /payment/return?...session_id=...
14. /payment/return polls GET /api/payment/stripe/confirm
15.                 retrieveCheckoutSession() → "paid" ✓ (idempotent)
16. ✅ "Payment confirmed!" shown to visitor
```

> The **webhook is the primary path** (step 9–12). The `/payment/return` confirm
> (step 14–15) is a synchronous fallback so the visitor gets immediate feedback
> even if the webhook fires a few seconds later.

---

## 6 — Testing with the Stripe CLI

```bash
# Install: https://stripe.com/docs/stripe-cli
stripe login

# Forward events to your local dev server
stripe listen --forward-to localhost:3000/api/payment/stripe/webhook

# Trigger a test checkout.session.completed
stripe trigger checkout.session.completed
```

Use the card number `4242 4242 4242 4242`, any future expiry, any CVC.

---

## 7 — Verifying in the admin

Go to **💳 Transactions** in the admin panel:

- Stripe transactions show a **blue `💳 Stripe` badge** and the amount in **USD**
- Mobile Money transactions show **yellow/orange `📱 MTN/Orange` badge** in **XAF**
- Each Stripe row has an **↗ Stripe** link that opens the payment directly in the
  Stripe dashboard (using the stored session id)

---

## 8 — Geo-currency logic

| Visitor country | Detected by | Payment method | Currency |
|---|---|---|---|
| Cameroon (CM) | `CF-IPCountry: CM` | Mobile Money (NetTicket) | XAF |
| All others | `CF-IPCountry: *` | Card (Stripe Checkout) | USD |
| Unknown/Tor | no header / XX / T1 | Card (Stripe Checkout) | USD |

**Requirement from Cloudflare:** enable **IP Geolocation** in the Cloudflare
dashboard for your zone (Security → Settings, or Network → "IP Geolocation").
Without it `CF-IPCountry` is absent and the app defaults to USD (safe).

Caddy does not need any changes — it transparently forwards all request headers
from Cloudflare to the Next.js container.
