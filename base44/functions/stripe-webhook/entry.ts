import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

function getSecret(name, fallback = '') {
  try {
    return secrets.get(name) || fallback;
  } catch {
    return fallback;
  }
}

function parseSignatureHeader(header = '') {
  const parts = header.split(',').map(x => x.trim()).filter(Boolean);
  const parsed: Record<string, string[]> = {};
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx);
    const value = part.slice(idx + 1);
    parsed[key] = parsed[key] || [];
    parsed[key].push(value);
  }
  return parsed;
}

function timingSafeEqual(a = '', b = '') {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmacSha256Hex(secret, payload) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyStripeSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header.');
  const parsed = parseSignatureHeader(signatureHeader);
  const timestamp = parsed.t?.[0];
  const signatures = parsed.v1 || [];
  if (!timestamp || signatures.length === 0) throw new Error('Invalid Stripe-Signature header.');

  const expected = await hmacSha256Hex(webhookSecret, `${timestamp}.${rawBody}`);
  if (!signatures.some(sig => timingSafeEqual(sig, expected))) {
    throw new Error('Invalid Stripe webhook signature.');
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isFinite(ageSeconds) && ageSeconds > 600) {
    throw new Error('Stripe webhook signature timestamp is too old.');
  }
}

async function stripeGet(secretKey, path) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
  if (!res.ok) throw new Error(body?.error?.message || body?.raw || `Stripe API ${res.status}`);
  return body;
}

function toIso(seconds) {
  if (!seconds) return undefined;
  return new Date(Number(seconds) * 1000).toISOString();
}

function mapStripeStatus(status = '') {
  if (status === 'active') return 'active';
  if (status === 'trialing') return 'trialing';
  if (status === 'past_due') return 'past_due';
  if (status === 'incomplete' || status === 'incomplete_expired') return status === 'incomplete_expired' ? 'expired' : 'incomplete';
  if (status === 'canceled' || status === 'unpaid') return 'canceled';
  return 'incomplete';
}

function getPriceIdFromSubscription(subscription) {
  return subscription?.items?.data?.[0]?.price?.id || '';
}

async function findPlanByCodeOrPrice(base44, planCode, priceId) {
  if (planCode) {
    const byCode = await base44.asServiceRole.entities.SubscriptionPlan.filter({ code: planCode }, '-created_date', 1).catch(() => []);
    if (byCode[0]) return byCode[0];
  }

  const plans = await base44.asServiceRole.entities.SubscriptionPlan.list('display_order', 100).catch(() => []);
  return plans.find(p => p.stripe_monthly_price_id === priceId || p.stripe_annual_price_id === priceId) || null;
}

function billingIntervalFromPlan(plan, priceId, fallback = 'monthly') {
  if (plan?.stripe_annual_price_id && plan.stripe_annual_price_id === priceId) return 'annual';
  if (plan?.stripe_monthly_price_id && plan.stripe_monthly_price_id === priceId) return 'monthly';
  return fallback || 'monthly';
}

async function upsertSubscription(base44, userId, payload) {
  let existing: any[] = [];
  if (payload.stripe_subscription_id) {
    existing = await base44.asServiceRole.entities.UserSubscription.filter({ stripe_subscription_id: payload.stripe_subscription_id }, '-created_date', 1).catch(() => []);
  }
  if (!existing.length && payload.checkout_session_id) {
    existing = await base44.asServiceRole.entities.UserSubscription.filter({ checkout_session_id: payload.checkout_session_id }, '-created_date', 1).catch(() => []);
  }
  if (!existing.length && userId) {
    existing = await base44.asServiceRole.entities.UserSubscription.filter({ user_id: userId }, '-created_date', 1).catch(() => []);
  }

  if (existing.length > 0) return await base44.asServiceRole.entities.UserSubscription.update(existing[0].id, payload);
  return await base44.asServiceRole.entities.UserSubscription.create(payload);
}

async function recordEvent(base44, userId, payload) {
  if (!userId) return null;
  return await base44.asServiceRole.entities.BillingEvent.create({
    user_id: userId,
    provider: 'stripe',
    ...payload
  }).catch(() => null);
}

async function recordNotification(base44, userId, payload) {
  if (!userId) return null;
  return await base44.asServiceRole.entities.Notification.create({
    user_id: userId,
    type: 'billing',
    title: payload.title || 'Subscription update',
    body: payload.body || 'Your subscription was updated.',
    related_type: 'billing',
    action_url: '/billing',
    priority: payload.priority || 'normal',
    channel: 'in_app',
    delivery_status: 'delivered',
    delivered_at: new Date().toISOString(),
    metadata: payload.metadata || {}
  }).catch(() => null);
}

async function applySubscriptionObject(base44, subscription, context = {}) {
  const metadata = subscription.metadata || {};
  const userId = context.user_id || metadata.user_id;
  if (!userId) return null;

  const priceId = getPriceIdFromSubscription(subscription) || context.price_id || '';
  const planCode = context.plan_code || metadata.plan_code || '';
  const plan = await findPlanByCodeOrPrice(base44, planCode, priceId);
  const interval = context.interval || metadata.interval || billingIntervalFromPlan(plan, priceId, 'monthly');

  const payload = {
    user_id: userId,
    account_type: context.account_type || metadata.account_type || plan?.account_type || 'parent',
    plan_code: plan?.code || planCode,
    plan_name: plan?.name || context.plan_name || planCode,
    status: mapStripeStatus(subscription.status),
    billing_interval: interval,
    current_period_start: toIso(subscription.current_period_start),
    current_period_end: toIso(subscription.current_period_end),
    trial_ends_at: toIso(subscription.trial_end),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
    limits_snapshot: plan?.limits || {},
    stripe_customer_id: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    checkout_session_id: context.checkout_session_id,
    next_invoice_at: toIso(subscription.current_period_end),
    notes: 'Updated by Stripe webhook.'
  };

  return await upsertSubscription(base44, userId, payload);
}

