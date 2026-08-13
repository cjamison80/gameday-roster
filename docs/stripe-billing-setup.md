# GameDay Roster — Stripe Billing Setup

This app now has the code-side Stripe Checkout and webhook flow in place. Live payments require Stripe secrets and Stripe Price IDs to be configured before checkout can succeed.

## 1. Required Base44 function secrets

Add these secrets in Base44 for the GameDay Roster app functions:

```txt
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=https://gameday-roster-hub.base44.app
```

For test mode, use Stripe test keys and test price IDs:

```txt
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_BASE_URL=https://gameday-roster-hub.base44.app
```

## 2. Stripe Products and Prices

Create Stripe Products/Prices for the paid plans below. Copy each Stripe Price ID into the matching `SubscriptionPlan` record.

| Plan Code | Product Name | Monthly Price | Annual Price | Fields to update |
| --- | --- | ---: | ---: | --- |
| `player_plus` | Player Plus | $5.99/mo | $59/yr | `stripe_monthly_price_id`, `stripe_annual_price_id` |
| `family` | Family Plan | $9.99/mo | $99/yr | `stripe_monthly_price_id`, `stripe_annual_price_id` |
| `coach_pro` | Coach Pro | $24.99/mo | $249/yr | `stripe_monthly_price_id`, `stripe_annual_price_id` |
| `org_starter` | Organization Starter | $79/mo | $799/yr | `stripe_monthly_price_id`, `stripe_annual_price_id` |
| `org_pro` | Organization Pro | $149/mo | $1,499/yr | `stripe_monthly_price_id`, `stripe_annual_price_id` |

Free plans do not need Stripe Price IDs.

## 3. Webhook endpoint

Add a Stripe webhook endpoint that points to the Base44 backend function:

```txt
https://gameday-roster-hub.base44.app/api/apps/6a7241ea32bb526f5d76609a/functions/stripe-webhook
```

If Base44 shows a different deployed function URL in its function settings, use the Base44-provided URL instead.

Subscribe the endpoint to these events:

```txt
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

After creating the endpoint, copy Stripe's signing secret into:

```txt
STRIPE_WEBHOOK_SECRET
```

## 4. Checkout flow

The Billing screen calls:

```txt
base44.functions.invoke('create-stripe-checkout', ...)
```

That function:

1. Confirms the user is authenticated.
2. Finds the selected `SubscriptionPlan`.
3. Uses the selected plan's Stripe Price ID.
4. Creates/reuses a Stripe Customer.
5. Creates a Stripe Checkout Session in subscription mode.
6. Records a `UserSubscription` with status `incomplete`.
7. Redirects the user to Stripe Checkout.

Paid limits do not unlock while status is `incomplete`.

## 5. Webhook activation flow

The Stripe webhook function:

1. Verifies Stripe's signature using `STRIPE_WEBHOOK_SECRET`.
2. Reads the event metadata from Stripe.
3. Updates the user's `UserSubscription`.
4. Sets status to `active`, `trialing`, `past_due`, `canceled`, `incomplete`, or `expired`.
5. Creates a `BillingEvent` audit record.

The app only treats paid plans as entitled when the subscription status is:

```txt
active
trialing
```

## 6. Current plan gates wired in the app

Current hard gates:

```txt
Free Parent: 1 player profile
Free Parent: 3 applications per month
Free Coach: 1 roster post per month
```

Paid plans unlock only after Stripe webhook activation.

## 7. Test checklist

1. Add test Stripe secret key to Base44 secrets.
2. Create Stripe test products/prices.
3. Paste test Price IDs into `SubscriptionPlan` records.
4. Add webhook endpoint and test signing secret.
5. Open Billing in the app.
6. Choose a paid plan.
7. Confirm Stripe Checkout opens.
8. Complete payment with Stripe test card.
9. Return to `/billing?checkout=success`.
10. Confirm webhook sets `UserSubscription.status` to `active`.
11. Confirm paid limits unlock.

## 8. Files added/updated

```txt
base44/functions/create-stripe-checkout/entry.ts
base44/functions/stripe-webhook/entry.ts
src/lib/stripeBilling.js
src/pages/Billing.jsx
docs/stripe-billing-setup.md
```