export default async function(req: Request) {
  const stripeSecretKey = getSecret('STRIPE_SECRET_KEY');
  const webhookSecret = getSecret('STRIPE_WEBHOOK_SECRET');

  if (!stripeSecretKey || !webhookSecret) {
    return Response.json({ error: 'Stripe webhook is not configured. Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.' }, { status: 500 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  try {
    await verifyStripeSignature(rawBody, signature, webhookSecret);
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Invalid signature.' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  let base44;
  try {
    base44 = createClientFromRequest(req);
  } catch {
    return Response.json({ error: 'Invalid Base44 request.' }, { status: 400 });
  }

  try {
    const obj = event.data?.object || {};

    if (event.type === 'checkout.session.completed') {
      const session = obj;
      const metadata = session.metadata || {};
      const subscriptionId = session.subscription;
      let stripeSubscription = null;
      if (subscriptionId) stripeSubscription = await stripeGet(stripeSecretKey, `/subscriptions/${subscriptionId}`);

      let saved = null;
      if (stripeSubscription) {
        saved = await applySubscriptionObject(base44, stripeSubscription, {
          user_id: metadata.user_id,
          plan_code: metadata.plan_code,
          account_type: metadata.account_type,
          interval: metadata.interval,
          checkout_session_id: session.id
        });
      }

      await recordEvent(base44, metadata.user_id, {
        subscription_id: saved?.id,
        event_type: 'checkout_completed',
        plan_code: metadata.plan_code,
        amount_cents: session.amount_total || undefined,
        currency: (session.currency || 'usd').toUpperCase(),
        provider_event_id: event.id,
        metadata: { checkout_session_id: session.id, stripe_subscription_id: subscriptionId }
      });
      await recordNotification(base44, metadata.user_id, {
        title: 'Checkout complete',
        body: `${saved?.plan_name || metadata.plan_code || 'Your plan'} checkout is complete.`,
        metadata: { checkout_session_id: session.id, stripe_subscription_id: subscriptionId }
      });
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const saved = await applySubscriptionObject(base44, obj);
      await recordEvent(base44, obj.metadata?.user_id, {
        subscription_id: saved?.id,
        event_type: event.type === 'customer.subscription.created' ? 'subscription_created' : 'subscription_updated',
        plan_code: saved?.plan_code || obj.metadata?.plan_code,
        provider_event_id: event.id,
        metadata: { stripe_subscription_id: obj.id, stripe_status: obj.status }
      });
      await recordNotification(base44, saved?.user_id || obj.metadata?.user_id, {
        title: 'Subscription updated',
        body: `${saved?.plan_name || 'Your plan'} is now ${saved?.status || mapStripeStatus(obj.status)}.`,
        metadata: { stripe_subscription_id: obj.id, stripe_status: obj.status }
      });
    }

    if (event.type === 'customer.subscription.deleted') {
      const saved = await applySubscriptionObject(base44, { ...obj, status: 'canceled' });
      await recordEvent(base44, obj.metadata?.user_id, {
        subscription_id: saved?.id,
        event_type: 'subscription_canceled',
        plan_code: saved?.plan_code || obj.metadata?.plan_code,
        provider_event_id: event.id,
        metadata: { stripe_subscription_id: obj.id }
      });
      await recordNotification(base44, saved?.user_id || obj.metadata?.user_id, {
        title: 'Subscription canceled',
        body: `${saved?.plan_name || 'Your plan'} has been canceled.`,
        priority: 'high',
        metadata: { stripe_subscription_id: obj.id }
      });
    }

    if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
      const invoice = obj;
      let stripeSubscription = null;
      if (invoice.subscription) stripeSubscription = await stripeGet(stripeSecretKey, `/subscriptions/${invoice.subscription}`).catch(() => null);
      const saved = stripeSubscription ? await applySubscriptionObject(base44, stripeSubscription) : null;
      const userId = stripeSubscription?.metadata?.user_id || saved?.user_id;
      const paymentSucceeded = event.type === 'invoice.payment_succeeded';
      await recordEvent(base44, userId, {
        subscription_id: saved?.id,
        event_type: paymentSucceeded ? 'payment_succeeded' : 'payment_failed',
        plan_code: saved?.plan_code || stripeSubscription?.metadata?.plan_code,
        amount_cents: invoice.amount_paid || invoice.amount_due || undefined,
        currency: (invoice.currency || 'usd').toUpperCase(),
        provider_event_id: event.id,
        metadata: { invoice_id: invoice.id, stripe_subscription_id: invoice.subscription }
      });
      await recordNotification(base44, userId, {
        title: paymentSucceeded ? 'Payment received' : 'Payment failed',
        body: paymentSucceeded
          ? `${saved?.plan_name || 'Your subscription'} payment was received.`
          : `${saved?.plan_name || 'Your subscription'} payment failed. Update billing to keep premium features active.`,
        priority: paymentSucceeded ? 'normal' : 'high',
        metadata: { invoice_id: invoice.id, stripe_subscription_id: invoice.subscription }
      });
    }

    return Response.json({ received: true, type: event.type });
  } catch (err: any) {
    return Response.json({ error: err?.message || String(err), type: event?.type }, { status: 500 });
  }
}
